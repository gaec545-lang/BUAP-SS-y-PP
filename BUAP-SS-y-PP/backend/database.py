from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Optional
import json

DATABASE_URL = "sqlite:///./buap_ss_pp.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def log_action(
    db: Session,
    user_type: str,
    user_id: Optional[int],
    user_name: str,
    action: str,
    entity_type: str,
    entity_id: Optional[int] = None,
    details_before: Optional[dict] = None,
    details_after: Optional[dict] = None,
    ip_address: Optional[str] = None,
):
    from models import FactAuditLog
    entry = FactAuditLog(
        user_type=user_type,
        user_id=user_id,
        user_name=user_name,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details_before=json.dumps(details_before) if details_before else None,
        details_after=json.dumps(details_after) if details_after else None,
        ip_address=ip_address,
    )
    db.add(entry)
    # Note: caller is responsible for db.commit()


def rebuild_ops_from_facts(db: Session):
    """
    Rebuild all OPS tables from FACT tables.
    Used for disaster recovery or integrity checks.
    """
    import models

    # ── ops_student_progress ─────────────────────────────────
    from sqlalchemy import func
    completions = (
        db.query(
            models.FactStepCompletion.student_id,
            models.FactStepCompletion.process_id,
            func.max(models.FactStepCompletion.step_number).label("max_step"),
        )
        .group_by(
            models.FactStepCompletion.student_id,
            models.FactStepCompletion.process_id,
        )
        .all()
    )
    for row in completions:
        prog = (
            db.query(models.OpsStudentProgress)
            .filter_by(student_id=row.student_id, process_id=row.process_id)
            .first()
        )
        if prog:
            prog.current_step = row.max_step + 1
        else:
            db.add(
                models.OpsStudentProgress(
                    student_id=row.student_id,
                    process_id=row.process_id,
                    current_step=row.max_step + 1,
                    status="active",
                )
            )

    # ── ops_program_availability ─────────────────────────────
    from sqlalchemy import func as sqlfunc
    enrollments_count = (
        db.query(
            models.FactEnrollment.program_id,
            sqlfunc.count(models.FactEnrollment.id).label("cnt"),
        )
        .filter(models.FactEnrollment.status.in_(["pending", "approved", "active"]))
        .group_by(models.FactEnrollment.program_id)
        .all()
    )
    for row in enrollments_count:
        program = db.query(models.DimProgram).filter_by(id=row.program_id).first()
        if not program:
            continue
        avail = (
            db.query(models.OpsProgramAvailability)
            .filter_by(program_id=row.program_id)
            .first()
        )
        used = row.cnt
        max_s = program.max_slots
        if avail:
            avail.used_slots = used
            avail.available_slots = max(0, max_s - used)
            avail.is_full = used >= max_s
        else:
            db.add(
                models.OpsProgramAvailability(
                    program_id=row.program_id,
                    max_slots=max_s,
                    used_slots=used,
                    available_slots=max(0, max_s - used),
                    is_full=used >= max_s,
                )
            )

    # ── ops_upload_status ────────────────────────────────────
    uploads = db.query(models.FactDocumentUpload).all()
    approvals = db.query(models.FactApprovalAction).filter_by(entity_type="document_upload").all()
    approval_map = {a.entity_id: a for a in approvals}

    for upload in uploads:
        approval = approval_map.get(upload.id)
        status = "pending_review"
        rejection_reason = None
        approved_at = None
        if approval:
            if approval.action == "approved":
                status = "approved"
                approved_at = approval.performed_at
            elif approval.action == "rejected":
                status = "rejected"
                rejection_reason = approval.reason

        existing = (
            db.query(models.OpsUploadStatus)
            .filter_by(
                student_id=upload.student_id,
                document_type_id=upload.document_type_id,
                process_id=upload.process_id,
            )
            .first()
        )
        if existing:
            if upload.attempt_number >= existing.current_attempt:
                existing.current_status = status
                existing.current_attempt = upload.attempt_number
                existing.last_upload_id = upload.id
                existing.last_rejection_reason = rejection_reason
                existing.approved_at = approved_at
        else:
            db.add(
                models.OpsUploadStatus(
                    student_id=upload.student_id,
                    document_type_id=upload.document_type_id,
                    process_id=upload.process_id,
                    current_status=status,
                    current_attempt=upload.attempt_number,
                    last_upload_id=upload.id,
                    last_rejection_reason=rejection_reason,
                    approved_at=approved_at,
                )
            )

    db.commit()
    print("✅ ops tables rebuilt from facts.")
