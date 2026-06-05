from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import json

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from database import Base, engine
from routers import auth, students, admin, deadlines
from routers import upload_router, message_router, registration_router, document_router

Base.metadata.create_all(bind=engine)

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

cors_origins_str = os.getenv("CORS_ORIGINS")
if cors_origins_str:
    try:
        allow_origins = json.loads(cors_origins_str)
    except json.JSONDecodeError:
        allow_origins = [origin.strip() for origin in cors_origins_str.split(",") if origin.strip()]
else:
    allow_origins = [
        "http://localhost:5173", 
        "http://localhost:5174", 
        "http://localhost:5172",
        "http://localhost:3000",
        "http://localhost:7152",
        "http://localhost:7153"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(students.router)
app.include_router(admin.router)
app.include_router(deadlines.router)
app.include_router(upload_router.router)
app.include_router(message_router.router)
app.include_router(document_router.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "BUAP SS/PP API v3"}
