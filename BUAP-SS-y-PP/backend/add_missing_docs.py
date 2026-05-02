import sys
import os
sys.path.append(os.path.dirname(__file__))

from database import SessionLocal
import models

db = SessionLocal()

missing = [
    ("cpa", "Carta de Presentación y Aceptación", "generated", True, True, "CPA"),
    ("cpa_signed", "CPA Firmada y Sellada", "student", True, True, "CPA"),
    ("carta_confidencialidad_signed", "Carta de Confidencialidad", "student", True, False, ""),
    ("kardex_simple", "Kárdex Simple", "student", False, False, ""),
    ("vigencia_imss", "Vigencia de Derechos IMSS", "student", False, False, ""),
    ("carta_presentacion", "Carta de Presentación Oficial", "generated", True, True, ""),
    ("formato_cambio", "Formato de Cambio", "generated", True, True, ""),
    ("nuevo_nombramiento", "Nuevo Nombramiento", "generated", True, True, ""),
    ("carta_oficial", "Carta Oficial", "generated", True, True, ""),
    ("carta_liberacion", "Carta de Liberación", "student", True, True, ""),
    ("hoja_desempeno", "Hoja de Desempeño", "student", True, True, ""),
    ("reporte", "Reporte", "student", True, True, ""),
    ("formato_exencion", "Formato de Exención", "student", True, True, ""),
]

for code, name, origin, req_sig, req_stamp, desc in missing:
    if not db.query(models.DimDocumentType).filter_by(code=code).first():
        db.add(models.DimDocumentType(code=code, name=name, origin=origin, requires_signature=req_sig, requires_stamp=req_stamp, description=desc))

db.commit()
print("Missing documents added.")
