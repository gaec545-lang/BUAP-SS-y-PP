from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, date
from database import get_db, log_action
import models
from dependencies import get_current_student

router = APIRouter(prefix="/api/student", tags=["student"])


def _get_system_config(db: Session) -> dict:
    configs = db.query(models.DimSystemConfig).all()
    return {c.config_key: c.config_value for c in configs}


def _enrollment_blocked(cfg: dict) -> bool:
    if cfg.get("enrollment_enabled", "false").lower() != "true":
        return True
    block_until = cfg.get("block_until_date", "")
    if block_until:
        try:
            block_dt = date.fromisoformat(block_until)
            if date.today() < block_dt:
                return True
        except ValueError:
            pass
    return False


@router.get("/me")
def get_me(
    student: models.OpsStudent = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    career = db.query(models.DimCareer).filter_by(id=student.career_id).first()
    modality = db.query(models.DimModality).filter_by(id=student.modality_id).first()
    return {
        "id": student.id,
        "email": student.email,
        "full_name": student.full_name,
        "first_name": student.first_name,
        "last_name_paterno": student.last_name_paterno,
        "last_name_materno": student.last_name_materno,
        "matricula": student.matricula,
        "career": {"id": career.id, "code": career.code, "name": career.name} if career else None,
        "modality": {"id": modality.id, "code": modality.code, "name": modality.name} if modality else None,
        "created_at": student.created_at.isoformat() if student.created_at else None,
    }


@router.get("/enrollment-status")
def get_enrollment_status(
    student: models.OpsStudent = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    cfg = _get_system_config(db)
    blocked = _enrollment_blocked(cfg)

    current_period = db.query(models.DimPeriod).filter_by(is_current=True).first()
    enrollment = None
    if current_period:
        enrollment = db.query(models.OpsStudentEnrollment).filter_by(
            student_id=student.id, period_id=current_period.id
        ).first()

    if blocked:
        status = "blocked"
    elif not enrollment:
        status = "not_enrolled"
    else:
        status = enrollment.status

    program_data = None
    if enrollment and enrollment.program:
        prog = enrollment.program
        program_data = {
            "id": prog.id,
            "folio": prog.folio,
            "name": prog.name,
            "dependency_name": prog.dependency_name,
            "program_type": prog.program_type,
        }

    return {
        "status": status,
        "enrollment_id": enrollment.id if enrollment else None,
        "program": program_data,
        "config": {
            "enrollment_enabled": cfg.get("enrollment_enabled", "false"),
            "block_message": cfg.get("block_message", ""),
            "block_until_date": cfg.get("block_until_date", ""),
        }
    }


@router.get("/programs/by-folio")
def get_program_by_folio(
    folio: str,
    student: models.OpsStudent = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """Busca un programa por folio exacto. Sin filtro de carrera — la validación
    de compatibilidad ocurre al confirmar inscripción en /select-program."""
    folio = folio.strip()
    prog = db.query(models.DimProgram).filter(
        models.DimProgram.folio == folio,
        models.DimProgram.is_active == True,
    ).first()
    if not prog:
        raise HTTPException(status_code=404, detail="Este folio no se encontró. Verifica el número e intenta de nuevo.")

    avail = db.query(models.OpsProgramAvailability).filter_by(program_id=prog.id).first()
    available_slots = avail.available_slots if avail else prog.max_slots

    if available_slots <= 0:
        raise HTTPException(status_code=409, detail="Este programa ya completó su cupo.")

    career = db.query(models.DimCareer).filter_by(id=prog.career_id).first()
    return {
        "id": prog.id,
        "folio": prog.folio,
        "name": prog.name,
        "dependency_name": prog.dependency_name,
        "sector": prog.sector,
        "program_type": prog.program_type,
        "career_code": career.code if career else None,
        "career_name": career.name if career else None,
        "max_slots": prog.max_slots,
        "used_slots": avail.used_slots if avail else 0,
        "cupos_disponibles": available_slots,
        "cupos": prog.max_slots,
    }


@router.get("/available-programs")
def get_available_programs(
    service_type: str,
    student: models.OpsStudent = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    programs = (
        db.query(models.DimProgram)
        .filter(
            models.DimProgram.career_id == student.career_id,
            models.DimProgram.program_type == service_type,
            models.DimProgram.is_active == True,
        )
        .all()
    )

    result = []
    for prog in programs:
        avail = db.query(models.OpsProgramAvailability).filter_by(program_id=prog.id).first()
        result.append({
            "id": prog.id,
            "folio": prog.folio,
            "name": prog.name,
            "dependency_name": prog.dependency_name,
            "sector": prog.sector,
            "max_slots": prog.max_slots,
            "used_slots": avail.used_slots if avail else 0,
            "available_slots": avail.available_slots if avail else prog.max_slots,
        })
    return result


@router.post("/select-program")
def select_program(
    req: dict,
    student: models.OpsStudent = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    service_type = req.get("service_type", "").strip()
    folio = req.get("folio", "").strip()

    if service_type not in ("servicio_social", "practica_profesional"):
        raise HTTPException(status_code=400, detail="service_type inválido.")
    if not folio:
        raise HTTPException(status_code=400, detail="El folio es obligatorio.")

    prog = db.query(models.DimProgram).filter_by(folio=folio, is_active=True).first()
    if not prog:
        raise HTTPException(status_code=404, detail="Este folio no se encontró. Verifica que sea correcto.")

    if prog.program_type != service_type:
        raise HTTPException(
            status_code=400,
            detail=f"Este programa es de tipo '{prog.program_type}', no '{service_type}'."
        )

    if prog.career_id != student.career_id:
        career = db.query(models.DimCareer).filter_by(id=student.career_id).first()
        raise HTTPException(
            status_code=400,
            detail=f"Este programa no está disponible para tu carrera ({career.name if career else student.career_id})."
        )

    avail = db.query(models.OpsProgramAvailability).filter_by(program_id=prog.id).first()
    if avail and avail.is_full:
        raise HTTPException(status_code=409, detail="Este programa ya no tiene cupo disponible.")

    current_period = db.query(models.DimPeriod).filter_by(is_current=True).first()
    if not current_period:
        raise HTTPException(status_code=400, detail="No hay periodo activo.")

    # Check if already enrolled
    existing = db.query(models.OpsStudentEnrollment).filter_by(
        student_id=student.id, period_id=current_period.id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Ya tienes una inscripción activa para este periodo.")

    # slot_number
    slot_number = (avail.used_slots + 1) if avail else 1

    # Create fact_enrollment
    fact_e = models.FactEnrollment(
        student_id=student.id,
        program_id=prog.id,
        period_id=current_period.id,
        service_type=service_type,
        folio_entered=folio,
        status="pending",
        slot_number=slot_number,
    )
    db.add(fact_e)
    db.flush()

    # Create ops_student_enrollment
    ops_e = models.OpsStudentEnrollment(
        student_id=student.id,
        program_id=prog.id,
        period_id=current_period.id,
        service_type=service_type,
        status="pending_validation",
    )
    db.add(ops_e)

    # Update availability
    if avail:
        avail.used_slots += 1
        avail.available_slots = max(0, avail.max_slots - avail.used_slots)
        avail.is_full = avail.used_slots >= avail.max_slots
    else:
        db.add(models.OpsProgramAvailability(
            program_id=prog.id, max_slots=prog.max_slots,
            used_slots=1, available_slots=max(0, prog.max_slots - 1),
            is_full=(prog.max_slots <= 1),
        ))

    log_action(db, "student", student.id, student.full_name, "create_enrollment",
               "enrollment", fact_e.id,
               details_after={"folio": folio, "service_type": service_type})
    db.commit()

    return {
        "message": f"Tu inscripción al programa '{prog.name}' ha sido enviada. La coordinación validará tus datos y te notificará.",
        "enrollment": {
            "program_id": prog.id,
            "folio": prog.folio,
            "name": prog.name,
            "dependency_name": prog.dependency_name,
            "service_type": service_type,
            "status": "pending_validation",
        }
    }


@router.get("/processes")
def get_processes(
    student: models.OpsStudent = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    processes = db.query(models.DimProcessDefinition).filter_by(is_active=True).order_by(
        models.DimProcessDefinition.display_order
    ).all()

    current_period = db.query(models.DimPeriod).filter_by(is_current=True).first()
    active_enrollment = None
    if current_period:
        active_enrollment = db.query(models.OpsStudentEnrollment).filter_by(
            student_id=student.id, period_id=current_period.id, status="active"
        ).first()

    result = []
    for proc in processes:
        progress = db.query(models.OpsStudentProgress).filter_by(
            student_id=student.id, process_id=proc.id
        ).first()

        total_steps = db.query(models.DimProcessStep).filter_by(
            process_id=proc.id, is_active=True
        ).count()

        available = True
        if not proc.is_primary and not active_enrollment:
            available = False

        result.append({
            "id": proc.id,
            "code": proc.code,
            "name": proc.name,
            "is_primary": proc.is_primary,
            "generates_resource": proc.generates_resource,
            "color_code": proc.color_code,
            "display_order": proc.display_order,
            "available": available,
            "total_steps": total_steps,
            "current_step": progress.current_step if progress else 1,
            "status": progress.status if progress else "not_started",
            "started_at": progress.started_at.isoformat() if progress and progress.started_at else None,
        })
    return result


@router.get("/process/{process_code}/steps")
def get_process_steps(
    process_code: str,
    student: models.OpsStudent = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    proc = db.query(models.DimProcessDefinition).filter_by(code=process_code).first()
    if not proc:
        raise HTTPException(status_code=404, detail="Proceso no encontrado.")

    progress = db.query(models.OpsStudentProgress).filter_by(
        student_id=student.id, process_id=proc.id
    ).first()
    current_step = progress.current_step if progress else 1

    steps = db.query(models.DimProcessStep).filter_by(
        process_id=proc.id, is_active=True
    ).order_by(models.DimProcessStep.step_number).all()

    result = []
    for step in steps:
        if step.step_number < current_step:
            step_status = "completed"
        elif step.step_number == current_step:
            step_status = "current"
        else:
            step_status = "pending"

        # Upload status for this step
        uploads = []
        if step.requires_upload or step.has_generated_document or step.has_student_document:
            upload_statuses = db.query(models.OpsUploadStatus).filter_by(
                student_id=student.id, process_id=proc.id
            ).all()
            for us in upload_statuses:
                doc_type = db.query(models.DimDocumentType).filter_by(id=us.document_type_id).first()
                uploads.append({
                    "document_type_code": doc_type.code if doc_type else None,
                    "document_type_name": doc_type.name if doc_type else None,
                    "status": us.current_status,
                    "attempt": us.current_attempt,
                    "rejection_reason": us.last_rejection_reason,
                })

        # Messages for this step
        messages = db.query(models.FactMessage).filter_by(
            student_id=student.id, process_id=proc.id, step_number=step.step_number
        ).order_by(models.FactMessage.created_at).all()

        result.append({
            "step_number": step.step_number,
            "title": step.title,
            "short_label": step.short_label,
            "description": step.description,
            "actor": step.actor,
            "requires_upload": step.requires_upload,
            "requires_scan": step.requires_scan,
            "has_generated_document": step.has_generated_document,
            "generated_document_type": step.generated_document_type,
            "has_student_document": step.has_student_document,
            "student_document_type": step.student_document_type,
            "action_required": step.action_required,
            "warning_text": step.warning_text,
            "status": step_status,
            "uploads": uploads,
            "messages": [
                {
                    "id": m.id,
                    "sender_type": m.sender_type,
                    "sender_name": m.sender_name,
                    "message": m.message,
                    "created_at": m.created_at.isoformat() if m.created_at else None,
                }
                for m in messages
            ],
        })

    return {
        "process": {"id": proc.id, "code": proc.code, "name": proc.name},
        "current_step": current_step,
        "status": progress.status if progress else "not_started",
        "steps": result,
    }


@router.post("/change-request")
def submit_change_request(
    req: dict,
    student: models.OpsStudent = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    request_type = req.get("request_type", "").strip()
    justification = req.get("justification", "").strip()
    new_program_folio = req.get("new_program_folio", "").strip()

    if request_type not in ("cambio", "baja"):
        raise HTTPException(status_code=400, detail="request_type debe ser 'cambio' o 'baja'.")
    if not justification or len(justification) < 50:
        raise HTTPException(status_code=400, detail="La justificación debe tener al menos 50 caracteres.")

    current_period = db.query(models.DimPeriod).filter_by(is_current=True).first()
    enrollment = None
    if current_period:
        enrollment = db.query(models.OpsStudentEnrollment).filter_by(
            student_id=student.id, period_id=current_period.id, status="active"
        ).first()

    if not enrollment:
        raise HTTPException(status_code=400, detail="No tienes una inscripción activa para solicitar cambio o baja.")

    new_prog_id = None
    if request_type == "cambio":
        if not new_program_folio:
            raise HTTPException(status_code=400, detail="El folio del nuevo programa es obligatorio para cambio.")
        new_prog = db.query(models.DimProgram).filter_by(folio=new_program_folio, is_active=True).first()
        if not new_prog:
            raise HTTPException(status_code=404, detail="El folio del nuevo programa no se encontró.")
        new_prog_id = new_prog.id

    change_req = models.FactChangeRequest(
        student_id=student.id,
        request_type=request_type,
        current_program_id=enrollment.program_id,
        new_program_id=new_prog_id,
        justification=justification,
        status="pending",
    )
    db.add(change_req)
    db.flush()

    # Start process progress for cambio/baja
    proc = db.query(models.DimProcessDefinition).filter_by(code=request_type).first()
    if proc:
        existing_progress = db.query(models.OpsStudentProgress).filter_by(
            student_id=student.id, process_id=proc.id
        ).first()
        if not existing_progress:
            db.add(models.OpsStudentProgress(
                student_id=student.id, process_id=proc.id,
                current_step=1, status="active", started_at=datetime.utcnow(),
            ))

    log_action(db, "student", student.id, student.full_name, f"submit_{request_type}_request",
               "change_request", change_req.id,
               details_after={"type": request_type, "justification": justification[:100]})
    db.commit()

    return {
        "message": f"Tu solicitud ha sido enviada. La coordinación revisará tu caso en los próximos días hábiles.",
        "request_id": change_req.id,
        "status": "pending",
    }


# -------------------------------------------------------------------
# V2 Redesign: Interests Endpoints
# -------------------------------------------------------------------

@router.post("/interests")
def add_interest(
    req: dict,
    student: models.OpsStudent = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    folio = req.get("folio", "").strip()
    if not folio:
        raise HTTPException(status_code=400, detail="El folio es obligatorio.")
    prog = db.query(models.DimProgram).filter_by(folio=folio, is_active=True).first()
    if not prog:
        raise HTTPException(status_code=404, detail="Ese folio no existe.")
    
    # Check if already saved
    existing = db.query(models.OpsStudentInterest).filter_by(
        student_id=student.id, program_id=prog.id
    ).first()
    if existing:
        return {"message": "Ya tienes este folio en tu lista de interesados.", "status": existing.status}
    
    new_interest = models.OpsStudentInterest(
        student_id=student.id,
        program_id=prog.id,
        status="interested"
    )
    db.add(new_interest)
    db.commit()
    return {"message": "Folio guardado."}

@router.get("/interests")
def get_interests(
    student: models.OpsStudent = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    interests = db.query(models.OpsStudentInterest).filter_by(student_id=student.id).all()
    result = []
    for inc in interests:
        prog = db.query(models.DimProgram).filter_by(id=inc.program_id).first()
        avail = db.query(models.OpsProgramAvailability).filter_by(program_id=prog.id).first()
        
        # Count interested
        others_interested = db.query(models.OpsStudentInterest).filter_by(program_id=prog.id).count()
        
        result.append({
            "id": inc.id,
            "program_id": prog.id,
            "folio": prog.folio,
            "name": prog.name,
            "dependency_name": prog.dependency_name,
            "status": inc.status,
            "addressed_to": inc.addressed_to,
            "max_slots": prog.max_slots,
            "used_slots": avail.used_slots if avail else 0,
            "interested_count": others_interested
        })
    return result

@router.patch("/interests/{interest_id}")
def update_interest(
    interest_id: int,
    req: dict,
    student: models.OpsStudent = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    interest = db.query(models.OpsStudentInterest).filter_by(id=interest_id, student_id=student.id).first()
    if not interest:
        raise HTTPException(status_code=404, detail="No encontrado.")
    
    new_status = req.get("status")
    if new_status:
        interest.status = new_status
    
    if "addressed_to" in req:
        interest.addressed_to = req.get("addressed_to")
        
    db.commit()
    return {"message": "Actualizado."}

@router.delete("/interests/{interest_id}")
def delete_interest(
    interest_id: int,
    student: models.OpsStudent = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    interest = db.query(models.OpsStudentInterest).filter_by(id=interest_id, student_id=student.id).first()
    if not interest:
        raise HTTPException(status_code=404, detail="No encontrado.")
    
    db.delete(interest)
    db.commit()
    return {"message": "Borrado."}

