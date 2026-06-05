import sqlite3

def check_user(email):
    conn = sqlite3.connect('buap_ss_pp.db')
    cursor = conn.cursor()
    
    print(f"Checking for user: {email}")
    
    # Check ops_students
    cursor.execute("SELECT * FROM ops_students WHERE email = ?", (email,))
    student = cursor.fetchone()
    if student:
        print(f"Found in ops_students: {student}")
    else:
        print("Not found in ops_students")
        
    # Check fact_registrations
    cursor.execute("SELECT * FROM fact_registrations WHERE email_user || '@' || email_domain = ?", (email,))
    reg = cursor.fetchone()
    if reg:
        print(f"Found in fact_registrations: {reg}")
    else:
        print("Not found in fact_registrations")
        
    conn.close()

if __name__ == "__main__":
    check_user('test@alumno.buap.mx')
