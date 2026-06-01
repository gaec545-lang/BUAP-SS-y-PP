import os
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from dependencies import get_current_validator_or_student
from schemas import ValidationRunOut, ValidationCheckOut
from services.validator import validate_document
import models
from typing import Optional, Dict

router = APIRouter()

UPLOAD_DIR = "uploads_validator"
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB
ALLOWED_EXTENSIONS = {".pdf"}

os.makedirs(UPLOAD_DIR, exist_ok=True)


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
    db: Session = Depends(get_db),
    current_user: models.OpsValidatorUser = Depends(get_current_validator_or_student),
):
    """
    Sube 5 archivos a la vez y ejecuta el pipeline de validación para todos.
    Retorna un reporte consolidado.
    """
    files_to_process = {
        "cpa": cpa,
        "confidencialidad": confidencialidad,
        "kardex": kardex,
        "imss": imss
    }
    if compromiso:
        files_to_process["compromiso"] = compromiso

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

        unique_name = f"{uuid.uuid4().hex}_{filename}"
        file_path = os.path.join(UPLOAD_DIR, unique_name)
        with open(file_path, "wb") as f:
            f.write(pdf_bytes)

        try:
            run = validate_document(
                pdf_bytes=pdf_bytes,
                original_filename=filename,
                file_path=file_path,
                validated_by_id=current_user.id,
                db=db,
                student_id_hint=student_id,
                upload_id=None,
            )
        except Exception as e:
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(status_code=500, detail=f"Error validando {key}: {str(e)}")

        student_name = None
        matricula = None
        if run.student_id:
            student = db.query(models.OpsStudent).filter(models.OpsStudent.id == run.student_id).first()
            if student:
                student_name = student.full_name
                matricula = student.matricula

        results[key] = ValidationRunOut(
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

    return results
