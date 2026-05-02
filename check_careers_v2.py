import sqlite3

db_path = "BUAP-SS-y-PP/backend/buap_ss_pp.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT id, code, length(code) FROM dim_careers")
careers = cursor.fetchall()
for c in careers:
    print(f"ID: {c[0]}, Code: '{c[1]}', Length: {c[2]}")
conn.close()
