from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
from auth import decode_token
import models

security = HTTPBearer()


def get_current_student(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> models.OpsStudent:
    token_data = decode_token(credentials.credentials)
    if not token_data or token_data.get("type") != "student":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    student = db.query(models.OpsStudent).filter(
        models.OpsStudent.id == int(token_data["sub"])
    ).first()
    if not student or not student.is_active:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")
    return student


def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> models.OpsAdminUser:
    token_data = decode_token(credentials.credentials)
    if not token_data or token_data.get("type") != "admin":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    admin = db.query(models.OpsAdminUser).filter(
        models.OpsAdminUser.id == int(token_data["sub"])
    ).first()
    if not admin or not admin.is_active:
        raise HTTPException(status_code=401, detail="Acceso no autorizado")
    return admin


def require_coordinador(admin: models.OpsAdminUser = Depends(get_current_admin)) -> models.OpsAdminUser:
    if admin.role != "coordinador":
        raise HTTPException(status_code=403, detail="Solo coordinadores pueden realizar esta acción")
    return admin


def get_current_validator(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> models.OpsValidatorUser:
    token_data = decode_token(credentials.credentials)
    if not token_data or token_data.get("type") != "validator":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    user = db.query(models.OpsValidatorUser).filter(
        models.OpsValidatorUser.id == int(token_data["sub"])
    ).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Acceso no autorizado")
    return user


def get_current_validator_or_student(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    token_data = decode_token(credentials.credentials)
    if not token_data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    
    t_type = token_data.get("type")
    if t_type == "validator":
        user = db.query(models.OpsValidatorUser).filter(models.OpsValidatorUser.id == int(token_data["sub"])).first()
        if user and user.is_active:
            return user
    elif t_type == "student":
        student = db.query(models.OpsStudent).filter(models.OpsStudent.id == int(token_data["sub"])).first()
        if student and student.is_active:
            # Fallback to system validator user
            sys_user = db.query(models.OpsValidatorUser).filter_by(username="system").first()
            if not sys_user:
                sys_user = models.OpsValidatorUser(
                    username="system",
                    password_hash="system_bypass_hash",
                    full_name="Sistema Automático",
                    role="coordinador",
                    is_active=True
                )
                db.add(sys_user)
                db.commit()
                db.refresh(sys_user)
            return sys_user
    elif t_type == "admin":
        admin = db.query(models.OpsAdminUser).filter(models.OpsAdminUser.id == int(token_data["sub"])).first()
        if admin and admin.is_active:
            sys_user = db.query(models.OpsValidatorUser).filter_by(username="system").first()
            if not sys_user:
                sys_user = models.OpsValidatorUser(
                    username="system",
                    password_hash="system_bypass_hash",
                    full_name="Sistema Automático",
                    role="coordinador",
                    is_active=True
                )
                db.add(sys_user)
                db.commit()
                db.refresh(sys_user)
            return sys_user
            
    raise HTTPException(status_code=401, detail="Acceso no autorizado")

