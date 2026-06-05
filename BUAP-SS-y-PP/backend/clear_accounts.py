import os
import sys

# Ensure backend directory is in python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from database import SessionLocal
import models

def clear_all_student_data():
    db = SessionLocal()
    try:
        print("[*] Iniciando limpieza total de registros de alumnos...")
        
        # Orden de eliminación (hijos primero para evitar errores de FK en DBs con restricciones activas)
        # Aunque SQLite a menudo no las tiene activas por defecto, es buena práctica.
        
        db.query(models.FactRegistration).delete()
        db.query(models.FactEnrollment).delete()
        db.query(models.FactStepCompletion).delete()
        db.query(models.FactDocumentGeneration).delete()
        db.query(models.FactDocumentUpload).delete()
        db.query(models.FactMessage).delete()
        db.query(models.FactChangeRequest).delete()
        db.query(models.FactAuditLog).delete()
        
        db.query(models.OpsStudentProgress).delete()
        db.query(models.OpsStudentEnrollment).delete()
        db.query(models.OpsUploadStatus).delete()
        db.query(models.OpsStudentInterest).delete()
        
        # Finalmente los alumnos
        db.query(models.OpsStudent).delete()
        
        # Resetear disponibilidad de programas
        db.execute(text("UPDATE ops_program_availability SET used_slots = 0, available_slots = max_slots, is_full = 0"))
        
        # Eliminar archivos físicos generados y subidos (opcional pero recomendado para limpieza total)
        # generated_pdfs/ y uploads/
        
        db.commit()
        print("[OK] Todos los registros de alumnos han sido eliminados y los cupos reiniciados.")
        
    except Exception as e:
        db.rollback()
        print(f"[!] Error durante la limpieza: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    clear_all_student_data()
