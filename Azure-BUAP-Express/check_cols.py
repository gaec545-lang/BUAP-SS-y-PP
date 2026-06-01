import sqlalchemy
from database import engine

def check():
    connection = engine.connect()
    try:
        res = connection.execute(sqlalchemy.text("SELECT TOP 0 * FROM dim_programs"))
        print("Columns in dim_programs:", res.keys())
    except Exception as e:
        print(f"Error checking columns: {e}")
    finally:
        connection.close()

if __name__ == "__main__":
    check()
