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
