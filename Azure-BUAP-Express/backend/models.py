from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Text, ForeignKey,
    Date, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


# ─────────────────────────────────────────────────────────────
# CAPA 1 — Tablas de Dimensión (DIM)
# ─────────────────────────────────────────────────────────────

class DimCareer(Base):
    __tablename__ = "dim_careers"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    full_code = Column(String(50))
    is_active = Column(Boolean, default=True)


class DimModality(Base):
    __tablename__ = "dim_modalities"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(30), unique=True)
    name = Column(String(100))
    is_active = Column(Boolean, default=True)


class DimPeriod(Base):
    __tablename__ = "dim_periods"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True)
    name = Column(String(100))
    period_type = Column(String(20))          # "otono", "verano", "anual"
    year = Column(Integer)
    start_date = Column(Date)
    end_date = Column(Date)
    enrollment_start = Column(Date)
    enrollment_end = Column(Date)
    is_current = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)


class DimProgram(Base):
    __tablename__ = "dim_programs"
    id = Column(Integer, primary_key=True, index=True)
    folio = Column(String(20), unique=True, nullable=False)
    name = Column(String(500), nullable=False)
    program_type = Column(String(30), nullable=False)  # "servicio_social" | "practica_profesional"
    career_id = Column(Integer, ForeignKey("dim_careers.id"), nullable=False)
    max_slots = Column(Integer, nullable=False)
    dependency_name = Column(String(500))
    sector = Column(String(50))
    evaluator_name = Column(String(200))
    period_id = Column(Integer, ForeignKey("dim_periods.id"))
    status = Column(String(20), default="active")  # "active", "full", "inactive"
    is_active = Column(Boolean, default=True)
    career = relationship("DimCareer")
    availability = relationship("OpsProgramAvailability", back_populates="program", uselist=False)


class DimProcessDefinition(Base):
    __tablename__ = "dim_process_definitions"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True)
    name = Column(String(200))
    description = Column(Text)
    display_order = Column(Integer)
    is_primary = Column(Boolean)
    generates_resource = Column(Boolean, default=False)
    color_code = Column(String(20))
    is_active = Column(Boolean, default=True)
    steps = relationship("DimProcessStep", back_populates="process", order_by="DimProcessStep.step_number")


class DimProcessStep(Base):
    __tablename__ = "dim_process_steps"
    id = Column(Integer, primary_key=True, index=True)
    process_id = Column(Integer, ForeignKey("dim_process_definitions.id"))
    step_number = Column(Integer)
    title = Column(String(300))
    short_label = Column(String(100))
    description = Column(Text)
    actor = Column(String(50))
    requires_upload = Column(Boolean, default=False)
    requires_scan = Column(Boolean, default=False)
    has_generated_document = Column(Boolean, default=False)
    generated_document_type = Column(String(100))
    has_student_document = Column(Boolean, default=False)
    student_document_type = Column(String(100))
    action_required = Column(Text)
    warning_text = Column(Text)
    is_active = Column(Boolean, default=True)
    process = relationship("DimProcessDefinition", back_populates="steps")
    __table_args__ = (UniqueConstraint("process_id", "step_number"),)


class DimDocumentType(Base):
    __tablename__ = "dim_document_types"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True)
    name = Column(String(200))
    origin = Column(String(20))               # "generated" | "student"
    requires_signature = Column(Boolean)
    requires_stamp = Column(Boolean)
    description = Column(Text)
    is_active = Column(Boolean, default=True)


class DimSystemConfig(Base):
    __tablename__ = "dim_system_config"
    id = Column(Integer, primary_key=True, index=True)
    config_key = Column(String(100), unique=True)
    config_value = Column(Text)
    config_type = Column(String(20))           # "boolean", "string", "date", "integer"
    description = Column(Text)
    updated_at = Column(DateTime)
    updated_by = Column(String(100))


# ─────────────────────────────────────────────────────────────
# CAPA 2 — Tablas de Hechos (FACT)  — append-only
# ─────────────────────────────────────────────────────────────

