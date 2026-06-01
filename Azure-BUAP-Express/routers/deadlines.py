from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from dependencies import get_current_student

router = APIRouter(prefix="/api/deadlines", tags=["deadlines"])


@router.get("/", response_model=list[schemas.DeadlineSchema])
def get_deadlines(
    student: models.OpsStudent = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    all_deadlines = db.query(models.Deadline).all()
    result = []
    for dl in all_deadlines:
        student_ids = dl.student_ids or []
        if not student_ids or student.id in student_ids:
            result.append(dl)
    result.sort(key=lambda d: d.due_date)
    return result
