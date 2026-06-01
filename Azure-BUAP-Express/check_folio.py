import sqlalchemy
from database import engine

def check():
    connection = engine.connect()
    try:
        res = connection.execute(sqlalchemy.text("SELECT id, folio, name FROM dim_programs WHERE folio LIKE '%239320%'"))
        rows = res.fetchall()
        print(f"Found {len(rows)} programs with folio 239320")
        for r in rows:
            print(r)
            
        if not rows:
            res = connection.execute(sqlalchemy.text("SELECT TOP 5 folio FROM dim_programs"))
            print("Sample folios in DB:", res.fetchall())
    finally:
        connection.close()

if __name__ == "__main__":
    check()
