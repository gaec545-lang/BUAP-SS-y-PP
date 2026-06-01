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

    # Specific headers from the BUAP format
    name_headers = [
        r"Nombre del responsable de supervisar el cumplimiento de los objetivos y actividades de los alumnos en la dependencia",
        r"Nombre de la persona a quién se dirigirá el nombramiento de práctica profesional",
        r"Nombre de la persona a quién se dirigirá el nombramiento de servicio social",
        r"Nombre del responsable",
        r"Responsable",
        r"Atentamente",
        r"Dirigido a"
    ]
    pos_headers = [
        r"Puesto o cargo del responsable",
        r"Cargo",
        r"Puesto"
    ]

    def clean_extracted_value(val, headers_to_strip):
        if not val: return None
        v = val.strip()
        
        # If there's a colon, take what's after it
        if ":" in v:
            parts = v.split(":", 1)
            if len(parts[0]) < 50:
                v = parts[1].strip()
        
        # Remove common prefixes
        for h in headers_to_strip:
            # Clean header regex for replacement
            h_clean = h.replace(r"\s*", " ").replace(r"\.", "\\.")
            v = re.sub(rf"^{h_clean}[:\s]*", "", v, flags=re.IGNORECASE).strip()
        
        # Remove common noise
        v = re.sub(r"^(Responsalbe|Responsable|Nombre|Cargo)[:\s]*", "", v, flags=re.IGNORECASE).strip()
        
        # Shield check: If the extracted value contains header labels or metadata, discard it
        forbidden_keywords = [
            "nombre del responsable", "supervisar el cumplimiento", "de los objetivos", "actividades de los alumnos",
            "puesto o cargo", "responsable de los alumnos", "persona a quién", "se dirigirá el nombramiento",
            "nombramiento de", "no. de programa", "fecha de registro", "empresa que oferta", "sector al que",
            "datos generales", "tipo de programa", "área o departamento", "fecha de inicio", "fecha de término",
            "duración en meses", "correo electrónico", "dirección donde", "información para", "apoyo económico",
            "ejes rectores", "perfil educativo", "coordinador cppc", "atentamente", "dirigido a", "comentario"
        ]
        v_lower = v.lower()
        for kw in forbidden_keywords:
            if kw in v_lower:
                return None
        
        if len(v) < 3: return None
        return v

    # Strategy 1: Look for the line IMMEDIATELY AFTER the specific headers
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    for i, line in enumerate(lines):
        # Check for Folio if not found yet (backup for multi-line)
        if not folio and "No. de programa" in line and i + 1 < len(lines):
            folio = lines[i+1].strip()

        # Check for Responsible Name
        for h in name_headers:
            # Match header (normalized). If header spans 2 lines, check joined version.
            combined = line + " " + (lines[i+1] if i+1 < len(lines) else "")
            if h.lower() in combined.lower():
                temp_name = None
                if h.lower() in line.lower() and line.endswith(":"):
                    temp_name = lines[i+1].strip()
                elif h.lower() in combined.lower() and combined.endswith(":"):
                    temp_name = lines[i+2].strip() if i+2 < len(lines) else lines[i+1].strip()
                elif h.lower() in combined.lower():
                    temp_name = lines[i+2].strip() if i+2 < len(lines) else lines[i+1].strip()
                
                cleaned = clean_extracted_value(temp_name, name_headers)
                if cleaned:
                    responsible_name = cleaned
                    break
        if responsible_name: break

    for i, line in enumerate(lines):
        for h in pos_headers:
            if h.lower() in line.lower() and i + 1 < len(lines):
                if line.endswith(":") or line.lower().endswith(h.lower()):
                    temp_pos = lines[i+1].strip()
                    cleaned_pos = clean_extracted_value(temp_pos, pos_headers)
                    if cleaned_pos:
                        responsible_position = cleaned_pos
                        break
        if responsible_position: break

    # Strategy 2: Regex Fallback (if Strategy 1 failed)
    if not responsible_name:
        for header in name_headers:
            resp_match = re.search(rf"{header}[:\s]+([A-ZÁÉÍÓÚÑa-záéíóúñ\.\s\-,]{5,100})", text, re.IGNORECASE)
            if resp_match:
                potential = resp_match.group(1).strip().split('\n')[0].strip()
                responsible_name = clean_extracted_value(potential, name_headers)
                if responsible_name: break

    if not responsible_position:
        for header in pos_headers:
            pos_match = re.search(rf"{header}[:\s]+([A-ZÁÉÍÓÚÑa-záéíóúñ\.\s\-,]{3,100})", text, re.IGNORECASE)
            if pos_match:
                potential = pos_match.group(1).strip().split('\n')[0].strip()
                responsible_position = clean_extracted_value(potential, pos_headers)
                if responsible_position: break

    # Fallback to the program in DB
    programs = db.query(models.DimProgram).filter_by(folio=folio).all()
    if not programs:
        print(f"[Parser] Program with folio {folio} not found in database.")
        return 0

    if not responsible_name or not responsible_position:
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        for i, line in enumerate(lines):
            if ("Responsable" in line or "Nombre" in line) and i + 1 < len(lines):
                if not responsible_name:
                    potential = lines[i+1] if ":" not in line else line.split(":", 1)[1]
                    cleaned = clean_extracted_value(potential, name_headers)
                    if cleaned:
                        responsible_name = cleaned
            if "Cargo" in line or "Puesto" in line:
                if not responsible_position:
                    potential = lines[i+1] if ":" not in line else line.split(":", 1)[1]
                    cleaned_pos = clean_extracted_value(potential, pos_headers)
                    if cleaned_pos:
                        responsible_position = cleaned_pos

    # Clean up names (remove trailing noise)
    if responsible_name:
        responsible_name = re.sub(r"[\t\r\n]", " ", responsible_name).strip()
    if responsible_position:
        responsible_position = re.sub(r"[\t\r\n]", " ", responsible_position).strip()

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
