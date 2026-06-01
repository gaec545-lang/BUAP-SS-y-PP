from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
import os
import platform
import json

from database import get_db, log_action
import models
from dependencies import get_current_admin

router = APIRouter(prefix="/api/developer", tags=["developer"])

# ── Security ──────────────────────────────────────────────────

# For simplicity in this environment, we use a developer "token" or special credentials
# In a real app, this would be an ENV variable.
DEVELOPER_CREDENTIALS = {
    "username": "developer",
    "password": "evangelista-dev-2026"
}

@router.post("/login")
def developer_login(req: dict):
    username = req.get("username")
    password = req.get("password")
    
    if username == DEVELOPER_CREDENTIALS["username"] and password == DEVELOPER_CREDENTIALS["password"]:
        return {"success": True, "token": "DEV-ACCESS-SECURE-TOKEN-2026"}
    
    raise HTTPException(status_code=401, detail="Credenciales de desarrollador inválidas.")

# ── Stats & Activity ──────────────────────────────────────────

@router.get("/status")
def get_system_status(db: Session = Depends(get_db)):
    # Check DB connection
    try:
        db.execute("SELECT 1")
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"

    # System Info
    sys_info = {
        "os": platform.system(),
        "release": platform.release(),
        "python_version": platform.python_version(),
        "db_engine": db.bind.name if db.bind else "unknown",
        "timestamp": datetime.utcnow().isoformat()
    }

    # Recent Logs (Errors or warnings if we had a log table, using Audit Log for now)
    recent_errors = db.query(models.FactAuditLog).filter(
        models.FactAuditLog.action.ilike("%error%")
    ).order_by(models.FactAuditLog.timestamp.desc()).limit(10).all()

    return {
        "db_status": db_status,
        "system_info": sys_info,
        "recent_errors": [
            {
                "id": l.id,
                "action": l.action,
                "user": l.user_name,
                "timestamp": l.timestamp.isoformat()
            } for l in recent_errors
        ]
    }

@router.get("/active-sessions")
def get_active_sessions(db: Session = Depends(get_db)):
    # Users active in the last 20 minutes (based on Audit Log)
    limit_time = datetime.utcnow() - timedelta(minutes=20)
    
    recent_actions = db.query(
        models.FactAuditLog.user_name,
        models.FactAuditLog.user_type,
        func.max(models.FactAuditLog.timestamp).label("last_activity")
    ).filter(
        models.FactAuditLog.timestamp >= limit_time
    ).group_by(
        models.FactAuditLog.user_name,
        models.FactAuditLog.user_type
    ).all()

    sessions = []
    for action in recent_actions:
        sessions.append({
            "name": action.user_name,
            "type": action.user_type,
            "last_activity": action.last_activity.isoformat()
        })
    
    return sessions

@router.get("/upload-logs")
def get_upload_logs(db: Session = Depends(get_db)):
    # Logs specifically for Excel and PDF uploads
    uploads = db.query(models.FactAuditLog).filter(
        models.FactAuditLog.action.in_(["upload_programs_excel", "upload_programs_pdf"])
    ).order_by(models.FactAuditLog.timestamp.desc()).limit(20).all()

    return [
        {
            "id": l.id,
            "user": l.user_name,
            "action": l.action,
            "timestamp": l.timestamp.isoformat(),
            "details": json.loads(l.details_after) if l.details_after else {}
        } for l in uploads
    ]

# ── Account Management ────────────────────────────────────────

@router.delete("/users/student/{student_id}")
def delete_student(student_id: int, db: Session = Depends(get_db)):
    student = db.query(models.OpsStudent).filter_by(id=student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Alumno no encontrado.")
    
    # In a real system, we might want to cascade or soft-delete.
    # For a developer panel, we'll do a hard delete of related records if needed.
    # To keep it safe, let's just mark as inactive if possible, or hard delete if the user insists.
    # Given the request "poder eliminar cuentas", I'll perform a clean-up.
    
    # 1. Delete progress
    db.query(models.OpsStudentProgress).filter_by(student_id=student_id).delete()
    # 2. Delete enrollments
    db.query(models.OpsStudentEnrollment).filter_by(student_id=student_id).delete()
    # 3. Delete messages
    db.query(models.FactMessage).filter_by(student_id=student_id).delete()
    # 4. Delete the student
    db.delete(student)
    
    log_action(db, "developer", 0, "Developer", "delete_account", "student", student_id,
               details_before={"name": student.full_name, "matricula": student.matricula})
    
    db.commit()
    return {"success": True, "message": f"Cuenta de {student.full_name} eliminada."}

@router.delete("/users/admin/{admin_id}")
def delete_admin(admin_id: int, db: Session = Depends(get_db)):
    admin = db.query(models.OpsAdminUser).filter_by(id=admin_id).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Administrativo no encontrado.")
    
    if admin.username == "developer":
        raise HTTPException(status_code=403, detail="No puedes eliminar la cuenta de desarrollador.")

    db.delete(admin)
    log_action(db, "developer", 0, "Developer", "delete_account", "admin", admin_id,
               details_before={"username": admin.username})
    
    db.commit()
    return {"success": True, "message": f"Cuenta de {admin.username} eliminada."}
