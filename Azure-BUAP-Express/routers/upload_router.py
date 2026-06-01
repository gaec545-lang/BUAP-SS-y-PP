import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime
from database import get_db, log_action
import models
from dependencies import get_current_student, get_current_admin

router = APIRouter(prefix="/api/uploads", tags=["uploads"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}
MAX_SIZE_MB = 10


# ── Alumno ────────────────────────────────────────────────────

@router.post("/submit")
async def submit_upload(
    file: UploadFile = File(...),
    document_type_code: str = Form(...),
    process_code: str = Form(...),
    step_number: int = Form(...),
    student: models.OpsStudent = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Formato no permitido. Usa PDF, JPG o PNG.")

    content = await file.read()
    if len(content) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"El archivo supera los {MAX_SIZE_MB}MB permitidos.")

    doc_type = db.query(models.DimDocumentType).filter_by(code=document_type_code).first()
    if not doc_type:
        raise HTTPException(status_code=404, detail=f"Tipo de documento '{document_type_code}' no encontrado.")

    proc = db.query(models.DimProcessDefinition).filter_by(code=process_code).first()
    if not proc:
        raise HTTPException(status_code=404, detail=f"Proceso '{process_code}' no encontrado.")

    existing_status = db.query(models.OpsUploadStatus).filter_by(
        student_id=student.id, document_type_id=doc_type.id, process_id=proc.id
    ).first()
    attempt = (existing_status.current_attempt + 1) if existing_status else 1

    safe_name = f"{student.matricula}-{document_type_code}-attempt{attempt}{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)
    with open(file_path, "wb") as f:
        f.write(content)

    upload = models.FactDocumentUpload(
        student_id=student.id,
        document_type_id=doc_type.id,
        process_id=proc.id,
        step_number=step_number,
        file_path=file_path,
        original_filename=file.filename,
        attempt_number=attempt,
    )
    db.add(upload)
    db.flush()

    if existing_status:
        existing_status.current_status = "pending_review"
        existing_status.current_attempt = attempt
        existing_status.last_upload_id = upload.id
        existing_status.last_rejection_reason = None
    else:
        db.add(models.OpsUploadStatus(
            student_id=student.id,
            document_type_id=doc_type.id,
            process_id=proc.id,
            current_status="pending_review",
            current_attempt=attempt,
            last_upload_id=upload.id,
        ))

    log_action(db, "student", student.id, student.full_name, "upload_document",
               "document_upload", upload.id,
               details_after={"document_type": document_type_code, "attempt": attempt})
    db.commit()

    return {
        "upload_id": upload.id,
        "status": "pending_review",
        "attempt": attempt,
        "message": "Documento enviado. La coordinación lo revisará pronto.",
    }


@router.get("/my-uploads")
def get_my_uploads(
    student: models.OpsStudent = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    statuses = db.query(models.OpsUploadStatus).filter_by(student_id=student.id).all()
    result = []
    for s in statuses:
        doc_type = db.query(models.DimDocumentType).filter_by(id=s.document_type_id).first()
        proc = db.query(models.DimProcessDefinition).filter_by(id=s.process_id).first()
        result.append({
            "document_type_code": doc_type.code if doc_type else None,
            "document_type_name": doc_type.name if doc_type else None,
            "process_code": proc.code if proc else None,
            "current_status": s.current_status,
            "current_attempt": s.current_attempt,
            "last_rejection_reason": s.last_rejection_reason,
            "approved_at": s.approved_at.isoformat() if s.approved_at else None,
        })
    return result


@router.get("/my-uploads/{document_type_code}")
def get_upload_history(
    document_type_code: str,
    student: models.OpsStudent = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    doc_type = db.query(models.DimDocumentType).filter_by(code=document_type_code).first()
    if not doc_type:
        raise HTTPException(status_code=404, detail="Tipo de documento no encontrado.")

    uploads = db.query(models.FactDocumentUpload).filter_by(
        student_id=student.id, document_type_id=doc_type.id
    ).order_by(models.FactDocumentUpload.attempt_number).all()

    result = []
    for u in uploads:
        approval = db.query(models.FactApprovalAction).filter_by(
            entity_type="document_upload", entity_id=u.id
        ).first()
        result.append({
            "upload_id": u.id,
            "attempt_number": u.attempt_number,
            "original_filename": u.original_filename,
            "uploaded_at": u.uploaded_at.isoformat() if u.uploaded_at else None,
            "action": approval.action if approval else "pending_review",
            "reason": approval.reason if approval else None,
        })
    return result


# ── Admin ─────────────────────────────────────────────────────

@router.get("/pending")
def get_pending_uploads(
    admin: models.OpsAdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    statuses = db.query(models.OpsUploadStatus).filter_by(current_status="pending_review").all()
    result = []
    for s in statuses:
        if not s.last_upload_id:
            continue
        upload = db.query(models.FactDocumentUpload).filter_by(id=s.last_upload_id).first()
        if not upload:
            continue
        student = db.query(models.OpsStudent).filter_by(id=s.student_id).first()
        doc_type = db.query(models.DimDocumentType).filter_by(id=s.document_type_id).first()
        proc = db.query(models.DimProcessDefinition).filter_by(id=s.process_id).first()
        result.append({
            "upload_id": upload.id,
            "status_id": s.id,
            "student": {
                "id": student.id,
                "full_name": student.full_name,
                "matricula": student.matricula,
            } if student else None,
            "document_type": {"code": doc_type.code, "name": doc_type.name} if doc_type else None,
            "process_code": proc.code if proc else None,
            "step_number": upload.step_number,
            "attempt_number": upload.attempt_number,
            "original_filename": upload.original_filename,
            "uploaded_at": upload.uploaded_at.isoformat() if upload.uploaded_at else None,
        })
    return result


@router.get("/student/{student_id}")
def get_student_uploads_admin(
    student_id: int,
    admin: models.OpsAdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    statuses = db.query(models.OpsUploadStatus).filter_by(student_id=student_id).all()
    result = []
    for s in statuses:
        doc_type = db.query(models.DimDocumentType).filter_by(id=s.document_type_id).first()
        proc = db.query(models.DimProcessDefinition).filter_by(id=s.process_id).first()
        uploads = db.query(models.FactDocumentUpload).filter_by(
            student_id=student_id,
            document_type_id=s.document_type_id,
            process_id=s.process_id,
        ).order_by(models.FactDocumentUpload.attempt_number.desc()).all()

        upload_list = []
        for u in uploads:
            approval = db.query(models.FactApprovalAction).filter_by(
                entity_type="document_upload", entity_id=u.id
            ).first()
            upload_list.append({
                "upload_id": u.id,
                "attempt": u.attempt_number,
                "filename": u.original_filename,
                "uploaded_at": u.uploaded_at.isoformat() if u.uploaded_at else None,
                "action": approval.action if approval else "pending_review",
                "reason": approval.reason if approval else None,
            })

        result.append({
            "document_type": {"code": doc_type.code, "name": doc_type.name} if doc_type else None,
            "process_code": proc.code if proc else None,
            "current_status": s.current_status,
            "current_attempt": s.current_attempt,
            "uploads": upload_list,
        })
    return result


@router.get("/{upload_id}/file")
def get_upload_file(
    upload_id: int,
    admin: models.OpsAdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    upload = db.query(models.FactDocumentUpload).filter_by(id=upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload no encontrado.")
    if not os.path.exists(upload.file_path):
        raise HTTPException(status_code=404, detail="Archivo no encontrado en disco.")

    ext = os.path.splitext(upload.file_path)[1].lower()
    media_types = {".pdf": "application/pdf", ".jpg": "image/jpeg",
                   ".jpeg": "image/jpeg", ".png": "image/png"}
    media_type = media_types.get(ext, "application/octet-stream")
    return FileResponse(
        path=upload.file_path, media_type=media_type,
        filename=upload.original_filename or f"upload-{upload_id}{ext}",
    )


@router.post("/{upload_id}/approve")
def approve_upload(
    upload_id: int,
    admin: models.OpsAdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    upload = db.query(models.FactDocumentUpload).filter_by(id=upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload no encontrado.")

    db.add(models.FactApprovalAction(
        entity_type="document_upload", entity_id=upload_id,
        action="approved", performed_by=admin.username,
    ))

    status = db.query(models.OpsUploadStatus).filter_by(last_upload_id=upload_id).first()
    if not status:
        status = db.query(models.OpsUploadStatus).filter_by(
            student_id=upload.student_id,
            document_type_id=upload.document_type_id,
            process_id=upload.process_id,
        ).first()
    if status:
        status.current_status = "approved"
        status.approved_at = datetime.utcnow()

    # Auto-advance
    progress = db.query(models.OpsStudentProgress).filter_by(
        student_id=upload.student_id, process_id=upload.process_id
    ).first()

    if progress and upload.step_number == progress.current_step:
        step_uploads = db.query(models.FactDocumentUpload).filter_by(
            student_id=upload.student_id,
            process_id=upload.process_id,
            step_number=upload.step_number,
        ).all()
        step_doc_type_ids = {u.document_type_id for u in step_uploads}

        all_approved = True
        for dt_id in step_doc_type_ids:
            s = db.query(models.OpsUploadStatus).filter_by(
                student_id=upload.student_id,
                document_type_id=dt_id,
                process_id=upload.process_id,
            ).first()
            if not s or s.current_status != "approved":
                all_approved = False
                break

        if all_approved:
            next_step = progress.current_step + 1
            progress.current_step = next_step
            progress.updated_at = datetime.utcnow()
            db.add(models.FactStepCompletion(
                student_id=upload.student_id,
                process_id=upload.process_id,
                step_number=upload.step_number,
                completed_by="auto:upload_approved",
            ))
            log_action(db, "admin", admin.id, admin.full_name, "advance_step",
                       "student", upload.student_id,
                       details_after={"from_step": upload.step_number, "to_step": next_step, "auto": True})

    log_action(db, "admin", admin.id, admin.full_name, "approve_upload",
               "document_upload", upload_id)
    db.commit()
    return {"message": "Documento aprobado.", "upload_id": upload_id}


@router.post("/{upload_id}/reject")
def reject_upload(
    upload_id: int,
    req: dict,
    admin: models.OpsAdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    reason = req.get("reason", "").strip()
    if not reason:
        raise HTTPException(status_code=400, detail="El motivo de rechazo es obligatorio.")

    upload = db.query(models.FactDocumentUpload).filter_by(id=upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload no encontrado.")

    db.add(models.FactApprovalAction(
        entity_type="document_upload", entity_id=upload_id,
        action="rejected", performed_by=admin.username, reason=reason,
    ))

    status = db.query(models.OpsUploadStatus).filter_by(last_upload_id=upload_id).first()
    if not status:
        status = db.query(models.OpsUploadStatus).filter_by(
            student_id=upload.student_id,
            document_type_id=upload.document_type_id,
            process_id=upload.process_id,
        ).first()
    if status:
        status.current_status = "rejected"
        status.last_rejection_reason = reason

    log_action(db, "admin", admin.id, admin.full_name, "reject_upload",
               "document_upload", upload_id,
               details_after={"reason": reason})
    db.commit()
    return {"message": "Documento rechazado.", "upload_id": upload_id}
