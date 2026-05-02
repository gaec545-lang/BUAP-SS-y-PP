from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os
import uuid
from datetime import datetime

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
    db: Session = Depends(get_db)
):
    doc_type = db.query(models.DimDocumentType).filter_by(code=document_type_code).first()
    
    dependency_name = ""
    program = None

    if program_folio:
        program = db.query(models.DimProgram).filter_by(folio=program_folio).first()
    else:
        current_period = db.query(models.DimPeriod).filter_by(is_current=True).first()
        enrollment = None
        if current_period:
            enrollment = db.query(models.OpsStudentEnrollment).filter_by(
                student_id=student.id, period_id=current_period.id
            ).first()
        
        if enrollment and enrollment.program:
            program = enrollment.program
        else:
            # Fallback to accepted interests before official enrollment
            interest = db.query(models.OpsStudentInterest).filter(
                models.OpsStudentInterest.student_id == student.id,
                models.OpsStudentInterest.status.in_(['selected', 'accepted'])
            ).first()
            if interest and interest.program:
                program = interest.program
                if not addressed_to and interest.addressed_to:
                    addressed_to = interest.addressed_to
                
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
            responsible_position=responsible_position,
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
