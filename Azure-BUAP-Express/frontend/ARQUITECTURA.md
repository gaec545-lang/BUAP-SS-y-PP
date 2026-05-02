# 🏛️ BUAP SS/PP — Mapa Arquitectónico del Sistema
> Sistema de Gestión de Servicio Social y Práctica Profesional  
> Versión: **3.0.0** | Última revisión: Abril 2026

---

## 📐 Visión General

```
┌──────────────────────────────────────────────────────────┐
│               FRONTEND  (React + Vite)                   │
│                 localhost:5173                           │
│  Alumno Dashboard  ←──────→  Panel Admin                │
└──────────────────────┬───────────────────────────────────┘
                       │ HTTP/REST
                       ▼
┌──────────────────────────────────────────────────────────┐
│              BACKEND  (FastAPI + Python)                  │
│                 localhost:8000                           │
│   Routers → Services → Models → SQLite DB               │
└──────────────────────────────────────────────────────────┘
```

| Capa        | Tecnología Principal            | Puerto |
|-------------|--------------------------------|--------|
| **Frontend**| React 19 + TypeScript + TailwindCSS + Vite 8 | 5173 |
| **Backend** | FastAPI 0.115 + Uvicorn + SQLAlchemy 2.0 | 8000 |
| **Base de datos** | SQLite (`buap_ss_pp.db`) | — |

---

## 🗂️ Estructura de Directorios

```
BUAP-SS-y-PP/
├── backend/                    ← API Python
│   ├── main.py                 ← Punto de entrada FastAPI
│   ├── database.py             ← Engine SQLite + log_action() + rebuild_ops_from_facts()
│   ├── models.py               ← 16 modelos SQLAlchemy (3 capas: DIM / FACT / OPS)
│   ├── schemas.py              ← Schemas Pydantic para validación
│   ├── auth.py                 ← Utilidades JWT
│   ├── dependencies.py         ← get_current_student / get_current_admin
│   ├── seed.py                 ← Datos iniciales: carreras, procesos, programas, admin
│   ├── requirements.txt        ← Dependencias Python
│   ├── routers/
│   │   ├── auth.py             ← Login / registro
│   │   ├── students.py         ← Alumno: perfil, intereses, progreso, folios
│   │   ├── admin.py            ← Panel admin: inscripciones, programas, config
│   │   ├── upload_router.py    ← Subida y revisión de documentos
│   │   ├── document_router.py  ← Generación de PDFs oficiales
│   │   ├── message_router.py   ← Mensajería coordinación ↔ alumno
│   │   └── deadlines.py        ← Fechas límite y avisos
│   ├── services/
│   │   ├── pdf_generator.py    ← Motor de generación y aplanamiento de PDFs
│   │   ├── audit_engine.py     ← Motor de auditoría de acciones
│   │   └── process_engine.py   ← Motor de avance de pasos del proceso
│   ├── templates/              ← Plantillas PDF oficiales (6 archivos)
│   ├── generated_pdfs/         ← PDFs generados para alumnos
│   └── uploads/                ← Documentos subidos por alumnos
│
└── src/                        ← Aplicación React
    ├── App.tsx                 ← Router principal (React Router DOM)
    ├── main.tsx                ← Punto de entrada React
    ├── services/api.ts         ← Todas las llamadas HTTP al backend
    ├── context/StudentContext.tsx ← Estado global del alumno (token, perfil)
    ├── data/
    │   ├── processes.ts        ← Definición de los 10 pasos del proceso
    │   ├── documents.ts        ← Tipos de documentos esperados
    │   ├── students.ts         ← Datos mock / tipos
    │   └── deadlines.ts        ← Estructura de fechas límite
    ├── types/index.ts          ← Interfaces TypeScript globales
    ├── hooks/
    │   ├── useCountUp.ts       ← Animaciones de contadores
    │   └── usePrefersReducedMotion.ts ← Accesibilidad de animaciones
    ├── components/             ← Componentes compartidos (13)
    └── pages/
        ├── LoginPage.tsx       ← Login alumno / admin
        ├── RegisterPage.tsx    ← Auto-registro de alumnos
        ├── student/            ← Módulo alumno (10 archivos)
        └── admin/              ← Módulo admin (9 archivos)
```

