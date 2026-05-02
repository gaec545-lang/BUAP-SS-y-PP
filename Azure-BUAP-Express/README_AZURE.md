# 🚀 Guía de Migración a Azure — BUAP Express

Este directorio ha sido organizado para una migración limpia a **Azure App Service** o **Azure Kubernetes Service (AKS)**.

## 📂 Estructura del Proyecto
- `/backend`: API en FastAPI (Python).
- `/frontend`: Aplicación React (Vite).

## 🐳 Despliegue con Docker (Recomendado)

He incluido una configuración base de Docker para facilitar el despliegue.

### 1. Backend (Python/FastAPI)
El backend está configurado para ejecutarse en el puerto 8000. Asegúrate de configurar las variables de entorno en Azure:
- `DATABASE_URL`: `sqlite:///./database.db` (o una conexión a Azure SQL/PostgreSQL si decides migrar la DB).

### 2. Frontend (React/Vite)
El frontend debe compilarse y servirse. Nota: Debes actualizar la URL del backend en `src/services/api.ts` o usar una variable de entorno de Vite (`VITE_API_URL`) antes de compilar para producción.

---

## 🛠️ Pasos para Azure App Service

1. **Crear un App Service para el Backend:**
   - Runtime: Python 3.11+.
   - Startup Command: `uvicorn main:app --host 0.0.0.0 --port 8000`.

2. **Crear un App Service para el Frontend:**
   - Runtime: Node.js o Despliegue de Carpeta Estática (Nginx).
   - Asegúrate de ejecutar `npm run build` y subir el contenido de la carpeta `dist`.

3. **Configurar CORS:**
   - En el App Service del Backend, añade la URL del Frontend a la configuración de CORS de Azure o directamente en el código de `main.py`.

---

## 📝 Notas Importantes
- **Base de Datos:** El proyecto actualmente usa SQLite (`buap_ss_pp.db`). Para Azure, se recomienda usar **Azure SQL Database** o **Azure Database for PostgreSQL** para mayor persistencia y escalabilidad.
- **Archivos Subidos:** Los PDFs se guardan localmente en `generated_pdfs/` y `uploads/`. En Azure App Service, estos archivos se perderán si el contenedor se reinicia a menos que uses **Azure Storage** o **Azure Files** montado como volumen.
