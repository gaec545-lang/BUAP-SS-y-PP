import os
from sqlalchemy import text
from database import engine

def migrate():
    with engine.connect() as conn:
        # Find the unique constraint name for 'folio' column in 'dim_programs'
        find_constraint_sql = text("""
        SELECT tc.CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
        JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu 
            ON tc.CONSTRAINT_NAME = ccu.CONSTRAINT_NAME
        WHERE tc.TABLE_NAME = 'dim_programs' 
          AND ccu.COLUMN_NAME = 'folio' 
          AND tc.CONSTRAINT_TYPE = 'UNIQUE';
        """)
        
        result = conn.execute(find_constraint_sql)
        row = result.fetchone()
        
        if row:
            constraint_name = row[0]
            print(f"Found existing unique constraint: {constraint_name}. Dropping it...")
            drop_sql = text(f"ALTER TABLE dim_programs DROP CONSTRAINT {constraint_name};")
            conn.execute(drop_sql)
            print("Dropped successfully.")
        else:
            print("No existing unique constraint found on 'folio'.")

        # Try to add the new composite constraint (ignoring if it already exists)
        try:
            print("Adding new composite unique constraint 'uq_folio_career'...")
            add_sql = text("""
            ALTER TABLE dim_programs 
            ADD CONSTRAINT uq_folio_career UNIQUE (folio, career_id);
            """)
            conn.execute(add_sql)
            print("Added successfully.")
        except Exception as e:
            if 'already exists' in str(e).lower() or 'there is already an object named' in str(e).lower():
                print("Composite constraint already exists.")
            else:
                print(f"Warning adding constraint: {e}")
        
        conn.commit()

if __name__ == "__main__":
    migrate()