---

## 🐍 Backend — Python

### Librerías Instaladas (`requirements.txt`)

| Librería | Versión | Uso |
|----------|---------|-----|
| `fastapi` | 0.115.0 | Framework HTTP principal |
| `uvicorn[standard]` | 0.30.6 | Servidor ASGI |
| `sqlalchemy` | 2.0.35 | ORM / consultas a DB |
| `pydantic` | 2.9.2 | Validación de datos / schemas |
| `python-jose[cryptography]` | 3.3.0 | Generación y verificación JWT |
| `passlib[bcrypt]` | 1.7.4 | Hash de contraseñas |
| `bcrypt` | 4.0.1 | Algoritmo bcrypt |
| `reportlab` | 4.2.2 | Generación de PDFs con código (fallback) |
| `python-multipart` | 0.0.9 | Carga de archivos (`UploadFile`) |
| `openpyxl` | 3.1.5 | Exportación a Excel |
| `pymupdf` | 1.27.2.2 | ⭐ Motor militar de PDFs (lectura, inyección y aplanamiento) |
| `pytesseract` | 0.3.13 | OCR Python (instalado, pendiente integración) |

> **Sistema:** Tesseract OCR 5.4.0 instalado en el host Windows (requerido por `pytesseract`).

---

### Modelos de Base de Datos (`models.py`)

Organizado en 3 capas arquitectónicas:

#### 🟦 Capa DIM — Tablas de Dimensión (catálogos)
| Modelo | Tabla | Descripción |
|--------|-------|-------------|
| `DimCareer` | `dim_careers` | Carreras universitarias |
| `DimModality` | `dim_modalities` | Modalidades (escolarizado, a distancia) |
| `DimPeriod` | `dim_periods` | Periodos académicos |
| `DimProgram` | `dim_programs` | Programas SS/PP con folio, dependencia y cupos |
| `DimProcessDefinition` | `dim_process_definitions` | Procesos (SS, PP, etc.) |
| `DimProcessStep` | `dim_process_steps` | Pasos de cada proceso (1-10) |
| `DimDocumentType` | `dim_document_types` | Tipos de documentos (generado / alumno) |
| `DimSystemConfig` | `dim_system_config` | Configuración global del sistema |

#### 🟨 Capa FACT — Tablas de Hechos (append-only)
| Modelo | Tabla | Descripción |
|--------|-------|-------------|
| `FactRegistration` | `fact_registrations` | Pre-registro de alumnos |
| `FactEnrollment` | `fact_enrollments` | Inscripción formal a programas |
| `FactStepCompletion` | `fact_step_completions` | Historial de pasos completados |
| `FactDocumentGeneration` | `fact_document_generations` | PDFs generados (folio único) |
| `FactDocumentUpload` | `fact_document_uploads` | Documentos subidos por alumnos |
| `FactApprovalAction` | `fact_approval_actions` | Aprobaciones/rechazos de la coordinación |
| `FactMessage` | `fact_messages` | Mensajes coordinación ↔ alumno |
| `FactChangeRequest` | `fact_change_requests` | Solicitudes de cambio/baja de programa |
| `FactAuditLog` | `fact_audit_log` | Registro completo de todas las acciones |

#### 🟩 Capa OPS — Tablas Operativas (estado actual)
| Modelo | Tabla | Descripción |
|--------|-------|-------------|
| `OpsStudent` | `ops_students` | Alumnos activos (perfil completo) |
| `OpsStudentProgress` | `ops_student_progress` | Paso actual del alumno en cada proceso |
| `OpsStudentEnrollment` | `ops_student_enrollments` | Inscripción operativa vigente |
| `OpsUploadStatus` | `ops_upload_status` | Estado actual de cada documento subido |
| `OpsProgramAvailability` | `ops_program_availability` | Cupos disponibles en tiempo real |
| `OpsAdminUser` | `ops_admin_users` | Usuarios admin con roles |
| `OpsStudentInterest` | `ops_student_interests` | Folios guardados como interés por el alumno |
| `Deadline` | `deadlines` | Fechas límite con avisos a alumnos |

