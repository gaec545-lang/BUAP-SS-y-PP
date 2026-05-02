# Documentación del Sistema BUAP: Servicio Social y Práctica Profesional (V3)

**Desarrollado por:** Evangelista & Co.
**Cliente:** BUAP (Coordinación de Prácticas Profesionales y Comunicación - Facultad de Administración)

Este documento describe la arquitectura, estructura de carpetas y funciones principales del sistema de gestión de Servicio Social (SS) y Práctica Profesional (PP) desarrollado para la BUAP.

---

## 1. Arquitectura General

El sistema está dividido en dos grandes bloques bajo un patrón de arquitectura Cliente-Servidor:
*   **Frontend (Cliente):** Desarrollado como una Single Page Application (SPA) utilizando **React, TypeScript y Vite**. El diseño y estilado se apoya fuertemente en TailwindCSS.
*   **Backend (Servidor):** Desarrollado como una API RESTful utilizando **Python y FastAPI**. Utiliza **SQLAlchemy** como ORM para la interacción con la base de datos (actualmente SQLite, estructurada para soportar Business Intelligence).

---

## 2. Estructura del Proyecto

El repositorio principal (`BUAP-SS-y-PP`) contiene las siguientes carpetas clave:

### 2.1. Backend (`/backend`)
Contiene toda la lógica de negocio, reglas de validación, generación de documentos y conexión a la base de datos.

*   **`main.py`**: Punto de entrada de la aplicación FastAPI. Configura los middlewares (CORS), inicializa la base de datos y registra las rutas (routers).
*   **`models.py`**: Define la estructura de la base de datos siguiendo una arquitectura de Inteligencia de Negocios (BI):
    *   *Capas `Dim` (Dimensiones)*: Catálogos maestros (Carreras, Modalidades, Periodos, Programas, etc.).
    *   *Capas `Fact` (Hechos)*: Tablas *append-only* para historial y auditoría (Registro, Subida de documentos, Aprobaciones).
    *   *Capas `Ops` (Operativas)*: Tablas transaccionales para mantener el estado actual (Progreso del estudiante, Disponibilidad de cupos, Intereses/Folios).
*   **`database.py`**: Configuración del motor de SQLAlchemy y gestión de sesiones con la base de datos `buap_ss_pp.db`.
*   **`seed.py`**: Script utilizado para poblar la base de datos con información inicial (carreras, procesos predeterminados, usuarios administradores).
*   **`dependencies.py`**: Funciones inyectables de FastAPI, principalmente utilizadas para la autenticación y validación de tokens JWT.
*   **`/routers/`**: Controladores que exponen los Endpoints de la API, organizados por dominio:
    *   `auth.py`: Manejo de inicio de sesión y registro.
    *   `students.py`: Endpoints consumidos por los alumnos (perfil, progreso, selección de folios y citas).
    *   `admin.py`: Endpoints para el panel de administración (gestión de programas, revisión de documentos, métricas).
    *   `document_router.py`: Se encarga de recibir las peticiones para la generación de PDFs (Cartas de Presentación, Confidencialidad).
    *   `upload_router.py`: Maneja la recepción de archivos y validación del almacenamiento local (`/uploads`).
*   **`/services/`**: Lógica compleja separada de los controladores.
    *   `pdf_generator.py`: Motor de generación de documentos. Combina plantillas PDF preexistentes (`/templates`) rellenadas dinámicamente mediante la librería `fitz` (PyMuPDF) o generados desde cero con `reportlab`.
*   **`/templates/`**: Almacena los formatos base en PDF (ej. Carta de Asignación, Carta de Confidencialidad) proporcionados por la coordinación.

### 2.2. Frontend (`/src`)
Contiene la interfaz de usuario con la que interactúan tanto los alumnos como los administradores.

*   **`App.tsx` & `main.tsx`**: Puntos de entrada de React. Configuran el enrutamiento principal (React Router) definiendo las rutas públicas, del alumno y protegidas para el administrador.
*   **`/pages/`**: Vistas completas (Páginas) de la aplicación.
    *   **`/student/`**: Componentes que arman el panel del estudiante.
        *   `StudentDashboard.tsx`: Panel principal.
        *   `ProcessPanel.tsx`: Motor de renderizado del "Checklist" de pasos. Renderiza dinámicamente componentes como `FolioAppointmentStep`, `CpaDownloaderStep`, o `MultiDocsUploadStep` basándose en el progreso del alumno.
        *   `FolioAppointmentStep.tsx` / `FolioSearchStep.tsx`: Interfaces para que el estudiante busque su programa, arme su carrito de folios y confirme su selección ("A quien corresponda").
        *   `ProcessChoiceStep.tsx`: Paso crítico donde el estudiante selecciona si cursará Servicio Social o Práctica Profesional.
    *   **`/admin/`**: Panel de control administrativo.
        *   `AdminLayout.tsx`: Estructura base (barra de navegación lateral) para el administrador.
        *   `AdminDashboardPage.tsx`: Vista general con métricas.
        *   `AdminProgramsPage.tsx`: Interfaz (MVP) para la carga masiva de programas aceptados vía archivos Excel/CSV.
*   **`/services/`**:
    *   `api.ts`: Cliente HTTP (fetch wrapper) configurado para comunicarse de manera estándar con el backend en `localhost:8000/api`. Maneja la inyección de tokens de autorización y peticiones estructuradas.
*   **`/data/`**:
    *   `processes.ts`: Definición estática/maestra de los pasos del checklist para el frontend (nombres de los pasos, descripciones visuales, y banderas lógicas).
*   **`/components/`**: Componentes visuales reutilizables (Botones, Modales, Alertas) diseñados para mantener la consistencia estética usando TailwindCSS.

---

## 3. Flujo Principal de Trabajo (Checklist del Alumno)

El núcleo del sistema es acompañar al alumno paso a paso:
1.  **Registro**: El alumno se da de alta proporcionando su matrícula, correo, carrera y *Plan de Estudios* (semestral/cuatrimestral).
2.  **Selección de Proceso**: Decide entre Servicio Social y Práctica Profesional.
3.  **Búsqueda de Folio**: Busca el folio oficial proporcionado por la universidad y lo añade a su interés.
4.  **Confirmación y Detalles de Cita**: El alumno acepta el folio y proporciona a quién va dirigida la carta ("A quien corresponda"). Estos datos persisten automáticamente.
5.  **Generación de Documentos**: El alumno descarga formatos generados dinámicamente por el Backend (ej. CPA - Carta de Presentación y Aceptación), listos para firmar.
6.  **Subida de Documentos (Kárdex, IMSS, Firmas)**: Sube los documentos solicitados. El Backend los almacena de forma segura.
7.  **Validación**: La coordinación (Admin) recibe notificaciones, revisa los documentos en el panel de administración y los Aprueba o Rechaza (con retroalimentación).
8.  **Completado**: El proceso se marca como finalizado.

## 4. Notas de Operación y Despliegue Local

*   **Levantar el Backend**: Ubicarse en `/backend` y ejecutar `python -m uvicorn main:app --reload`. Corre en el puerto `8000`.
*   **Levantar el Frontend**: Ubicarse en el root y ejecutar `npm run dev`. Corre típicamente en el puerto `5173`.
*   **Base de datos**: En la fase actual de desarrollo se usa SQLite (`buap_ss_pp.db`). Las alteraciones estructurales recientes se aplicaron directamente, pero se recomienda consolidarlas mediante Alembic para entornos de producción.
*   **Panel Administrativo**: Accesible mediante credenciales predefinidas en el script `seed.py` (Ej. `coordinador` / `admin2026`).
