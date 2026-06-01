from typing import List, Dict, Any
import models
import schemas


def compute_step_statuses(
    steps: List[models.ProcessStep],
    current_step: int,
    steps_completed: List[Dict]
) -> List[schemas.ProcessStepSchema]:
    completed_map = {sc["step_number"]: sc.get("completed_date") for sc in (steps_completed or [])}

    result = []
    for step in sorted(steps, key=lambda s: s.step_number):
        if step.step_number < current_step:
            status = "completed"
            completed_date = completed_map.get(step.step_number)
        elif step.step_number == current_step:
            status = "current"
            completed_date = None
        else:
            status = "pending"
            completed_date = None

        result.append(schemas.ProcessStepSchema(
            id=step.id,
            step_number=step.step_number,
            short_label=step.short_label,
            title=step.title,
            description=step.description,
            actor=step.actor,
            requires_scan=step.requires_scan,
            has_document=step.has_document,
            document_name=step.document_name,
            action_text=step.action_text,
            status=status,
            completed_date=completed_date,
        ))
    return result


def get_student_documents(
    steps: List[models.ProcessStep],
    current_step: int,
    generated_map: Dict[str, models.GeneratedDocument]
) -> List[schemas.DocumentSchema]:
    docs = []
    for step in sorted(steps, key=lambda s: s.step_number):
        if not step.has_document or not step.document_name:
            continue

        doc_type = f"step-{step.step_number}"
        generated = generated_map.get(doc_type)

        if step.step_number < current_step:
            status = "generated" if generated else "delivered"
        elif step.step_number == current_step:
            status = "generated" if generated else "ready"
        else:
            status = "pending"

        docs.append(schemas.DocumentSchema(
            id=doc_type,
            name=step.document_name,
            description=step.description,
            step_number=step.step_number,
            step_title=step.title,
            requires_scan=step.requires_scan,
            status=status,
            generated_at=generated.generated_at.isoformat() if generated and generated.generated_at else None,
            folio=generated.folio if generated else None,
            download_url=f"/api/student/documents/{doc_type}/generate" if status in ("ready", "generated") else None,
        ))
    return docs
