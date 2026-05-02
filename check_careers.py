import sqlite3
import os

# Find the database path
db_path = "BUAP-SS-y-PP/backend/buap_ss_pp.db"

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM dim_careers")
    careers = cursor.fetchall()
    print("Careers in database:")
    for c in careers:
        print(c)
    conn.close()
