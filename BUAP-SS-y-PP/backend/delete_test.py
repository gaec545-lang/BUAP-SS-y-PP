import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
import models

def delete_tests():
    db = SessionLocal()
    try:
        # Delete by email or matricula
        test_emails = ["test@alumno.buap.mx", "test1@alumno.buap.mx", "test@test.com", "test1@test.com", "test", "test1"]
        students = db.query(models.OpsStudent).filter(
            models.OpsStudent.email.in_(test_emails) |
            models.OpsStudent.first_name.ilike('test%') |
            models.OpsStudent.matricula.in_(['test', 'test1'])
        ).all()
        
        for s in students:
            db.query(models.FactEnrollment).filter(models.FactEnrollment.student_id == s.id).delete()
            db.query(models.OpsStudentEnrollment).filter(models.OpsStudentEnrollment.student_id == s.id).delete()
            db.query(models.OpsStudentProgress).filter(models.OpsStudentProgress.student_id == s.id).delete()
            db.query(models.OpsStudentInterest).filter(models.OpsStudentInterest.student_id == s.id).delete()
            db.query(models.OpsUploadStatus).filter(models.OpsUploadStatus.student_id == s.id).delete()
            db.delete(s)
            
        users = db.query(models.OpsAdminUser).filter(models.OpsAdminUser.username.in_(['test', 'test1'])).all()
        for u in users:
            db.delete(u)
            
        db.commit()
        print(f"Deleted {len(students)} students and {len(users)} admin users.")
        
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    delete_tests()
