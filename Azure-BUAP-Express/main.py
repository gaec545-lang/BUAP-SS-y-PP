from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from database import Base, engine
from routers import auth, students, admin, deadlines, developer
from routers import upload_router, message_router, registration_router, document_router, validate_router

Base.metadata.create_all(bind=engine)

os.makedirs("generated_pdfs", exist_ok=True)
os.makedirs("uploads", exist_ok=True)

app = FastAPI(
    title="BUAP SS/PP API",
    description="Sistema de Gestión de Servicio Social y Práctica Profesional — v3",
    version="3.0.0"
)

origins = [
    "https://brave-hill-0bee2ed0f.7.azurestaticapps.net",
    "https://brave-hill-0bee2ed0f.7.azurestaticapps.net/",
    "https://brave-hill-0bec2cd0f.7.azurestaticapps.net",
    "https://brave-hill-0bec2cd0f.7.azurestaticapps.net/",
    "http://localhost:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