---

### Routers / Endpoints

#### `routers/auth.py` — Prefijo: `/api/auth`
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/login` | Login alumno/admin → JWT |
| POST | `/register` | Registro de nuevo alumno |

#### `routers/students.py` — Prefijo: `/api/student`
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/me` | Perfil completo del alumno autenticado |
| GET | `/progress` | Progreso actual en cada proceso |
| GET, POST | `/interests` | Ver y guardar folios de interés |
| PATCH | `/interests/{id}` | Marcar cita aceptada en un folio |
| GET | `/available-programs` | Programas con cupos disponibles filtrados |
| GET | `/change-requests` | Solicitudes de cambio/baja |
| POST | `/change-requests` | Crear solicitud de cambio/baja |

#### `routers/upload_router.py` — Prefijo: `/api/uploads`
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/submit` | Subir documento (PDF/JPG/PNG, max 10MB) |
| GET | `/my-uploads` | Lista de documentos subidos por el alumno |
| GET | `/my-uploads/{code}` | Historial de intentos de un documento |
| GET | `/pending` | (Admin) Documentos pendientes de revisión |
| GET | `/student/{id}` | (Admin) Uploads de un alumno específico |
| GET | `/{id}/file` | (Admin) Descargar archivo físico |
| POST | `/{id}/approve` | (Admin) Aprobar documento → auto-avanza paso |
| POST | `/{id}/reject` | (Admin) Rechazar con motivo |

#### `routers/document_router.py` — Prefijo: `/api/documents`
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/generate` | Generar PDF oficial (CPA-SS, CPA-PP, Carta Conf.) |
| GET | `/download/{filename}` | Descargar PDF generado |

#### `routers/admin.py` — Prefijo: `/api/admin`
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/dashboard` | Estadísticas globales |
| GET/POST | `/programs` | CRUD de programas SS/PP |
| GET | `/students` | Lista de alumnos con filtros |
| GET | `/students/{id}` | Detalle completo de un alumno |
| POST | `/enrollments/{id}/validate` | Validar inscripción (aprobada/rechazada) |
| GET/POST | `/config` | Configuración global del sistema |
| GET | `/audit-log` | Historial completo de auditoría |
| GET | `/export/excel` | Exportar datos a Excel (.xlsx) |

#### `routers/message_router.py` — Prefijo: `/api/messages`
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/send` | Enviar mensaje (admin ↔ alumno) |
| GET | `/thread/{student_id}` | Ver hilo por alumno y paso |
| POST | `/{id}/read` | Marcar mensaje como leído |

#### `routers/deadlines.py` — Prefijo: `/api/deadlines`
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Ver fechas límite activas |
| POST | `/` | (Admin) Crear fecha límite |

---

### Servicios (`backend/services/`)

#### `pdf_generator.py` — Motor de PDFs ⭐
El motor más crítico del sistema:

| Función | Descripción |
|---------|-------------|
| `generate_pdf_for_student()` | Dispatcher principal. Detecta el tipo de documento y enruta a PyMuPDF o ReportLab |
| `_fill_template_fitz()` | Motor PyMuPDF: lee plantilla, inyecta datos en campos del formulario |
| `_flatten_page_fitz()` | **Motor de Aplanamiento Físico** — convierte widgets interactivos en píxeles fijos e inaccessibles |
| `_calculate_font_size()` | Escala la fuente dinámicamente para que textos largos no se corten |
| `_generate_cpa_reportlab()` | Fallback: genera CPA desde cero con ReportLab (sin plantilla) |

**Flujo de generación:**
```
Petición POST /generate
    → Lee plantilla PDF oficial (templates/)
    → Extrae campos del formulario (widget.field_name)
    → Inyecta datos del alumno/programa en coordenadas exactas
    → Destruye los widgets interactivos (flattening)
    → Guarda en generated_pdfs/
    → Retorna filename para descarga
```

**Formatos de plantilla usados:**
| Código | Plantilla |
|--------|-----------|
| `DOC-SS-002` | FORMATO GRAL CPA SS.pdf |
| `DOC-PP-002` | FORMATO GRAL CPA-PP.pdf |
| `carta_confidencialidad` | FORMATO GRAL CART CONFIDENCIALIDAD.pdf |

