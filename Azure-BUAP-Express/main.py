from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import json
import os
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from database import Base, engine
from routers import auth, students, admin, deadlines, developer
from routers import upload_router, message_router, registration_router, document_router, validate_router

Base.metadata.create_all(bind=engine)

def run_migrations():
    import sqlalchemy
    from sqlalchemy import text
    try:
        with engine.begin() as connection:
            # Columns to add to fact_document_uploads
            columns_uploads = [
                ("confidence", "FLOAT NULL"),
                ("read_status", "NVARCHAR(50) NULL"),
                ("folio", "NVARCHAR(100) NULL"),
                ("admin_rejection_message", "NVARCHAR(MAX) NULL"),
                ("confidence_score", "FLOAT NULL"),
                ("validation_observations", "NVARCHAR(MAX) NULL")
            ]
            for col_name, col_type in columns_uploads:
                try:
                    connection.execute(text(f"ALTER TABLE fact_document_uploads ADD {col_name} {col_type}"))
                    print(f"Migration: Column {col_name} added to fact_document_uploads")
                except Exception:
                    # Column already exists or error
                    pass

            # Columns to add to fact_validation_runs
            columns_runs = [
                ("overall_confidence", "FLOAT NULL"),
                ("read_status", "NVARCHAR(50) NULL")
            ]
            for col_name, col_type in columns_runs:
                try:
                    connection.execute(text(f"ALTER TABLE fact_validation_runs ADD {col_name} {col_type}"))
                    print(f"Migration: Column {col_name} added to fact_validation_runs")
                except Exception:
                    # Column already exists or error
                    pass
    except Exception as e:
        print(f"Migration failed: {e}")

run_migrations()

os.makedirs("generated_pdfs", exist_ok=True)
os.makedirs("uploads", exist_ok=True)

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="BUAP SS/PP API",
    description="Sistema de Gestión de Servicio Social y Práctica Profesional — v3",
    version="3.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

default_origins = [
    "https://brave-hill-0bee2ed0f.7.azurestaticapps.net",
    "https://brave-hill-0bec2cd0f.7.azurestaticapps.net",
    "http://localhost:5173",
    "http://localhost:3000",
]

env_origins = []
cors_origins_str = os.getenv("CORS_ORIGINS")
if cors_origins_str:
    try:
        env_origins = json.loads(cors_origins_str)
    except json.JSONDecodeError:
        env_origins = [origin.strip() for origin in cors_origins_str.split(",") if origin.strip()]

allow_origins = list({origin.rstrip("/") for origin in (default_origins + env_origins)})

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "X-Evangelista-Secure", "Authorization", "Content-Type"],
)


app.include_router(auth.router)
app.include_router(students.router)
app.include_router(admin.router)
app.include_router(deadlines.router)
app.include_router(upload_router.router)
app.include_router(message_router.router)
app.include_router(document_router.router)
app.include_router(developer.router)
app.include_router(validate_router.router, prefix="/api/validate", tags=["validate"])



@app.get("/health")
def health():
    return {"status": "ok", "service": "BUAP SS/PP API v3"}
