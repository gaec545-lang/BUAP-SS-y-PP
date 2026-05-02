import sqlite3

db_path = "BUAP-SS-y-PP/backend/buap_ss_pp.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check if SLAE exists
cursor.execute("SELECT * FROM dim_careers WHERE code='SLAE'")
if not cursor.fetchone():
    print("Adding SLAE career...")
    cursor.execute("INSERT INTO dim_careers (code, name, full_code, is_active) VALUES ('SLAE', 'Administración de Empresas (Semiescolarizado)', 'Administración de Empresas-SEMI(SLAE) 7', 1)")
    conn.commit()
else:
    print("SLAE already exists.")

conn.close()
