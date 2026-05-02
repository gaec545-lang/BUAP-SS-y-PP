from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime
from database import get_db, log_action
import models
from auth import verify_password, create_token, hash_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register")
def register_student(req: dict, request: Request, db: Session = Depends(get_db)):
    """
    Registro libre de alumno. Sin aprobación — activo inmediatamente.
    Body: { email_user, first_name, last_name_paterno, last_name_materno,
            matricula, career_code, modality_code }
    """
    email_user = req.get("email_user", "").strip().lower()
    first_name = req.get("first_name", "").strip()
    last_name_paterno = req.get("last_name_paterno", "").strip()
    last_name_materno = req.get("last_name_materno", "").strip()
    matricula = req.get("matricula", "").strip()
    career_code = req.get("career_code", "").strip().upper()
    modality_code = req.get("modality_code", "").strip().lower()
    study_plan = req.get("study_plan", "semestral").strip().lower()

    if not all([email_user, first_name, last_name_paterno, matricula, career_code, modality_code]):
        raise HTTPException(status_code=400, detail="Todos los campos son obligatorios.")

    email_domain = req.get("email_domain", "@alumno.buap.mx").strip().lower()
    if not email_domain.startswith("@"):
        email_domain = f"@{email_domain}"
    
    allowed_domains = ["@alumno.buap.mx", "@alm.buap.mx"]
    if email_domain not in allowed_domains:
        raise HTTPException(status_code=400, detail=f"Dominio '{email_domain}' no permitido.")

    if "@" in email_user:
        # Si ya trae arroba, validamos que sea uno de los permitidos
        if not any(email_user.endswith(d) for d in allowed_domains):
            raise HTTPException(status_code=400, detail="El dominio del correo no es válido.")
        email = email_user
    else:
        email = f"{email_user}{email_domain}"

    if not matricula.isdigit() or len(matricula) != 9:
        raise HTTPException(status_code=400, detail="La matrícula debe ser de 9 dígitos numéricos.")

    if db.query(models.OpsStudent).filter_by(email=email).first():
        raise HTTPException(status_code=409, detail="Este correo ya está registrado.")

    if db.query(models.OpsStudent).filter_by(matricula=matricula).first():
        raise HTTPException(status_code=409, detail="Esta matrícula ya está registrada.")

    career = db.query(models.DimCareer).filter_by(code=career_code, is_active=True).first()
    if not career:
        raise HTTPException(status_code=400, detail=f"Carrera '{career_code}' no válida.")

    modality = db.query(models.DimModality).filter_by(code=modality_code, is_active=True).first()
    if not modality:
        raise HTTPException(status_code=400, detail=f"Modalidad '{modality_code}' no válida.")

    full_name = f"{first_name} {last_name_paterno} {last_name_materno}".strip()
    ip = request.client.host if request.client else None

    # Create fact_registration
    db.add(models.FactRegistration(
        email=email, full_name=full_name, first_name=first_name,
        last_name_paterno=last_name_paterno, last_name_materno=last_name_materno,
        matricula=matricula, career_id=career.id, modality_id=modality.id,
        study_plan=study_plan,
        ip_address=ip,
    ))

    # Create ops_student
    student = models.OpsStudent(
        email=email, full_name=full_name, first_name=first_name,
        last_name_paterno=last_name_paterno, last_name_materno=last_name_materno,
        matricula=matricula, career_id=career.id, modality_id=modality.id,
        study_plan=study_plan,
    )
    db.add(student)
    db.flush()

    log_action(db, "student", student.id, full_name, "register", "student", student.id,
               details_after={"email": email, "matricula": matricula}, ip_address=ip)
    db.commit()
    db.refresh(student)

    token = create_token({"sub": str(student.id), "type": "student", "email": student.email})
    return {
        "token": token,
        "student": {
            "id": student.id,
            "email": student.email,
            "full_name": student.full_name,
            "first_name": student.first_name,
            "matricula": student.matricula,
            "career": {"code": career.code, "name": career.name},
            "modality": {"code": modality.code, "name": modality.name},
        }
    }


@router.post("/student-login")
def student_login(req: dict, request: Request, db: Session = Depends(get_db)):
    email_input = req.get("email", "").strip().lower()
    if not email_input:
        raise HTTPException(status_code=400, detail="El correo es obligatorio.")

    if "@" not in email_input:
        # Por defecto intentamos con el nuevo estándar @alumno.buap.mx si no se especifica
        email_input = f"{email_input}@alumno.buap.mx"

    student = db.query(models.OpsStudent).filter_by(email=email_input).first()
    if not student:
        raise HTTPException(status_code=404, detail="Correo no registrado en el sistema.")
    if not student.is_active:
        raise HTTPException(status_code=403, detail="Tu cuenta está desactivada. Contacta a la coordinación.")

    student.last_login_at = datetime.utcnow()
    ip = request.client.host if request.client else None
    log_action(db, "student", student.id, student.full_name, "login", "student",
               student.id, ip_address=ip)
    db.commit()
    db.refresh(student)

    # Determine enrollment_status
    current_period = db.query(models.DimPeriod).filter_by(is_current=True).first()
    enrollment = None
    if current_period:
        enrollment = db.query(models.OpsStudentEnrollment).filter_by(
            student_id=student.id, period_id=current_period.id
        ).first()

    enrollment_status = "not_enrolled"
    if enrollment:
        enrollment_status = enrollment.status  # pending_validation, active, completed, cancelled

    token = create_token({"sub": str(student.id), "type": "student", "email": student.email})
    career = db.query(models.DimCareer).filter_by(id=student.career_id).first()
    modality = db.query(models.DimModality).filter_by(id=student.modality_id).first()

    return {
        "token": token,
        "enrollment_status": enrollment_status,
        "student": {
            "id": student.id,
            "email": student.email,
            "full_name": student.full_name,
            "first_name": student.first_name,
            "matricula": student.matricula,
            "career": {"id": career.id, "code": career.code, "name": career.name} if career else None,
            "modality": {"id": modality.id, "code": modality.code, "name": modality.name} if modality else None,
        }
    }


@router.post("/admin-login")
def admin_login(req: dict, request: Request, db: Session = Depends(get_db)):
    username = req.get("username", "").strip()
    password = req.get("password", "")
    if not username or not password:
        raise HTTPException(status_code=400, detail="Usuario y contraseña son obligatorios.")

    admin = db.query(models.OpsAdminUser).filter_by(username=username, is_active=True).first()
    if not admin or not verify_password(password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas.")

    ip = request.client.host if request.client else None
    log_action(db, "admin", admin.id, admin.full_name, "login", "admin",
               admin.id, ip_address=ip)
    db.commit()

    token = create_token({
        "sub": str(admin.id), "type": "admin",
        "username": admin.username, "role": admin.role,
    })
    return {
        "token": token,
        "admin": {
            "id": admin.id,
            "username": admin.username,
            "full_name": admin.full_name,
            "role": admin.role,
        }
    }
