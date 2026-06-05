from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db, log_action
import models
from dependencies import get_current_student, get_current_admin

router = APIRouter(prefix="/api/messages", tags=["messages"])


# ── Alumno ────────────────────────────────────────────────────

@router.get("/my-messages")
def get_my_messages(
    student: models.OpsStudent = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    messages = db.query(models.FactMessage).filter_by(
        student_id=student.id
    ).order_by(models.FactMessage.created_at).all()
    return [
        {
            "id": m.id,
            "step_number": m.step_number,
            "process_id": m.process_id,
            "sender_type": m.sender_type,
            "sender_name": m.sender_name,
            "message": m.message,
            "is_read": m.is_read,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in messages
    ]


@router.post("/send")
def student_send_message(
    req: dict,
    student: models.OpsStudent = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    process_code = req.get("process_code", "").strip()
    step_number = req.get("step_number", 0)
    message_text = req.get("message", "").strip()

    if not message_text:
        raise HTTPException(status_code=400, detail="El mensaje no puede estar vacío.")

    proc = db.query(models.DimProcessDefinition).filter_by(code=process_code).first()
    proc_id = proc.id if proc else None

    msg = models.FactMessage(
        student_id=student.id,
        step_number=step_number,
        process_id=proc_id,
        sender_type="student",
        sender_id=student.id,
        sender_name=student.full_name,
        message=message_text,
    )
    db.add(msg)
    db.commit()
    return {"message_id": msg.id, "status": "sent"}


@router.get("/unread-count")
def get_unread_count(
    student: models.OpsStudent = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    count = db.query(models.FactMessage).filter_by(
        student_id=student.id, sender_type="admin", is_read=False
    ).count()
    return {"unread_count": count}


# ── Admin ─────────────────────────────────────────────────────

@router.get("/admin/student/{student_id}")
def get_student_messages(
    student_id: int,
    admin: models.OpsAdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    messages = db.query(models.FactMessage).filter_by(
        student_id=student_id
    ).order_by(models.FactMessage.created_at).all()
    return [
        {
            "id": m.id,
            "step_number": m.step_number,
            "process_id": m.process_id,
            "sender_type": m.sender_type,
            "sender_name": m.sender_name,
            "message": m.message,
            "is_read": m.is_read,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in messages
    ]


@router.post("/admin/send/{student_id}")
def admin_send_message(
    student_id: int,
    req: dict,
    admin: models.OpsAdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    process_code = req.get("process_code", "").strip()
    step_number = req.get("step_number", 0)
    message_text = req.get("message", "").strip()

    if not message_text:
        raise HTTPException(status_code=400, detail="El mensaje no puede estar vacío.")

    student = db.query(models.OpsStudent).filter_by(id=student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Alumno no encontrado.")

    proc = db.query(models.DimProcessDefinition).filter_by(code=process_code).first()
    proc_id = proc.id if proc else None

    msg = models.FactMessage(
        student_id=student_id,
        step_number=step_number,
        process_id=proc_id,
        sender_type="admin",
        sender_id=admin.id,
        sender_name=admin.full_name,
        message=message_text,
    )
    db.add(msg)
    db.commit()
    return {"message_id": msg.id, "status": "sent"}


@router.post("/admin/mark-read/{student_id}")
def mark_messages_read(
    student_id: int,
    admin: models.OpsAdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    db.query(models.FactMessage).filter_by(
        student_id=student_id, sender_type="student", is_read=False
    ).update({"is_read": True})
    db.commit()
    return {"status": "ok"}
