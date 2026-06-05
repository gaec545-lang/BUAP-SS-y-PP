import os
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
from dependencies import get_current_validator_or_student, security, decode_token
from schemas import ValidationRunOut, ValidationCheckOut
from services.validator import validate_document
import models
from typing import Optional, Dict

router = APIRouter()

UPLOAD_DIR = "uploads_validator"
MAIN_UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB
ALLOWED_EXTENSIONS = {".pdf"}

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(MAIN_UPLOAD_DIR, exist_ok=True)


@router.post("/upload", response_model=ValidationRunOut)
async def upload_and_validate(
    file: UploadFile = File(...),
    student_id: Optional[int] = Form(None),
    upload_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: models.OpsValidatorUser = Depends(get_current_validator_or_student),
):
    """
    Sube un PDF y ejecuta el pipeline de validación.
    Retorna el reporte completo de validación.
    """
    # Validar extensión
    filename = file.filename or "documento.pdf"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Solo se aceptan archivos PDF. Recibido: {ext}")

    # Leer archivo
    pdf_bytes = await file.read()

    # Validar tamaño
    if len(pdf_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"Archivo demasiado grande (máx 20 MB)")

    # Validar que es un PDF válido
    if not pdf_bytes.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="El archivo no es un PDF válido")

    # Guardar archivo
    unique_name = f"{uuid.uuid4().hex}_{filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)
    with open(file_path, "wb") as f:
        f.write(pdf_bytes)

    # Ejecutar pipeline de validación
    try:
        run = validate_document(
            pdf_bytes=pdf_bytes,
            original_filename=filename,
            file_path=file_path,
            validated_by_id=current_user.id,
            db=db,
            student_id_hint=student_id,
            upload_id=upload_id,
        )
    except Exception as e:
        # Si el pipeline falla completamente, limpiar archivo
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Error en pipeline de validación: {str(e)}")

    # Enriquecer con nombre del alumno
    student_name = None
    matricula = None
    if run.student_id:
        student = db.query(models.OpsStudent).filter(models.OpsStudent.id == run.student_id).first()
        if student:
            student_name = student.full_name
            matricula = student.matricula

    return ValidationRunOut(
        id=run.id,
        student_id=run.student_id,
        student_name=student_name,
        matricula=matricula,
        document_type_code=run.document_type_code,
        original_filename=run.original_filename,
        validated_at=run.validated_at,
        overall_result=run.overall_result,
        override_result=run.override_result,
        override_reason=run.override_reason,
        extraction_method=run.extraction_method,
        checks=[
            ValidationCheckOut(
                check_name=c.check_name,
                result=c.result,
                extracted_value=c.extracted_value,
                expected_value=c.expected_value,
                confidence=c.confidence,
                detail=c.detail,
            )
            for c in run.checks
        ],
    )


