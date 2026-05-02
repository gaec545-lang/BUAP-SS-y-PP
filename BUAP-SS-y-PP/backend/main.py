from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from database import Base, engine
from routers import auth, students, admin, deadlines
from routers import upload_router, message_router, registration_router, document_router

Base.metadata.create_all(bind=engine)

os.makedirs("generated_pdfs", exist_ok=True)
os.makedirs("uploads", exist_ok=True)

app = FastAPI(
    title="BUAP SS/PP API",
    description="Sistema de Gestión de Servicio Social y Práctica Profesional — v3",
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://localhost:5174", 
        "http://localhost:5172",
        "http://localhost:3000",
        "http://localhost:7152",
        "http://localhost:7153"
    ],
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