class FactRegistration(Base):
    __tablename__ = "fact_registrations"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), nullable=False)
    full_name = Column(String(200))
    first_name = Column(String(100))
    last_name_paterno = Column(String(100))
    last_name_materno = Column(String(100))
    matricula = Column(String(20))
    career_id = Column(Integer, ForeignKey("dim_careers.id"))
    modality_id = Column(Integer, ForeignKey("dim_modalities.id"))
    study_plan = Column(String(50))
    registered_at = Column(DateTime, default=func.now())
    ip_address = Column(String(50))


class FactEnrollment(Base):
    __tablename__ = "fact_enrollments"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("ops_students.id"))
    program_id = Column(Integer, ForeignKey("dim_programs.id"))
    period_id = Column(Integer, ForeignKey("dim_periods.id"))
    service_type = Column(String(30))
    folio_entered = Column(String(20))
    status = Column(String(20), default="pending")
    enrolled_at = Column(DateTime, default=func.now())
    validated_by = Column(String(100))
    validated_at = Column(DateTime)
    rejection_reason = Column(Text)
    slot_number = Column(Integer)
    student = relationship("OpsStudent")
    program = relationship("DimProgram")


class FactStepCompletion(Base):
    __tablename__ = "fact_step_completions"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("ops_students.id"))
    process_id = Column(Integer, ForeignKey("dim_process_definitions.id"))
    step_number = Column(Integer)
    completed_at = Column(DateTime, default=func.now())
    completed_by = Column(String(100))
    notes = Column(Text)


class FactDocumentGeneration(Base):
    __tablename__ = "fact_document_generations"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("ops_students.id"))
    document_type_id = Column(Integer, ForeignKey("dim_document_types.id"))
    process_id = Column(Integer, ForeignKey("dim_process_definitions.id"))
    step_number = Column(Integer)
    file_path = Column(String(500))
    folio = Column(String(30), unique=True)
    generated_at = Column(DateTime, default=func.now())
    student = relationship("OpsStudent")
    document_type = relationship("DimDocumentType")


class FactDocumentUpload(Base):
    __tablename__ = "fact_document_uploads"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("ops_students.id"))
    document_type_id = Column(Integer, ForeignKey("dim_document_types.id"))
    process_id = Column(Integer, ForeignKey("dim_process_definitions.id"))
    step_number = Column(Integer)
    file_path = Column(String(500))
    original_filename = Column(String(300))
    attempt_number = Column(Integer)
    uploaded_at = Column(DateTime, default=func.now())
    student = relationship("OpsStudent")
    document_type = relationship("DimDocumentType")


class FactApprovalAction(Base):
    __tablename__ = "fact_approval_actions"
    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String(50))    # "document_upload", "enrollment", "change_request"
    entity_id = Column(Integer)
    action = Column(String(20))         # "approved", "rejected", "correction_requested"
    performed_by = Column(String(100))
    reason = Column(Text)
    auto_advanced = Column(Boolean, default=False)
    new_step = Column(Integer)
    performed_at = Column(DateTime, default=func.now())


class FactMessage(Base):
    __tablename__ = "fact_messages"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("ops_students.id"))
    step_number = Column(Integer)
    process_id = Column(Integer, ForeignKey("dim_process_definitions.id"))
    sender_type = Column(String(10))    # "admin" | "student"
    sender_id = Column(Integer)
    sender_name = Column(String(200))
    message = Column(Text)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    student = relationship("OpsStudent")


class FactChangeRequest(Base):
    __tablename__ = "fact_change_requests"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("ops_students.id"))
    request_type = Column(String(20))   # "cambio" | "baja"
    current_program_id = Column(Integer, ForeignKey("dim_programs.id"))
    new_program_id = Column(Integer, ForeignKey("dim_programs.id"))
    justification = Column(Text, nullable=False)
    status = Column(String(20), default="pending")
    submitted_at = Column(DateTime, default=func.now())
    student = relationship("OpsStudent")
    current_program = relationship("DimProgram", foreign_keys=[current_program_id])
    new_program = relationship("DimProgram", foreign_keys=[new_program_id])


class FactAuditLog(Base):
    __tablename__ = "fact_audit_log"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=func.now())
    user_type = Column(String(10))      # "admin", "student", "system"
    user_id = Column(Integer)
    user_name = Column(String(200))
    action = Column(String(100))
    entity_type = Column(String(50))
    entity_id = Column(Integer)
    details_before = Column(Text)       # JSON string
    details_after = Column(Text)        # JSON string
    ip_address = Column(String(50))


