from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os
import uuid
from datetime import datetime, timedelta

from database import get_db, log_action
import models
from dependencies import get_current_student
from services.pdf_generator import generate_pdf_for_student

router = APIRouter(prefix="/api/documents", tags=["documents"])

@router.post("/generate/{document_type_code}")
def generate_document(
    document_type_code: str,
    process_code: str = "unknown",
    step_number: int = 1,
    addressed_to: str = "",
    program_folio: str = "",
    phone_number: str = "",
    period: str = "",
    year_digit: str = "",
    month: str = "",
    responsible_position: str = "",
    student: models.OpsStudent = Depends(get_current_student),
    db: Session = Depends(get_db),
    request: Request = None
):
    if request and request.headers.get("X-Evangelista-Secure") != "1":
        raise HTTPException(status_code=403, detail="Petición bloqueada por políticas de ciberseguridad. No puedes generar documentos desde herramientas automatizadas o consola.")

    doc_type = db.query(models.DimDocumentType).filter_by(code=document_type_code).first()
    
    # Allow express codes even if not in DB, for backwards compatibility and express dashboard
    is_express = document_type_code in ['cpa_ss', 'cpa_pp', 'carta_compromiso', 'cpa', 'carta_confidencialidad']
    
    if not doc_type and not is_express:
        raise HTTPException(status_code=400, detail="Tipo de documento inválido.")

    # 1. Check 7-day security limit (using Audit Log to cover both DB-defined and Express documents)
    one_week_ago = datetime.utcnow() - timedelta(days=7)
    
    # Query the audit log for recent generation of this specific document type
    # We search for the document_type_code inside the details_after JSON string
    recent_action = db.query(models.FactAuditLog).filter(
        models.FactAuditLog.user_id == student.id,
        models.FactAuditLog.action == "generate_pdf",
        models.FactAuditLog.timestamp >= one_week_ago,
        models.FactAuditLog.details_after.like(f'%"document_type": "{document_type_code}"%')
    ).first()

    if recent_action:
        # Try to get a friendly name
        friendly_name = doc_type.name if doc_type else document_type_code.upper().replace('_', ' ')
        raise HTTPException(
            status_code=429, 
            detail=f"Límite de Seguridad: Ya has generado un documento de tipo '{friendly_name}' en los últimos 7 días. Por políticas de la coordinación, solo se permite una generación semanal para evitar duplicidad y errores. Deberás esperar a que se cumpla el plazo."
        )

    # 2. Folio Requirement: The folio MUST be provided and must EXIST in the database
    if not program_folio:
        raise HTTPException(status_code=400, detail="El folio del programa es obligatorio para generar este documento.")

    program = db.query(models.DimProgram).filter_by(folio=program_folio).first()
    if not program:
        raise HTTPException(status_code=404, detail=f"El folio '{program_folio}' no es válido o no existe en el sistema.")
                
    if program:
        folio = program.folio
        dependency_name = program.dependency_name
    else:
        folio = "SIN-FOLIO"
        
    pdf_type = document_type_code
    if document_type_code in ['solicitud', 'cpa', 'carta_presentacion', 'formato_cambio', 'cpa_ss', 'cpa_pp']:
        if document_type_code == 'cpa_ss':
            pdf_type = 'DOC-SS-002'
        elif document_type_code == 'cpa_pp':
            pdf_type = 'DOC-PP-002'
        elif program and program.program_type == 'practica_profesional':
            pdf_type = 'DOC-PP-002'
        else:
            pdf_type = 'DOC-SS-002'
    elif document_type_code == 'carta_liberacion':
        pdf_type = 'DOC-SS-006'

    output_dir = "generated_pdfs"
    os.makedirs(output_dir, exist_ok=True)
    
    try:
        filepath = generate_pdf_for_student(
            document_type=pdf_type,
            student=student,
            folio=folio,
            output_dir=output_dir,
            dependency_name=dependency_name,
            addressed_to=addressed_to,
            program_name=program.name if program else None,
            evaluator_name=program.evaluator_name if program else None,
            responsible_name=program.responsible_name if program else None,
            responsible_position=responsible_position or (program.responsible_position if program else None),
            phone_number=phone_number,
            period=period,
            year_digit=year_digit,
            month=month
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno al generar el PDF: {str(e)}")

    proc = db.query(models.DimProcessDefinition).filter_by(code=process_code).first()
    
    fact_gen = models.FactDocumentGeneration(
        student_id=student.id,
        document_type_id=doc_type.id if doc_type else None,
        process_id=proc.id if proc else None,
        step_number=step_number,
        file_path=filepath,
        folio=f"EVA-DOC-{uuid.uuid4().hex[:6].upper()}",
    )
    db.add(fact_gen)
    
    log_action(db, "student", student.id, student.full_name, "generate_pdf",
               "document_generation", None,
               details_after={"document_type": document_type_code, "process": process_code})
               
    db.commit()

    return FileResponse(
        path=filepath, 
        filename=f"{document_type_code}-{student.matricula}.pdf",
        media_type="application/pdf"
    )
