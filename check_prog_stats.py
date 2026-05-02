import sqlite3

db_path = "BUAP-SS-y-PP/backend/buap_ss_pp.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT career_id, count(*) FROM dim_programs GROUP BY career_id")
stats = cursor.fetchall()
for s in stats:
    print(f"Career ID: {s[0]}, Count: {s[1]}")
conn.close()
