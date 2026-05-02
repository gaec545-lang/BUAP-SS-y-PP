from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime

# Auth
class StudentLoginRequest(BaseModel):
    email: str

class AdminLoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    token: str
    token_type: str = "bearer"

# Process Step
class ProcessStepSchema(BaseModel):
    id: int
    step_number: int
    short_label: str
    title: str
    description: str
    actor: str
    requires_scan: bool
    has_document: bool
    document_name: Optional[str]
    action_text: Optional[str]
    status: str  # completed, current, pending — computed
    completed_date: Optional[str]  # from StudentProgress
    requires_upload: bool = False
    document_type: Optional[str] = None
    upload_status: Optional[str] = None  # not_required, awaiting_upload, pending_review, approved, rejected
    unread_messages: int = 0
    model_config = {"from_attributes": True}

# Process
class ProcessSchema(BaseModel):
    code: str
    name: str
    short_name: str
    category: str
    description: str
    total_steps: int
    generates_resource: bool
    current_step: int
    steps: List[ProcessStepSchema]
    started_at: Optional[str]
    model_config = {"from_attributes": True}

# Student
class StudentSchema(BaseModel):
    id: int
    email: str
    full_name: str
    matricula: str
    career: str
    semester: int
    gpa: float
    process_code: Optional[str]
    dependency_name: Optional[str]
    internal_advisor: Optional[str]
    model_config = {"from_attributes": True}

class StudentLoginResponse(BaseModel):
    token: str
    student: StudentSchema

# Document
class DocumentSchema(BaseModel):
    id: str  # document_type code e.g. DOC-SS-002
    name: str
    description: str
    step_number: int
    step_title: str
    requires_scan: bool
    status: str  # pending, ready, generated, delivered
    generated_at: Optional[str]
    folio: Optional[str]
    download_url: Optional[str]

# Deadline
class DeadlineSchema(BaseModel):
    id: int
    title: str
    description: str
    due_date: str
    process_codes: List[str]
    model_config = {"from_attributes": True}

# Admin
class AdminUserSchema(BaseModel):
    id: int
    username: str
    full_name: str
    role: str
    is_active: bool
    model_config = {"from_attributes": True}

class AdminLoginResponse(BaseModel):
    token: str
    admin: AdminUserSchema

class CreateAdminRequest(BaseModel):
    username: str
    password: str
    full_name: str
    role: str = "subordinado"

class UpdateAdminRequest(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class AdvanceStepResponse(BaseModel):
    success: bool
    new_step: int
    message: str

class SetStepRequest(BaseModel):
    step_number: int


# Upload schemas
class DocumentUploadSchema(BaseModel):
    id: int
    step_number: int
    document_type: str
    original_filename: str
    attempt_number: int
    status: str  # pending, approved, rejected
    rejection_reason: Optional[str]
    reviewed_by: Optional[str]
    uploaded_at: str
    reviewed_at: Optional[str]
    model_config = {"from_attributes": True}

class SubmitUploadResponse(BaseModel):
    success: bool
    upload_id: int
    attempt_number: int
    message: str

class RejectUploadRequest(BaseModel):
    reason: str

# Message schemas
class StepMessageSchema(BaseModel):
    id: int
    step_number: int
    sender_type: str
    sender_name: str
    message: str
    is_read: bool
    created_at: str
    model_config = {"from_attributes": True}

class SendMessageRequest(BaseModel):
    step_number: int
    message: str

class UnreadCountResponse(BaseModel):
    count: int

# Admin dashboard stats
class DashboardStatsSchema(BaseModel):
    total_students: int
    total_ss: int
    total_pp: int
    completed: int
    pending_uploads: int

# Advance step with notes
class AdvanceStepRequest(BaseModel):
    notes: Optional[str] = None

class CreateStudentRequest(BaseModel):
    email: str
    full_name: str
    matricula: str
    career: str
    semester: int
    gpa: float
    process_code: str
    dependency_name: Optional[str] = None
    internal_advisor: Optional[str] = None
    current_step: int = 1

# Admin student list item
class AdminStudentListItem(BaseModel):
    id: int
    full_name: str
    matricula: str
    email: str
    career: str
    process_code: Optional[str]
    process_name: Optional[str]
    current_step: Optional[int]
    total_steps: Optional[int]
    progress_pct: Optional[float]
    started_at: Optional[str]
    updated_at: Optional[str]