#### `audit_engine.py`
- Registra todas las acciones en `FactAuditLog`
- Funciones: `log_action()` (también disponible en `database.py`)

#### `process_engine.py`
- Lógica de avance automático de pasos
- Funciones: detectar si todos los requisitos de un paso están completos → avanzar `OpsStudentProgress.current_step`

---

### Funciones Utilitarias en `database.py`

| Función | Descripción |
|---------|-------------|
| `get_db()` | Generador de sesión SQLAlchemy (dependency injection) |
| `log_action()` | Escribe entrada en `FactAuditLog` con contexto completo |
| `rebuild_ops_from_facts()` | **Recuperación en caliente** — reconstruye todas las tablas OPS desde las FACT en caso de desincronización |

---

## ⚛️ Frontend — React + TypeScript

### Librerías de Producción (`package.json`)

| Librería | Versión | Uso |
|----------|---------|-----|
| `react` | 19.2.4 | UI principal |
| `react-dom` | 19.2.4 | Renderizado DOM |
| `react-router-dom` | 7.13.1 | Ruteo SPA |
| `framer-motion` | 12.38.0 | Animaciones fluidas |
| `lucide-react` | 0.577.0 | Iconografía (1600+ íconos) |
| `date-fns` | 4.1.0 | Formateo de fechas |
| `jspdf` | 4.2.1 | Generación PDF en el lado cliente |
| `html2canvas` | 1.4.1 | Captura de pantalla a canvas |

### Librerías de Desarrollo

| Librería | Uso |
|----------|-----|
| `vite` 8 | Bundler y servidor de desarrollo |
| `typescript` ~5.9 | Tipado estático |
| `tailwindcss` 3.4 | Framework CSS utility-first |
| `autoprefixer` + `postcss` | Compatibilidad CSS |
| `eslint` 9 + plugins | Linting |

---

### Páginas del Módulo Alumno (`src/pages/student/`)

| Archivo | Descripción |
|---------|-------------|
| `StudentDashboard.tsx` | Shell principal del alumno. Nav lateral, selección de proceso activo |
| `ProcessView.tsx` | Vista del proceso seleccionado. Orquesta procesos y pasos |
| `ProcessPanel.tsx` | Renderiza el paso actual del alumno. Switch de 10 pasos |
| `FolioSearchStep.tsx` | **Paso 4**: Búsqueda de folios por número. Guarda folios como interés |
| `FolioAppointmentStep.tsx` | **Paso 5**: Confirmar citas aceptadas de folios guardados |
| `CpaDownloaderStep.tsx` | **Paso 6**: Ingresar nombre del destinatario y descargar CPA |
| `MultiDocsUploadStep.tsx` | **Paso 9**: Carga de los 4 documentos obligatorios en batch. UI de bloqueo en "En Revisión" |
| `ChangeRequestForm.tsx` | Formulario de solicitud de cambio o baja de programa |
| `ProgramSelector.tsx` | Selector visual de programa definitivo (paso 3) |
| `StudentProfile.tsx` | Perfil y datos del alumno autenticado |

### Páginas del Módulo Admin (`src/pages/admin/`)

| Archivo | Descripción |
|---------|-------------|
| `AdminLayout.tsx` | Shell del panel administrativo con navegación |
| `AdminDashboardPage.tsx` | Estadísticas generales, contadores y métricas |
| `AdminStudentsPage.tsx` | Lista paginada de alumnos con filtros y búsqueda |
| `AdminStudentDetailPage.tsx` | Expediente completo de un alumno (documentos, mensajes, progreso) |
| `AdminUploadsPage.tsx` | Revisión de documentos pendientes. Aprobar / Rechazar |
| `AdminSolicitudesPage.tsx` | Gestión de solicitudes de cambio/baja de programa |
| `AdminConfigPage.tsx` | Configuración del sistema: periodos, programas, tipos de doc |
| `AdminUsersPage.tsx` | Gestión de usuarios administradores |
| `AdminRegistrationsPage.tsx` | Pre-registros de alumnos (stub) |

