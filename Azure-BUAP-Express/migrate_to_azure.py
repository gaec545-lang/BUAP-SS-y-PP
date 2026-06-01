import pandas as pd
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv
import sys

# Load environment variables
load_dotenv()

# ─────────────────────────────────────────────────────────────────────────────
# DB Configuration
# ─────────────────────────────────────────────────────────────────────────────
SQLITE_DB = "buap_ss_pp.db"

# Import validated engine from database.py
from database import engine as azure_engine

# Engines
# We still need sqlite_engine to read the source data locally
sqlite_engine = create_engine(f"sqlite:///{SQLITE_DB}")


# ─────────────────────────────────────────────────────────────────────────────
# Table Migration Order (Respecting Foreign Keys)
# ─────────────────────────────────────────────────────────────────────────────
TABLES_TO_MIGRATE = [
    # Layer 1 — Dimensions & Base Tables
    "dim_careers",
    "dim_modalities",
    "dim_periods",
    "dim_process_definitions",
    "dim_document_types",
    "dim_system_config",
    "ops_admin_users",
    "fact_approval_actions",
    "fact_audit_log",
    "deadlines",
    
    # Layer 2 — Dependency Level 1
    "dim_process_steps",        # deps on dim_process_definitions
    "dim_programs",             # deps on dim_careers, dim_periods
    "ops_students",             # deps on dim_careers, dim_modalities
    "fact_registrations",       # deps on dim_careers, dim_modalities
    
    # Layer 3 — Dependency Level 2 (Student & Program Facts)
    "ops_student_progress",     # deps on ops_students, dim_process_definitions
    "fact_enrollments",         # deps on ops_students, dim_programs, dim_periods
    "fact_step_completions",    # deps on ops_students, dim_process_definitions
    "fact_document_generations",# deps on ops_students, dim_document_types, dim_process_definitions
    "fact_document_uploads",    # deps on ops_students, dim_document_types, dim_process_definitions
    "fact_messages",            # deps on ops_students, dim_process_definitions
    "fact_change_requests",     # deps on ops_students, dim_programs
    
    # Layer 4 — Operational State & Mixed Dependencies
    "ops_student_enrollments",  # deps on ops_students, dim_programs, dim_periods
    "ops_upload_status",        # deps on ops_students, dim_document_types, fact_document_uploads
    "ops_program_availability", # deps on dim_programs
    "ops_student_interests",    # deps on ops_students, dim_programs
]

def migrate_data():
    print("🚀 Starting Data Migration to Azure SQL Database...")
    
    for table in TABLES_TO_MIGRATE:
        print(f"📦 Migrating table: {table}...", end=" ", flush=True)
        try:
            # 1. Read from SQLite
            df = pd.read_sql_table(table, sqlite_engine)
            
            if df.empty:
                print("⚠️ [Empty, skipping]")
                continue
            
            # 2. Write to Azure with Identity Insert handling
            # We use a single transaction per table
            with azure_engine.begin() as conn:
                # Enable Identity Insert to keep original IDs
                conn.execute(text(f"SET IDENTITY_INSERT {table} ON"))
                
                # Insert data
                # method='multi' is faster for small/medium datasets in MSSQL
                df.to_sql(table, conn, if_exists='append', index=False)
                
                # Disable Identity Insert
                conn.execute(text(f"SET IDENTITY_INSERT {table} OFF"))
                
            print(f"✅ [Done: {len(df)} rows]")
            
        except Exception as e:
            print(f"❌ [Error: {str(e)}]")
            # Option: sys.exit(1) if we want to stop on first error
            continue

    print("\n🎉 Migration process finished.")

if __name__ == "__main__":
    migrate_data()
