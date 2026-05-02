from sqlalchemy.orm import Session
import models
from datetime import datetime


def validate_upload(upload: models.DocumentUpload, student: models.Student, db: Session) -> bool:
    """Verify upload belongs to correct step and student is at that step or past it."""
    if not student.progress:
        return False
    progress = student.progress
    # Allow upload for current or completed steps
    return upload.step_number <= progress.current_step


def get_upload_history(student_id: int, step_number: int, db: Session):
    """Return full upload history for a step."""
    return db.query(models.DocumentUpload).filter(
        models.DocumentUpload.student_id == student_id,
        models.DocumentUpload.step_number == step_number
    ).order_by(models.DocumentUpload.attempt_number).all()


def auto_advance_on_approval(upload: models.DocumentUpload, db: Session):
    """Auto-advance student if step requires upload and it was just approved."""
    student = db.query(models.Student).filter(models.Student.id == upload.student_id).first()
    if not student or not student.progress:
        return False

    progress = student.progress
    if progress.current_step != upload.step_number:
        return False

    process_def = db.query(models.ProcessDefinition).filter(
        models.ProcessDefinition.code == student.process_code
    ).first()
    if not process_def:
        return False

    step_def = db.query(models.ProcessStep).filter(
        models.ProcessStep.process_id == process_def.id,
        models.ProcessStep.step_number == upload.step_number
    ).first()
    if not step_def or not step_def.requires_upload:
        return False

    steps_completed = list(progress.steps_completed or [])
    steps_completed.append({
        "step_number": progress.current_step,
        "completed_date": datetime.utcnow().date().isoformat(),
        "completed_by": "auto:upload_approved"
    })
    progress.steps_completed = steps_completed

    if progress.current_step < process_def.total_steps:
        progress.current_step += 1
        return True

    return False
