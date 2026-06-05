import fitz
import re
import os
import models
from sqlalchemy.orm import Session

def parse_program_pdf(file_path: str, db: Session) -> int:
    """
    Parses a PDF file to extract the program Folio, Responsible Name, and Position.
    Updates the DimProgram table in the database.
    Returns 1 if a program was updated, 0 otherwise.
    """
    if not os.path.exists(file_path):
        print(f"[Parser] File not found: {file_path}")
        return 0

    text = ""
    try:
        doc = fitz.open(file_path)
        # We usually only need the first page for this info
        for page in doc:
            text += page.get_text()
        doc.close()
    except Exception as e:
        print(f"[Parser] Error opening PDF {file_path}: {e}")
        return 0

    if not text:
        print(f"[Parser] No text found in {file_path}")
        return 0

    # 1. Look for Folio (usually a number of 5-8 digits, or with dashes like 2026-SS-001)
    folio_patterns = [
        r"No\.\s*de\s*programa[:\s]*(\d{5,10})",
        r"(?:Folio|FOLIO)[:\s]*([A-Z0-9-]{5,15})",
        r"\b(\d{5,8})\b",
        r"\b(\d{4}-[S P]{2}-\d{3})\b"
    ]
    
    folio = None
    for pattern in folio_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for m in matches:
            clean_m = str(m).strip()
            prog = db.query(models.DimProgram).filter_by(folio=clean_m).first()
            if prog:
                folio = clean_m
                break
        if folio: break

    if not folio:
        all_progs = db.query(models.DimProgram.folio).all()
        for (p_folio,) in all_progs:
            if p_folio in text:
                folio = p_folio
                break

    if not folio:
        print(f"[Parser] Could not identify Folio in {os.path.basename(file_path)}")
        return 0

    # 2. Look for Responsible Name and Position
    responsible_name = None
    responsible_position = None

    # Merge newlines in original text to simplify regex searches while maintaining casing and accents
    orig_norm = re.sub(r'[\r\n\t]+', ' ', text)
    orig_norm = re.sub(r'\s+', ' ', orig_norm).strip()

    # Regex to find name and cargo under "Información para generar nombramiento"
    pattern = (
        r"nombre\s+de\s+la\s+persona\s+a\s+qui[eé]n\s+se\s+dirigir[aá]\s+el\s+nombramiento\s+de\s+"
        r"(?:pr[aá]ctica|servicio)\s+(?:profesional|social)\s*:\s*(.*?)\s+cargo\s*:\s*(.*?)"
        r"(?:\s+(?:informaci[oó]n del programa|apoyo|ejes|\uf431|evaluaci[oó]n|perfil)|$)"
    )
    match = re.search(pattern, orig_norm, re.IGNORECASE)

    if match:
        responsible_name = match.group(1).strip()
        responsible_position = match.group(2).strip()
    else:
        # Fallback to supervisor info
        pattern_sup = (
            r"nombre\s+del\s+responsable\s+de\s+supervisar\s+el\s+cumplimiento\s+de\s+los\s+objetivos"
            r"\s+y\s+actividades\s+de\s+los\s+alumnos\s+en\s+la\s+dependencia\s*:\s*(.*?)\s+"
            r"puesto\s+o\s+cargo\s+del\s+responsable\s*:\s*(.*?)(?:\s+(?:correo|tel[eé]fono|direcci[oó]n)|$)"
        )
        match_sup = re.search(pattern_sup, orig_norm, re.IGNORECASE)
        if match_sup:
            responsible_name = match_sup.group(1).strip()
            responsible_position = match_sup.group(2).strip()

    # Clean up name and position
    if responsible_name:
        # Remove trailing colons, spaces or trailing dots
        responsible_name = re.sub(r"^[:\s]+|[:\s]+$", "", responsible_name).strip()
    if responsible_position:
        responsible_position = re.sub(r"^[:\s]+|[:\s]+$", "", responsible_position).strip()

    # Fallback to the program in DB
    programs = db.query(models.DimProgram).filter_by(folio=folio).all()
    if not programs:
        print(f"[Parser] Program with folio {folio} not found in database.")
        return 0

    if responsible_name:
        for program in programs:
            program.responsible_name = responsible_name
            if responsible_position:
                program.responsible_position = responsible_position
        
        db.commit()
        print(f"[Parser] Updated folio {folio} across {len(programs)} program entries: {responsible_name} ({responsible_position})")
        return len(programs)
    
    print(f"[Parser] Found folio {folio} but could not extract responsible info.")
    return 0
