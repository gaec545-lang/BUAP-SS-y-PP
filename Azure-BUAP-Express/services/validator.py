"""
Orquestador del pipeline de validación.
Coordina: extracción → parseo → cross-ref BD → detección visual → resultado.
"""
import difflib
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session

from services.pdf_extractor import extract_text
from services.field_parser import parse_fields, ParsedFields
from services.signature_detector import detect_signatures
import models


def _similarity(a: str, b: str) -> float:
    """Retorna ratio de similitud entre dos strings (0.0 - 1.0)."""
    if not a or not b:
        return 0.0
    return difflib.SequenceMatcher(None, a.lower().strip(), b.lower().strip()).ratio()


def _make_check(
    name: str,
    result: str,
    extracted: Optional[str] = None,
    expected: Optional[str] = None,
    confidence: Optional[float] = None,
    detail: Optional[str] = None,
) -> models.FactValidationCheck:
    return models.FactValidationCheck(
        check_name=name,
        result=result,
        extracted_value=str(extracted) if extracted is not None else None,
        expected_value=str(expected) if expected is not None else None,
        confidence=confidence,
        detail=detail,
    )


def validate_document(
    pdf_bytes: bytes,
    original_filename: str,
    file_path: str,
    validated_by_id: int,
    db: Session,
    student_id_hint: Optional[int] = None,
    upload_id: Optional[int] = None,
) -> models.FactValidationRun:
    """
    Pipeline completo de validación. Guarda resultados en BD y retorna el FactValidationRun.
    """
    checks: List[models.FactValidationCheck] = []

    # ─── 1. Extracción de texto ──────────────────────────────────────────────
    try:
        raw_text, extraction_method = extract_text(pdf_bytes)
    except Exception as e:
        raw_text = ""
        extraction_method = "error"
        checks.append(_make_check("extraccion_texto", "fail", detail=f"Error extrayendo texto: {str(e)}"))

    if not raw_text or len(raw_text) < 20:
        # PDF completamente ilegible
        run = models.FactValidationRun(
            upload_id=upload_id,
            student_id=student_id_hint,
            document_type_code=None,
            original_filename=original_filename,
            file_path=file_path,
            validated_by_id=validated_by_id,
            validated_at=datetime.utcnow(),
            overall_result="manual_review",
            raw_extracted_text=raw_text,
            extraction_method=extraction_method,
            overall_confidence=0.0,
            read_status="manual_review",
        )
        checks.append(_make_check("extraccion_texto", "fail", detail="Texto extraído insuficiente — PDF posiblemente ilegible"))
        run.checks = checks
        db.add(run)
        db.commit()
        db.refresh(run)
        return run

    # ─── 2. Parseo de campos ─────────────────────────────────────────────────
    fields: ParsedFields = parse_fields(raw_text)

    # Check: tipo de documento
    if fields.doc_type:
        checks.append(_make_check("document_type", "pass", extracted=fields.doc_type, detail="Tipo de documento identificado"))
    else:
        checks.append(_make_check("document_type", "warning", detail="No se pudo identificar el tipo de documento"))

    # ─── 3. Cross-reference con BD ──────────────────────────────────────────

    resolved_student: Optional[models.OpsStudent] = None

    # Busca alumno por matrícula extraída o por hint
    if student_id_hint:
        resolved_student = db.query(models.OpsStudent).filter(
            models.OpsStudent.id == student_id_hint,
            models.OpsStudent.is_active == True,
        ).first()
    elif fields.matricula:
        resolved_student = db.query(models.OpsStudent).filter(
            models.OpsStudent.matricula == fields.matricula,
            models.OpsStudent.is_active == True,
        ).first()

    # Check: matrícula
    if fields.matricula:
        if resolved_student and resolved_student.matricula == fields.matricula:
            checks.append(_make_check(
                "matricula", "pass",
                extracted=fields.matricula,
                expected=resolved_student.matricula,
                confidence=1.0,
                detail="Matrícula encontrada en BD",
            ))
        elif resolved_student:
            checks.append(_make_check(
                "matricula", "fail",
                extracted=fields.matricula,
                expected=resolved_student.matricula,
                confidence=0.0,
                detail="Matrícula en documento no coincide con el alumno esperado",
            ))
        else:
            checks.append(_make_check(
                "matricula", "fail",
                extracted=fields.matricula,
                detail="Matrícula no encontrada en BD",
            ))
    else:
        checks.append(_make_check("matricula", "warning", detail="No se pudo extraer matrícula del documento"))

    # Check: nombre del alumno
    if fields.nombre_alumno and resolved_student:
        sim = _similarity(fields.nombre_alumno, resolved_student.full_name)
        if sim >= 0.85:
            result = "pass"
            detail = f"Nombre coincide (similitud: {sim:.0%})"
        elif sim >= 0.60:
            result = "warning"
            detail = f"Nombre similar pero no exacto (similitud: {sim:.0%})"
        else:
            result = "fail"
            detail = f"Nombre no coincide (similitud: {sim:.0%})"
        checks.append(_make_check(
            "nombre_alumno", result,
            extracted=fields.nombre_alumno,
            expected=resolved_student.full_name,
            confidence=sim,
            detail=detail,
        ))
    elif fields.nombre_alumno:
        checks.append(_make_check("nombre_alumno", "warning", extracted=fields.nombre_alumno, detail="Nombre extraído pero alumno no resuelto en BD"))
    else:
        checks.append(_make_check("nombre_alumno", "warning", detail="No se pudo extraer nombre del documento"))

    # Check: carrera
    if fields.carrera and resolved_student:
        career = db.query(models.DimCareer).filter(models.DimCareer.id == resolved_student.career_id).first()
        if career:
            sim = _similarity(fields.carrera, career.name)
            if sim >= 0.75:
                checks.append(_make_check("carrera", "pass", extracted=fields.carrera, expected=career.name, confidence=sim, detail=f"Carrera coincide ({sim:.0%})"))
            else:
                checks.append(_make_check("carrera", "warning", extracted=fields.carrera, expected=career.name, confidence=sim, detail=f"Carrera no coincide claramente ({sim:.0%})"))
        else:
            checks.append(_make_check("carrera", "skipped", extracted=fields.carrera, detail="Carrera del alumno no encontrada en BD"))
    else:
        checks.append(_make_check("carrera", "skipped", detail="No se pudo verificar carrera"))

    # Check: folio en BD
    if fields.folio:
        program = db.query(models.DimProgram).filter(models.DimProgram.folio == fields.folio).first()
        if program:
            checks.append(_make_check("folio_in_db", "pass", extracted=fields.folio, expected=program.name, detail=f"Folio encontrado: {program.name}"))
        else:
            checks.append(_make_check("folio_in_db", "fail", extracted=fields.folio, detail="Folio no encontrado en catálogo de programas"))
    else:
        checks.append(_make_check("folio_in_db", "warning", detail="No se pudo extraer folio del documento"))

    # Check: ¿el documento fue generado por el sistema?
    generation_record = None
    if resolved_student and fields.doc_type:
        generation_record = db.query(models.FactDocumentGeneration).filter(
            models.FactDocumentGeneration.student_id == resolved_student.id,
        ).order_by(models.FactDocumentGeneration.generated_at.desc()).first()

    if generation_record:
        checks.append(_make_check(
            "generation_record_exists", "pass",
            detail=f"Documento generado por el sistema el {generation_record.generated_at.strftime('%Y-%m-%d %H:%M')}",
        ))
    elif resolved_student:
        checks.append(_make_check("generation_record_exists", "warning", detail="No se encontró registro de generación del documento para este alumno"))
    else:
        checks.append(_make_check("generation_record_exists", "skipped", detail="Alumno no resuelto, no se puede verificar origen"))

    # Check: inscripción activa
    if resolved_student and fields.folio:
        program = db.query(models.DimProgram).filter(models.DimProgram.folio == fields.folio).first()
        if program:
            enrollment = db.query(models.OpsStudentEnrollment).filter(
                models.OpsStudentEnrollment.student_id == resolved_student.id,
                models.OpsStudentEnrollment.program_id == program.id,
            ).first()
            if enrollment:
                checks.append(_make_check(
                    "enrollment_matches", "pass",
                    detail=f"Alumno inscrito en el programa (estado: {enrollment.status})",
                ))
            else:
                checks.append(_make_check(
                    "enrollment_matches", "warning",
                    detail="No se encontró inscripción del alumno en este programa",
                ))
        else:
            checks.append(_make_check("enrollment_matches", "skipped", detail="Programa no encontrado"))
    else:
        checks.append(_make_check("enrollment_matches", "skipped", detail="Alumno o folio no resueltos"))

    # ─── 4. Detección visual de firma y sello ─────────────────────────────────
    sig_result = detect_signatures(pdf_bytes)

    # Check: firma
    if sig_result.firma_confidence >= 0.60:
        firma_check_result = "pass"
    elif sig_result.firma_confidence >= 0.30:
        firma_check_result = "warning"
    else:
        firma_check_result = "fail"

    checks.append(_make_check(
        "firma_detected", firma_check_result,
        confidence=sig_result.firma_confidence,
        detail=sig_result.firma_detail,
    ))

    # Check: sello
    if sig_result.sello_confidence >= 0.60:
        sello_check_result = "pass"
    elif sig_result.sello_confidence >= 0.30:
        sello_check_result = "warning"
    else:
        sello_check_result = "fail"

    checks.append(_make_check(
        "sello_detected", sello_check_result,
        confidence=sig_result.sello_confidence,
        detail=sig_result.sello_detail,
    ))

    # ─── 5. Resultado global ──────────────────────────────────────────────────

    fail_checks = [c for c in checks if c.result == "fail" and c.check_name not in ("firma_detected", "sello_detected")]
    warning_checks = [c for c in checks if c.result == "warning"]
    visual_warnings = [c for c in checks if c.result in ("fail", "warning") and c.check_name in ("firma_detected", "sello_detected")]

    if fail_checks:
        overall_result = "fail"
    elif visual_warnings and not fail_checks:
        overall_result = "warning"
    elif extraction_method == "error":
        overall_result = "manual_review"
    else:
        overall_result = "pass"

    # ─── 6. Guardar en BD ─────────────────────────────────────────────────────
    # Calculate overall confidence
    confidences = [c.confidence for c in checks if c.confidence is not None]
    avg_conf = sum(confidences) / len(confidences) if confidences else 1.0

    run = models.FactValidationRun(
        upload_id=upload_id,
        student_id=resolved_student.id if resolved_student else student_id_hint,
        document_type_code=fields.doc_type,
        original_filename=original_filename,
        file_path=file_path,
        validated_by_id=validated_by_id,
        validated_at=datetime.utcnow(),
        overall_result=overall_result,
        raw_extracted_text=raw_text[:5000] if raw_text else None,  # Limitar tamaño
        extraction_method=extraction_method,
        overall_confidence=avg_conf,
        read_status="read_ok" if overall_result != "manual_review" else "manual_review",
    )
    run.checks = checks

    db.add(run)
    db.commit()
    db.refresh(run)
    return run