# ─────────────────────────────────────────────────────────────
# CAPA 3 — Tablas Operativas (OPS)
# ─────────────────────────────────────────────────────────────

class OpsStudent(Base):
    __tablename__ = "ops_students"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), unique=True, nullable=False)
    full_name = Column(String(200))
    first_name = Column(String(100))
    last_name_paterno = Column(String(100))
    last_name_materno = Column(String(100))
    matricula = Column(String(20), unique=True)
    career_id = Column(Integer, ForeignKey("dim_careers.id"))
    modality_id = Column(Integer, ForeignKey("dim_modalities.id"))
    study_plan = Column(String(50))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    last_login_at = Column(DateTime)
    career = relationship("DimCareer")
    modality = relationship("DimModality")
    progress_records = relationship("OpsStudentProgress", back_populates="student")
    enrollments = relationship("OpsStudentEnrollment", back_populates="student")


class OpsStudentProgress(Base):
    __tablename__ = "ops_student_progress"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("ops_students.id"))
    process_id = Column(Integer, ForeignKey("dim_process_definitions.id"))
    current_step = Column(Integer, default=1)
    status = Column(String(20), default="not_started")
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    meta_data = Column(Text, default="{}")  # JSON storage
    student = relationship("OpsStudent", back_populates="progress_records")
    process = relationship("DimProcessDefinition")
    __table_args__ = (UniqueConstraint("student_id", "process_id"),)


class OpsStudentEnrollment(Base):
    __tablename__ = "ops_student_enrollments"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("ops_students.id"))
    program_id = Column(Integer, ForeignKey("dim_programs.id"))
    period_id = Column(Integer, ForeignKey("dim_periods.id"))
    service_type = Column(String(30))
    status = Column(String(20))         # "pending_validation", "active", "completed", "cancelled"
    enrolled_at = Column(DateTime, default=func.now())
    student = relationship("OpsStudent", back_populates="enrollments")
    program = relationship("DimProgram")
    period = relationship("DimPeriod")


class OpsUploadStatus(Base):
    __tablename__ = "ops_upload_status"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("ops_students.id"))
    document_type_id = Column(Integer, ForeignKey("dim_document_types.id"))
    process_id = Column(Integer, ForeignKey("dim_process_definitions.id"))
    current_status = Column(String(20), default="not_uploaded")
    current_attempt = Column(Integer, default=0)
    last_upload_id = Column(Integer, ForeignKey("fact_document_uploads.id"))
    last_rejection_reason = Column(Text)
    approved_at = Column(DateTime)
    document_type = relationship("DimDocumentType")


class OpsProgramAvailability(Base):
    __tablename__ = "ops_program_availability"
    id = Column(Integer, primary_key=True, index=True)
    program_id = Column(Integer, ForeignKey("dim_programs.id"), unique=True)
    max_slots = Column(Integer)
    used_slots = Column(Integer, default=0)
    available_slots = Column(Integer)
    is_full = Column(Boolean, default=False)
    program = relationship("DimProgram", back_populates="availability")


class OpsAdminUser(Base):
    __tablename__ = "ops_admin_users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True)
    password_hash = Column(String(200))
    full_name = Column(String(200))
    role = Column(String(20))           # "coordinador" | "subordinado"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())


class OpsStudentInterest(Base):
    __tablename__ = "ops_student_interests"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("ops_students.id"))
    program_id = Column(Integer, ForeignKey("dim_programs.id"))
    status = Column(String(50), default="interested")  # "interested", "appointment_accepted", "selected_final"
    addressed_to = Column(String(200))
    created_at = Column(DateTime, default=func.now())
    student = relationship("OpsStudent")
    program = relationship("DimProgram")


# ─────────────────────────────────────────────────────────────
# Deadline (se mantiene igual)
# ─────────────────────────────────────────────────────────────

class Deadline(Base):
    __tablename__ = "deadlines"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(Text)
    due_date = Column(String)
    process_codes = Column(Text, default="[]")   # JSON stored as text
    student_ids = Column(Text, default="[]")     # JSON stored as text