### Componentes Compartidos (`src/components/`)

| Componente | Descripción |
|------------|-------------|
| `AppShell.tsx` | Layout global con sidebar y topbar |
| `ProcessStepper.tsx` | Barra visual de los 10 pasos del proceso |
| `UploadDocument.tsx` | Widget reutilizable para subir un documento individual |
| `GeneratePDFButton.tsx` | Botón de descarga/generación de PDF oficial |
| `MessageThread.tsx` | Hilo de mensajes coordinación ↔ alumno |
| `DeadlineCard.tsx` | Tarjeta de fecha límite con cuenta regresiva |
| `StatCard.tsx` | Tarjeta de estadística numérica con animación |
| `StatusBadge.tsx` | Badge colorido de estados (pendiente, aprobado, rechazado) |
| `ActorBadge.tsx` | Badge de tipo de actor (alumno / coordinación) |
| `ScannerWarning.tsx` | Alerta sobre requisitos de escaneo de documentos |
| `ResourceWarning.tsx` | Alerta de cupo / recurso agotado |
| `BuapLogo.tsx` | Logo SVG de la BUAP |
| `ErrorBoundary.tsx` | Captura de errores de renderizado React |

### Estado Global y Servicios

| Archivo | Descripción |
|---------|-------------|
| `context/StudentContext.tsx` | Context API: JWT token, perfil del alumno, logout |
| `services/api.ts` | **Todas las llamadas HTTP**. Funciones: `loginStudent()`, `getMyUploads()`, `submitDocument()`, `generateDocument()`, `getMyInterests()`, etc. |
| `hooks/useCountUp.ts` | Animación de contador numérico (0 → N) |
| `hooks/usePrefersReducedMotion.ts` | Respeta preferencias de accesibilidad |

### Archivos de Configuración

| Archivo | Descripción |
|---------|-------------|
| `src/data/processes.ts` | Define los **10 pasos** del proceso de inscripción con metadatos |
| `src/data/documents.ts` | Catálogo de tipos y grupos de documentos requeridos |
| `src/types/index.ts` | Interfaces TypeScript: `Student`, `Process`, `Upload`, `Message`, etc. |
| `vite.config.ts` | Configuración del bundler |
| `tailwind.config.js` | Tokens de diseño, colores BUAP |

---

## 🔐 Sistema de Autenticación

| Aspecto | Implementación |
|---------|---------------|
| **Algoritmo** | JWT (HS256) con `python-jose` |
| **Hash de contraseñas** | bcrypt via `passlib` |
| **Roles** | `"alumno"` / `"admin"` (coordinador / subordinado) |
| **Duración del token** | Configurable en `auth.py` |
| **Protección de rutas** | `Depends(get_current_student)` / `Depends(get_current_admin)` en cada endpoint |
| **Frontend** | Token almacenado en `StudentContext`. Headers `Authorization: Bearer` en todas las peticiones de `api.ts` |

---

## 📄 Motor de PDFs — Detalles Técnicos

### PyMuPDF (fitz) — La librería estrella

| Capacidad | Cómo se Usa |
|-----------|-------------|
| Apertura de plantillas | `fitz.open(template_path)` |
| Extracción de campos | `page.widgets()` → `widget.field_name` |
| Inyección de texto | `page.insert_text(point, text, fontsize, color)` |
| **Aplanamiento (Flattening)** | `page.delete_widget(widget)` después de `insert_text` → destruye interactividad |
| Escalado de fuente | Calcula `fontsize` proporcional a `widget.rect.width` / `len(text)` |
| Renderizado a imagen | `page.get_pixmap(matrix=Matrix(2.5, 2.5))` → PNG a 250% |
| Multi-página | Soporta PDFs de N páginas sin configuración extra |

### Plantillas Oficiales en `backend/templates/`

| Archivo | Uso |
|---------|-----|
| `FORMATO GRAL CPA SS.pdf` | Carta de Presentación y Aceptación — Servicio Social |
| `FORMATO GRAL CPA-PP.pdf` | Carta de Presentación y Aceptación — Práctica Profesional |
| `FORMATO GRAL CART CONFIDENCIALIDAD.pdf` | Carta de Confidencialidad |
| `FORMATO CAMBIO DE PROGRAMA.pdf` | Solicitud de cambio de programa |
| `FORMATO BAJA DE PROGRAMA.pdf` | Solicitud de baja de programa |
| `HOJA DE DESEMPEÑO.pdf` | Hoja de evaluación de desempeño |

