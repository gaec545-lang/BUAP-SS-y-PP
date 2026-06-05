import os
import sys

# Ensure backend directory is in python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from sqlalchemy.orm import Session
from database import SessionLocal
import models

def reset_progress():
    db = SessionLocal()
    try:
        db.query(models.FactDocumentUpload).delete()
        if hasattr(models, "FactStepCompletion"):
            db.query(models.FactStepCompletion).delete()
        if hasattr(models, "FactReview"):
            db.query(models.FactReview).delete()
            
        db.query(models.FactEnrollment).delete()
        db.query(models.OpsStudentEnrollment).delete()
        db.query(models.OpsStudentProgress).delete()
        
        # Reset available slots
        db.execute(text("UPDATE ops_program_availability SET used_slots = 0, available_slots = max_slots, is_full = 0"))
        
        db.commit()
        print("[OK] All student progress has been accurately erased.")
    except Exception as e:
        db.rollback()
        print(f"[!] Error resetting progress: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    reset_progress()
