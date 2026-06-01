import os
import sqlalchemy
from database import engine

def migrate():
    with engine.begin() as connection:
        print("Conectado a la base de datos...")
        
        try:
            # Añadir responsible_name
            print("Añadiendo columna responsible_name a dim_programs...")
            connection.execute(sqlalchemy.text("ALTER TABLE dim_programs ADD responsible_name NVARCHAR(500) NULL"))
            print("Columna responsible_name añadida.")
        except Exception as e:
            print(f"Nota: No se pudo añadir responsible_name: {e}")

        try:
            # Añadir responsible_position
            print("Añadiendo columna responsible_position a dim_programs...")
            connection.execute(sqlalchemy.text("ALTER TABLE dim_programs ADD responsible_position NVARCHAR(500) NULL"))
            print("Columna responsible_position añadida.")
        except Exception as e:
            print(f"Nota: No se pudo añadir responsible_position: {e}")

    print("Migración completada.")

if __name__ == "__main__":
    migrate()
