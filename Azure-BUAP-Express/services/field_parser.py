"""
Parsea campos específicos del texto extraído según el tipo de documento.
Usa regex con tolerancia a errores de OCR.
"""
import re
from typing import Optional
from dataclasses import dataclass


@dataclass
class ParsedFields:
    doc_type: Optional[str] = None        # DOC-SS-002 | DOC-PP-002 | carta_confidencialidad | carta_compromiso
    nombre_alumno: Optional[str] = None
    matricula: Optional[str] = None       # 9 dígitos exactos
    folio: Optional[str] = None           # 6 dígitos, puede empezar con 0
    carrera: Optional[str] = None
    dependency_name: Optional[str] = None
    fecha: Optional[str] = None


# ─── Patrones de detección de tipo de documento ────────────────────────────

def detect_doc_type(text: str) -> Optional[str]:
    text_upper = text.upper()
    if "SERVICIO SOCIAL" in text_upper and "PRESENTACI" in text_upper:
        return "DOC-SS-002"
    if "PRÁCTICA PROFESIONAL" in text_upper and "PRESENTACI" in text_upper:
        return "DOC-PP-002"
    if "PRACTICA PROFESIONAL" in text_upper and "PRESENTACI" in text_upper:
        return "DOC-PP-002"
    if "CONFIDENCIALIDAD" in text_upper:
        return "carta_confidencialidad"
    if "COMPROMISO" in text_upper and ("TELÉFONO" in text_upper or "TELEFONO" in text_upper):
        return "carta_compromiso"
    return None


# ─── Extracción de matrícula ───────────────────────────────────────────────

MATRICULA_RE = re.compile(r'\b(\d{9})\b')

def extract_matricula(text: str) -> Optional[str]:
    matches = MATRICULA_RE.findall(text)
    if matches:
        return matches[0]
    return None


# ─── Extracción de folio ──────────────────────────────────────────────────

FOLIO_RE = re.compile(r'\b(0\d{5})\b')

def extract_folio(text: str) -> Optional[str]:
    matches = FOLIO_RE.findall(text)
    if matches:
        return matches[0]
    return None


# ─── Extracción de nombre del alumno ─────────────────────────────────────

def extract_nombre_alumno(text: str) -> Optional[str]:
    """
    Busca el nombre del alumno cerca de marcadores clave.
    Los documentos BUAP tienen patrones como:
    'alumno(a): JUAN GARCÍA LÓPEZ'
    'Nombre: JUAN GARCÍA LÓPEZ'
    'C. JUAN GARCÍA LÓPEZ'
    """
    lines = text.split('\n')

    # Strategy 1: busca línea con "alumno" y toma el contenido después del ":"
    for i, line in enumerate(lines):
        line_lower = line.lower()
        if 'alumno' in line_lower or 'nombre del' in line_lower:
            # Intenta extraer nombre de la misma línea
            colon_idx = line.find(':')
            if colon_idx >= 0:
                candidate = line[colon_idx + 1:].strip()
                if len(candidate) > 5 and not any(c.isdigit() for c in candidate[:3]):
                    return _clean_name(candidate)
            # Si no hay ":" en la misma línea, toma la siguiente línea
            if i + 1 < len(lines):
                next_line = lines[i + 1].strip()
                if len(next_line) > 5 and _looks_like_name(next_line):
                    return _clean_name(next_line)

    # Strategy 2: busca "C." seguido de nombre en mayúsculas
    c_pattern = re.compile(r'\bC\.\s+([A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑa-záéíóúüñ\s]{10,50})', re.UNICODE)
    match = c_pattern.search(text)
    if match:
        return _clean_name(match.group(1))

    return None


def _looks_like_name(text: str) -> bool:
    """Heurística: ¿parece un nombre? Letras, espacios, sin dígitos al inicio."""
    if not text:
        return False
    if any(c.isdigit() for c in text[:5]):
        return False
    word_count = len(text.split())
    return 2 <= word_count <= 6


def _clean_name(name: str) -> str:
    """Limpia artefactos comunes de OCR en nombres."""
    name = name.strip()
    name = re.sub(r'\s+', ' ', name)
    # Quita caracteres no alfanuméricos al final
    name = name.rstrip('.,;:')
    return name


# ─── Extracción de carrera ────────────────────────────────────────────────

CAREER_KEYWORDS = [
    "administración", "administracion", "contaduría", "contaduria",
    "informática", "informatica", "sistemas", "derecho", "psicología",
    "psicologia", "economía", "economia", "comunicación", "comunicacion",
    "ingeniería", "ingenieria", "arquitectura", "medicina", "enfermería"
]

def extract_carrera(text: str) -> Optional[str]:
    lines = text.split('\n')
    for i, line in enumerate(lines):
        line_lower = line.lower()
        if 'carrera' in line_lower or 'licenciatura' in line_lower:
            colon_idx = line.find(':')
            if colon_idx >= 0:
                candidate = line[colon_idx + 1:].strip()
                if len(candidate) > 5:
                    return _clean_name(candidate)
            if i + 1 < len(lines):
                next_line = lines[i + 1].strip()
                if len(next_line) > 5:
                    return _clean_name(next_line)

    # Fallback: busca keyword de carrera en texto
    text_lower = text.lower()
    for kw in CAREER_KEYWORDS:
        idx = text_lower.find(kw)
        if idx >= 0:
            # Toma la frase hasta el siguiente salto de línea
            end = text.find('\n', idx)
            candidate = text[idx:end if end > 0 else idx + 60].strip()
            return _clean_name(candidate)

    return None


# ─── Parser principal ─────────────────────────────────────────────────────

def parse_fields(text: str) -> ParsedFields:
    fields = ParsedFields()
    fields.doc_type = detect_doc_type(text)
    fields.matricula = extract_matricula(text)
    fields.folio = extract_folio(text)
    fields.nombre_alumno = extract_nombre_alumno(text)
    fields.carrera = extract_carrera(text)
    return fields