### Protección de los PDFs Generados

1. Los campos del formulario PDF (widgets interactivos) se **leen y eliminan físicamente** — no se rellenan, se destruyen
2. El texto se "quema" como píxeles en la página usando coordenadas absolutas calculadas
3. El resultado es un PDF **completamente plano** (flat) que no puede editarse con ningún editor PDF

---

## 🔄 Flujo de Inscripción — 10 Pasos

```
Paso 1  → Consultar portal Autoservicios (informativo)
Paso 2  → Revisar requisitos y cupos (informativo)
Paso 3  → Seleccionar programa definitivo
Paso 4  → Guardar folios de interés (búsqueda dinámica)
Paso 5  → Confirmar folio(s) con cita aceptada
Paso 6  → Descargar CPA (generación de PDF oficial blindado)
Paso 7  → Carta de Confidencialidad (descarga)
Paso 8  → Orientación de la firma y sello (informativo)
Paso 9  → Subir 4 documentos firmados (BLOQUEO DE UI en revisión)
Paso 10 → Finalización e inscripción confirmada ✅
```

### Estados de los Documentos en Paso 9

| Estado | Descripción | UI |
|--------|-------------|-----|
| `not_uploaded` | Documento aún no subido | Cuadrícula de carga activa |
| `pending_review` | Todos los docs subidos, en espera | 🔒 Banner "Documentos en Revisión" |
| `approved` | Revisado y aceptado por coordinación | ✅ Verde |
| `rejected` | Rechazado con motivo | ❌ Rojo + motivo |

---

## 🧰 Scripts Utilitarios (Backend Raíz)

| Archivo | Descripción |
|---------|-------------|
| `seed.py` | Pobla la DB con datos iniciales (carreras, procesos, pasos, programas, admin) |
| `reset_progress.py` | Reinicia el progreso de un alumno específico |
| `add_missing_docs.py` | Agrega tipos de documentos faltantes |
| `inspect_pdf.py` | Inspecciona los campos de un PDF de plantilla |
| `pdf_to_img.py` | Renderiza PDFs a PNG con PyMuPDF (pruebas de legibilidad) |
| `delete_test.py` | Limpieza de datos de prueba de la DB |

### Scripts de Prueba

| Archivo | Qué Prueba |
|---------|-----------|
| `test_pdf_fill.py` | Llenar campos de un PDF de plantilla |
| `test_confidencialidad.py` | Generación de la Carta de Confidencialidad |
| `test_flatten.py` | Aplanamiento de un PDF |
| `test_fitz.py` | Funciones básicas de PyMuPDF |
| `test_draw.py` / `test_draw2.py` / `test_draw3.py` | Inyección de texto con coordenadas manuales |
| `test_routes.py` | Verificación de rutas de la API |
| `test_flags.py` | Flags de seguridad de PDF |

---

## 📊 Estado Actual del Sistema

| Módulo | Estado |
|--------|--------|
| Autenticación JWT | ✅ Completado |
| Registro de alumnos | ✅ Completado |
| 10 pasos del proceso | ✅ Completado |
| Generación de PDFs (CPA SS/PP) | ✅ Completado + Blindado |
| Carta de Confidencialidad | ✅ Completado + Blindado |
| Aplanamiento PDF (no editable) | ✅ Completado |
| Subida de 4 documentos (Paso 9) | ✅ Completado |
| Bloqueo UI "en revisión" | ✅ Completado |
| Panel Admin (revisión de docs) | ✅ Completado |
| Auditoría de acciones | ✅ Completado |
| Exportación Excel | ✅ Completado |
| Mensajería coordinación ↔ alumno | ✅ Completado |
| OCR / Validación de legibilidad | 🚧 Pendiente (Tesseract instalado) |
| Pruebas de carga (stress test) | 🚧 Pendiente |