@router.post("/upload-batch", response_model=Dict[str, ValidationRunOut])
async def upload_and_validate_batch(
    cpa: UploadFile = File(...),
    confidencialidad: UploadFile = File(...),
    kardex: UploadFile = File(...),
    imss: UploadFile = File(...),
    compromiso: Optional[UploadFile] = File(None),
    student_id: Optional[int] = Form(None),
    folio: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: models.OpsValidatorUser = Depends(get_current_validator_or_student),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Sube 5 archivos a la vez, ejecuta el pipeline de validación para todos y los registra
    como entregas de documentos (FactDocumentUpload) para el alumno.
    """
    files_to_process = {
        "cpa": cpa,
        "confidencialidad": confidencialidad,
        "kardex": kardex,
        "imss": imss
    }
    if compromiso:
        files_to_process["compromiso"] = compromiso

    # Fallback to student_id from token if not provided in Form
    if not student_id:
        token_data = decode_token(credentials.credentials)
        if token_data and token_data.get("type") == "student":
            student_id = int(token_data.get("sub"))

    student = None
    if student_id:
        student = db.query(models.OpsStudent).filter_by(id=student_id).first()

    # Resolve student active process and step number
    process_id = None
    step_number = 1
    if student:
        progress = db.query(models.OpsStudentProgress).filter_by(student_id=student.id).first()
        if progress:
            process_id = progress.process_id
            step_number = progress.current_step
        
        if not process_id:
            proc = db.query(models.DimProcessDefinition).filter_by(code="inscripcion").first()
            if proc:
                process_id = proc.id

    results = {}
    for key, file_obj in files_to_process.items():
        if not file_obj:
            continue
            
        filename = file_obj.filename or f"{key}.pdf"
        ext = os.path.splitext(filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"El archivo {key} no es PDF. Recibido: {ext}")

        pdf_bytes = await file_obj.read()

        if len(pdf_bytes) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail=f"Archivo {key} demasiado grande (máx 20 MB)")

        if not pdf_bytes.startswith(b"%PDF"):
            raise HTTPException(status_code=400, detail=f"El archivo {key} no es un PDF válido")

        # Map frontend key to database document code & name
        if key == "cpa":
            service_type = "servicio_social"
            if student:
                enrollment = db.query(models.OpsStudentEnrollment).filter_by(student_id=student.id).first()
                if enrollment and enrollment.service_type:
                    service_type = enrollment.service_type
            
            doc_code = "cpa_pp" if service_type == "practica_profesional" else "cpa_ss"
            doc_name = "CPA Práctica Profesional" if service_type == "practica_profesional" else "CPA Servicio Social"
        elif key == "confidencialidad":
            doc_code = "carta_confidencialidad"
            doc_name = "Carta de Confidencialidad"
        elif key == "compromiso":
            doc_code = "carta_compromiso"
            doc_name = "Carta Compromiso"
        elif key == "kardex":
            doc_code = "kardex"
            doc_name = "Kárdex Simple"
        elif key == "imss":
            doc_code = "vigencia_imss"
            doc_name = "Vigencia de Derechos IMSS"
        else:
            doc_code = key
            doc_name = key.replace("_", " ").capitalize()

        # Find or create DimDocumentType
        doc_type = db.query(models.DimDocumentType).filter_by(code=doc_code).first()
        if not doc_type:
            doc_type = models.DimDocumentType(
                code=doc_code,
                name=doc_name,
                origin="student",
                requires_signature=True,
                requires_stamp=False,
                description=doc_name
            )
            db.add(doc_type)
            db.flush()

        # Resolve step number from process step definition
        doc_step_number = step_number
        if process_id:
            p_step = db.query(models.DimProcessStep).filter_by(process_id=process_id).filter(
                (models.DimProcessStep.student_document_type == doc_code) |
                (models.DimProcessStep.generated_document_type == doc_code)
            ).first()
            if p_step:
                doc_step_number = p_step.step_number

        # Compress if PDF
        compressed_bytes = pdf_bytes
        if ext == ".pdf":
            import fitz
            try:
                doc = fitz.open(stream=pdf_bytes, filetype="pdf")
                compressed_bytes = doc.tobytes(garbage=4, deflate=True)
                doc.close()
            except Exception:
                pass

        # Determine attempt number
        attempt = 1
        if student and process_id:
            existing_status = db.query(models.OpsUploadStatus).filter_by(
                student_id=student.id, document_type_id=doc_type.id, process_id=process_id
            ).first()
            if existing_status:
                attempt = existing_status.current_attempt + 1

        # Save to main uploads/ directory
        matricula = student.matricula if student else "unknown"
        safe_name = f"{matricula}-{doc_code}-attempt{attempt}{ext}"
        main_file_path = os.path.join(MAIN_UPLOAD_DIR, safe_name)
        os.makedirs(MAIN_UPLOAD_DIR, exist_ok=True)
        with open(main_file_path, "wb") as f:
            f.write(compressed_bytes)

        # Run validation pipeline
        try:
            run = validate_document(
                pdf_bytes=compressed_bytes,
                original_filename=filename,
                file_path=main_file_path,
                validated_by_id=current_user.id,
                db=db,
                student_id_hint=student_id,
                upload_id=None,
            )
        except Exception as e:
            if os.path.exists(main_file_path):
                os.remove(main_file_path)
            raise HTTPException(status_code=500, detail=f"Error validando {key}: {str(e)}")

        # Create FactDocumentUpload record
        upload = models.FactDocumentUpload(
            student_id=student_id,
            document_type_id=doc_type.id,
            process_id=process_id,
            step_number=doc_step_number,
            file_path=main_file_path,
            original_filename=filename,
            attempt_number=attempt,
            folio=folio,
            confidence=run.overall_confidence,
            read_status=run.read_status,
        )
        db.add(upload)
        db.flush()

        # Link validation run to upload
        run.upload_id = upload.id
        db.flush()

        # Update OpsUploadStatus
        if student and process_id:
            existing_status = db.query(models.OpsUploadStatus).filter_by(
                student_id=student.id, document_type_id=doc_type.id, process_id=process_id
            ).first()
            if existing_status:
                existing_status.current_status = "pending_review"
                existing_status.current_attempt = attempt
                existing_status.last_upload_id = upload.id
                existing_status.last_rejection_reason = None
            else:
                db.add(models.OpsUploadStatus(
                    student_id=student.id,
                    document_type_id=doc_type.id,
                    process_id=process_id,
                    current_status="pending_review",
                    current_attempt=attempt,
                    last_upload_id=upload.id,
                ))

        student_name = student.full_name if student else None
        matricula_str = student.matricula if student else None

        results[key] = ValidationRunOut(
            id=run.id,
            student_id=run.student_id,
            student_name=student_name,
            matricula=matricula_str,
            document_type_code=doc_code,
            original_filename=run.original_filename,
            validated_at=run.validated_at,
            overall_result=run.overall_result,
            override_result=run.override_result,
            override_reason=run.override_reason,
            extraction_method=run.extraction_method,
            overall_confidence=run.overall_confidence,
            read_status=run.read_status,
            checks=[
                ValidationCheckOut(
                    check_name=c.check_name,
                    result=c.result,
                    extracted_value=c.extracted_value,
                    expected_value=c.expected_value,
                    confidence=c.confidence,
                    detail=c.detail,
                )
                for c in run.checks
            ],
        )

    db.commit()
    return results

