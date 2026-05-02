# INSTRUCCIÓN COMPLETA — MVP Sistema de Gestión SS/PP BUAP


Vamos a migrar el demo a un MVP funcional con backend real, base de datos, panel administrativo, sistema de upload de documentos con auditoría automática, y mensajería contextual entre coordinación y alumno. Ejecuta todo en secuencia sin detenerte entre pasos.

---

## PASO 1 — BACKEND COMPLETO CON FASTAPI + SQLITE

Crea una carpeta backend/ al mismo nivel que src/. Esta carpeta es una aplicación Python independiente que sirve como el cerebro del sistema.

### Estructura de archivos del backend:

```
backend/
├── main.py
├── database.py
├── models.py
├── schemas.py
├── auth.py
├── routers/
│   ├── auth_router.py
│   ├── student_router.py
│   ├── document_router.py
│   ├── upload_router.py
│   ├── message_router.py
│   ├── admin_router.py
│   └── deadline_router.py
├── services/
│   ├── pdf_generator.py
│   ├── process_engine.py
│   └── audit_engine.py
├── seed.py
├── requirements.txt
├── uploads/              (carpeta donde se guardan los documentos escaneados que suben los alumnos)
└── generated_pdfs/       (carpeta donde se guardan los PDFs generados por el sistema)
```

### requirements.txt:

```
fastapi==0.115.0
uvicorn==0.30.0
sqlalchemy==2.0.35
pydantic==2.9.0
python-jose==3.3.0
passlib==1.7.4
bcrypt==4.2.0
python-multipart==0.0.12
reportlab==4.2.0
aiofiles==24.1.0
```

### database.py:

Configura SQLAlchemy con SQLite. El archivo de base de datos se llama database.db y se crea en la raíz de backend/. Usa declarative_base() para los modelos. Crea una función get_db() que sea un dependency de FastAPI para inyectar sesiones de DB en cada endpoint. Incluye una función init_db() que cree todas las tablas al arrancar.

La connection string debe ser: sqlite:///./database.db
Agrega connect_args={"check_same_thread": False} porque SQLite no permite acceso multi-thread por defecto y FastAPI es async.

### models.py — Modelos SQLAlchemy:

Define TODOS estos modelos. Cada campo importa para el funcionamiento del sistema.

**Student:**
- id: Integer, primary key, autoincrement
- email: String(100), unique, not null — formato @alumno.buap.mx
- full_name: String(200), not null
- matricula: String(20), unique, not null
- career: String(200), not null
- semester: Integer
- gpa: Float
- program_name: String(300) — nombre del programa de SS/PP
- dependency_name: String(300) — nombre de la dependencia donde realiza SS/PP
- dependency_address: String(500) — dirección de la dependencia
- tutor_name: String(200) — nombre del tutor asignado
- tutor_email: String(100)
- process_id: Integer, ForeignKey('process_definitions.id')
- is_active: Boolean, default True
- created_at: DateTime, default now
- updated_at: DateTime, default now, onupdate now
- Relaciones: process (ProcessDefinition), progress (StudentProgress), uploads (DocumentUpload), messages (StepMessage), generated_documents (GeneratedDocument)

**ProcessDefinition:**
- id: Integer, primary key
- code: String(50), unique, not null — valores: 'inscripcion_ss', 'inscripcion_pp', 'acreditacion', 'baja_antes', 'baja_despues', 'cambio_programa', 'exentos'
- name: String(200), not null
- description: Text
- total_steps: Integer, not null
- generates_resource: Boolean, default False — True para baja_despues y cambio_programa
- process_type: String(20) — 'ss' o 'pp'
- is_active: Boolean, default True
- Relación: steps (ProcessStep)

**ProcessStep:**
- id: Integer, primary key
- process_id: Integer, ForeignKey('process_definitions.id'), not null
- step_number: Integer, not null
- title: String(300), not null
- short_label: String(100), not null
- description: Text — descripción completa de qué hacer en este paso
- actor: String(50), not null — valores: 'alumno', 'cppc', 'dependencia', 'tutor', 'dss', 'alumno_cppc', 'alumno_dependencia'
- requires_scan: Boolean, default False — True si el paso involucra subir documento escaneado
- requires_upload: Boolean, default False — True si el alumno debe subir un documento firmado en este paso
- has_document: Boolean, default False — True si el sistema genera un PDF para este paso
- document_name: String(200), nullable — nombre del documento que se genera (ej: "Carta Presentación-Aceptación")
- document_type: String(100), nullable — tipo técnico para la generación (ej: "carta_presentacion", "formato_baja", "carta_confidencialidad")
- action_required: Text — descripción de la acción específica que debe tomar el alumno
- warning_text: Text, nullable — texto de advertencia si aplica (ej: advertencia de escáner, advertencia de recurso)
- estimated_duration: String(100), nullable — tiempo estimado (ej: "3 días hábiles")
- Constraint: unique(process_id, step_number)

**StudentProgress:**
- id: Integer, primary key
- student_id: Integer, ForeignKey('students.id'), unique, not null
- current_step: Integer, not null, default 1
- status: String(20), default 'active' — valores: 'active', 'completed', 'suspended'
- started_at: DateTime, default now
- updated_at: DateTime, default now, onupdate now
- Relación: student (Student), step_completions (StepCompletion)

**StepCompletion:**
- id: Integer, primary key
- progress_id: Integer, ForeignKey('student_progress.id'), not null
- step_number: Integer, not null
- completed_at: DateTime, default now
- completed_by: String(100) — 'system', 'admin:{username}', o 'auto:upload_approved'
- notes: Text, nullable
- Constraint: unique(progress_id, step_number)

**GeneratedDocument:**
- id: Integer, primary key
- student_id: Integer, ForeignKey('students.id'), not null
- step_number: Integer, not null
- document_type: String(100), not null
- document_name: String(200), not null
- file_path: String(500), not null
- folio: String(20), unique, not null — auto-generado con formato EVA-DOC-{random 6 digits}
- generated_at: DateTime, default now

**DocumentUpload:**
- id: Integer, primary key
- student_id: Integer, ForeignKey('students.id'), not null
- step_number: Integer, not null
- document_type: String(100), not null
- file_path: String(500), not null — ruta al archivo escaneado subido
- original_filename: String(300), not null
- attempt_number: Integer, not null, default 1
- status: String(20), not null, default 'pending' — valores: 'pending', 'approved', 'rejected'
- rejection_reason: Text, nullable — motivo del rechazo si aplica
- reviewed_by: String(100), nullable — username del admin que revisó
- uploaded_at: DateTime, default now
- reviewed_at: DateTime, nullable
- Relación: student (Student)

**StepMessage:**
- id: Integer, primary key
- student_id: Integer, ForeignKey('students.id'), not null
- step_number: Integer, not null
- sender_type: String(10), not null — 'admin' o 'student'
- sender_name: String(200), not null
- message: Text, not null
- is_read: Boolean, default False
- created_at: DateTime, default now
- Relación: student (Student)

**AdminUser:**
- id: Integer, primary key
- username: String(50), unique, not null
- password_hash: String(200), not null — hash bcrypt
- full_name: String(200), not null
- role: String(20), not null, default 'subordinado' — 'coordinador' o 'subordinado'
- is_active: Boolean, default True
- created_at: DateTime, default now

**Deadline:**
- id: Integer, primary key
- title: String(300), not null
- description: Text
- due_date: Date, not null
- category: String(50) — 'inscripcion', 'acreditacion', 'baja', 'reporte', 'auditoria'
- applies_to: String(20), default 'all' — 'ss', 'pp', 'all'

### schemas.py:

Crea Pydantic schemas para cada modelo. Incluye schemas de request (para crear/actualizar) y schemas de response (para devolver datos). Usa model_config con from_attributes=True para compatibilidad con SQLAlchemy. Incluye schemas específicos para:
- StudentLoginRequest(email: str)
- AdminLoginRequest(username: str, password: str)
- TokenResponse(access_token: str, token_type: str, user_type: str, user_data: dict)
- AdvanceStepRequest(notes: Optional[str])
- SetStepRequest(step_number: int, notes: Optional[str])
- RejectUploadRequest(reason: str)
- SendMessageRequest(step_number: int, message: str)
- CreateStudentRequest(todos los campos del alumno)
- CreateAdminRequest(username, password, full_name, role)
- ProcessWithStepsResponse(proceso completo con todos sus pasos y el estado de cada paso para el alumno)
- StudentDetailResponse(alumno con su progreso, uploads, mensajes, documentos generados)

### auth.py:

Implementa JWT authentication. Usa python-jose para crear y verificar tokens. El SECRET_KEY puede ser un string hardcodeado para desarrollo (cambiable en producción). El token expira en 24 horas. Crea dos funciones dependency de FastAPI: get_current_student (verifica token y devuelve Student) y get_current_admin (verifica token y devuelve AdminUser). El token contiene: sub (email o username), user_type ('student' o 'admin'), exp (expiration).

### main.py:

Crea la app FastAPI con título "Sistema de Gestión SS/PP — BUAP". Configura CORS para permitir requests desde http://localhost:5173 (el frontend de Vite). Incluye todos los routers con sus prefijos. Al arrancar (evento startup), ejecuta init_db() para crear las tablas.

### Routers — define cada uno con estos endpoints exactos:

**auth_router.py (prefix: /api/auth):**
- POST /student-login — recibe email, busca en Students, si existe genera JWT y devuelve token + datos del alumno. Si no existe, devuelve 404 "Correo no registrado en el sistema."
- POST /admin-login — recibe username + password, verifica contra AdminUser con bcrypt, genera JWT y devuelve token + datos del admin. Si credenciales inválidas, devuelve 401.

**student_router.py (prefix: /api/student, dependency: get_current_student):**
- GET /me — devuelve los datos completos del alumno autenticado
- GET /process — devuelve el proceso del alumno con todos sus pasos. Cada paso incluye su estado: 'completed' (con fecha), 'current', o 'pending'. También incluye si el paso tiene uploads pendientes, aprobados o rechazados, y si hay mensajes no leídos.

**document_router.py (prefix: /api/documents, dependency: get_current_student):**
- GET / — devuelve la lista de documentos del proceso del alumno. Cada documento tiene su estado: 'pending' (el paso aún no llega), 'ready' (el paso es el actual o ya pasó y el doc se puede generar), 'generated' (ya se generó el PDF), 'delivered' (ya se subió firmado y fue aprobado).
- POST /generate/{document_type} — genera el PDF con ReportLab usando los datos del alumno de la base de datos, lo guarda en generated_pdfs/ con nombre {document_type}-{matricula}-{folio}.pdf, registra en GeneratedDocument, y devuelve el archivo para descarga.
- GET /download/{document_id} — descarga un documento generado previamente.

**upload_router.py (prefix: /api/uploads):**
Para alumnos (dependency: get_current_student):
- POST /submit — recibe un archivo (multipart form data) + step_number + document_type. Valida que el archivo sea PDF o imagen (jpg, png). Calcula el attempt_number basándose en uploads previos del mismo alumno/paso/tipo. Guarda el archivo en uploads/ con nombre {matricula}-step{step_number}-attempt{attempt_number}.{ext}. Crea registro en DocumentUpload con status='pending'. Devuelve confirmación.
- GET /my-uploads — devuelve todos los uploads del alumno con su estado, agrupados por step_number.
- GET /my-uploads/{step_number} — devuelve los uploads de un paso específico con historial de intentos.

Para admins (dependency: get_current_admin):
- GET /pending — devuelve todos los uploads con status='pending', ordenados por fecha. Incluye datos del alumno (nombre, matrícula, proceso, paso).
- GET /student/{student_id} — devuelve todos los uploads de un alumno específico con historial completo.
- POST /{upload_id}/approve — cambia status a 'approved', registra reviewed_by y reviewed_at. ADEMÁS: si el paso del alumno requiere upload (requires_upload=True) y el upload fue aprobado, el sistema automáticamente avanza al alumno al siguiente paso. Crea un StepCompletion con completed_by='auto:upload_approved'. Actualiza StudentProgress.current_step += 1 y updated_at. Este es el auto-advance que elimina la necesidad de que el coordinador manualmente avance al alumno después de aprobar.
- POST /{upload_id}/reject — recibe RejectUploadRequest con reason. Cambia status a 'rejected', guarda rejection_reason, reviewed_by, reviewed_at. NO avanza al alumno — el alumno debe resubir.

**message_router.py (prefix: /api/messages):**
Para alumnos (dependency: get_current_student):
- GET / — devuelve todos los mensajes del alumno, ordenados por fecha. Marca como leídos los que eran de tipo 'admin'.
- GET /step/{step_number} — devuelve mensajes de un paso específico.
- POST / — recibe SendMessageRequest. Crea StepMessage con sender_type='student', sender_name=nombre del alumno.
- GET /unread-count — devuelve el conteo de mensajes no leídos.

Para admins (dependency: get_current_admin):
- GET /student/{student_id} — devuelve todos los mensajes de un alumno.
- POST /student/{student_id} — recibe SendMessageRequest. Crea StepMessage con sender_type='admin', sender_name=nombre del admin.

**admin_router.py (prefix: /api/admin, dependency: get_current_admin):**
- GET /dashboard-stats — devuelve: total alumnos, total SS, total PP, alumnos por paso (distribución), uploads pendientes de revisión, alumnos completados.
- GET /students — devuelve lista de todos los alumnos con su progreso. Acepta query params para filtrar: process_type (ss/pp), status (active/completed/suspended), search (busca en nombre o matrícula).
- GET /students/{student_id} — devuelve StudentDetailResponse completo: datos del alumno, su progreso con cada paso, todos sus uploads con historial de intentos, todos sus mensajes, todos sus documentos generados.
- POST /students — crea un nuevo alumno. Recibe CreateStudentRequest. También crea su StudentProgress con current_step=1.
- POST /students/{student_id}/advance — avanza al alumno al siguiente paso. Crea StepCompletion con completed_by='admin:{username}'. Si el alumno ya está en el último paso, cambia su status a 'completed'.
- POST /students/{student_id}/set-step — pone al alumno en un paso arbitrario. Útil para correcciones.
- GET /users — lista de usuarios admin (solo role=coordinador puede ver esto).
- POST /users — crear usuario admin. Hashea la contraseña con bcrypt antes de guardar.
- PUT /users/{user_id} — actualizar usuario admin (nombre, rol, contraseña si se envía).
- DELETE /users/{user_id} — desactivar usuario admin (is_active=False, no borrar).

**deadline_router.py (prefix: /api/deadlines):**
- GET / — devuelve todas las fechas límite, ordenadas por fecha. Incluye campo calculado 'urgency': 'critical' si <=3 días, 'warning' si <=7, 'approaching' si <=14, 'safe' si >14. También incluye 'days_remaining'.

### services/pdf_generator.py:

Usa ReportLab para generar PDFs profesionales. Implementa una función para cada tipo de documento. Cada PDF debe incluir:
- Encabezado: "BENEMÉRITA UNIVERSIDAD AUTÓNOMA DE PUEBLA" (centrado, negrita), "Facultad de Administración" (centrado), "Coordinación de Prácticas Profesionales y Comunicación" (centrado)
- Línea separadora
- Título del documento (ej: "CARTA PRESENTACIÓN-ACEPTACIÓN")
- Sección "DATOS DEL ALUMNO": Nombre completo, Matrícula, Carrera, Semestre, Promedio (GPA), Dependencia, Asesor interno (tutor) — todos tomados de la base de datos, NUNCA vacíos
- Cuerpo del documento específico según el tipo
- Espacio de firmas: "Firma del alumno:" (línea) + "Firma del responsable:" (línea) + texto "Firma en tinta azul"
- Espacio de sello: "Sello oficial:" (cuadro punteado)
- Pie: "Generado el {fecha} | Folio: {folio} | Válido únicamente con firma y sello original"

Implementa al menos estos 3 tipos: 'carta_presentacion', 'formato_baja', 'carta_confidencialidad'. Cada uno con su cuerpo específico.

### services/process_engine.py:

Contiene la lógica de negocio central:
- get_student_process_status(student, db) — devuelve el proceso del alumno con el estado de cada paso (completed/current/pending), incluyendo información de uploads y mensajes por paso.
- get_available_documents(student, db) — determina qué documentos puede generar el alumno basándose en su paso actual y los pasos completados.
- advance_student(student_id, admin_username, db, notes) — avanza al alumno, crea StepCompletion, actualiza progress.
- get_step_upload_status(student_id, step_number, db) — devuelve el estado del upload para un paso: 'not_required', 'awaiting_upload', 'pending_review', 'approved', 'rejected'.

### services/audit_engine.py:

Contiene la lógica de auditoría automática:
- validate_upload(upload, student, db) — verifica que el upload corresponde al paso correcto del alumno, que el alumno está en ese paso o lo ha completado, y que el formato del archivo es válido (PDF o imagen).
- get_upload_history(student_id, step_number, db) — devuelve el historial completo de intentos de upload para un paso específico.
- auto_advance_on_approval(upload, db) — cuando un upload se aprueba, verifica si el paso requiere upload y si debe avanzar automáticamente al alumno.

### seed.py:

Script que se ejecuta una vez para cargar datos iniciales. Debe:
1. Crear todas las tablas (llamar init_db)
2. Verificar si ya hay datos (para no duplicar al ejecutar múltiples veces)
3. Cargar los 6 procesos con TODOS sus pasos completos — usa exactamente los mismos datos que están en src/data/processes.ts del frontend. Cada paso debe tener sus campos completos: title, short_label, description, actor, requires_scan, requires_upload, has_document, document_name, document_type, action_required, warning_text.
4. Cargar los 4 alumnos mock con sus datos completos y su StudentProgress inicializado.
5. Cargar las 7 fechas límite del calendario.
6. Crear un admin default: username='coordinador', password='admin2026', full_name='Coordinador SS/PP', role='coordinador'.
7. Crear un admin subordinado: username='asistente', password='asist2026', full_name='Asistente de Coordinación', role='subordinado'.
8. Imprimir un resumen de lo que se cargó al terminar.

Al final de seed.py, asegúrate de que se pueda ejecutar directamente: if __name__ == '__main__': seed()

### Verificación del backend:

Cuando termines todo el backend, ejecuta estos comandos en secuencia para verificar que funciona:

```bash
cd backend
pip install -r requirements.txt
python seed.py
uvicorn main:app --reload --port 8000
```

Verifica que http://localhost:8000/docs muestre la documentación Swagger con TODOS los endpoints listados. No pases al siguiente paso hasta que el backend corra limpio sin errores.

---

## PASO 2 — CONECTAR FRONTEND REACT AL BACKEND

Ahora modifica el frontend React existente para consumir la API real en vez de datos locales.

### src/services/api.ts:

Crea un servicio centralizado para todas las llamadas HTTP. Usa fetch nativo (no instales axios). La base URL es http://localhost:8000/api. Incluye:

- Una función base fetchAPI(endpoint, options) que automáticamente agrega el header Authorization: Bearer {token} si hay token en localStorage, y maneja errores de red y respuestas no-ok.
- Funciones específicas para cada grupo de endpoints:
  - auth: studentLogin(email), adminLogin(username, password)
  - student: getMe(), getProcess(), getDocuments(), generateDocument(documentType), getDeadlines(), getUnreadMessageCount()
  - uploads: submitUpload(stepNumber, documentType, file), getMyUploads(), getStepUploads(stepNumber)
  - messages: getMessages(), getStepMessages(stepNumber), sendMessage(stepNumber, message), getUnreadCount()
  - admin: getDashboardStats(), getStudents(filters), getStudentDetail(studentId), advanceStudent(studentId, notes), setStudentStep(studentId, stepNumber, notes), createStudent(data), getPendingUploads(), approveUpload(uploadId), rejectUpload(uploadId, reason), getAdminUsers(), createAdminUser(data), updateAdminUser(id, data), deleteAdminUser(id), sendMessageToStudent(studentId, stepNumber, message)

### Modificar StudentContext.tsx:

El contexto ahora almacena: token (string), userType ('student' | 'admin' | null), studentData (datos del alumno) o adminData (datos del admin), y isAuthenticated (boolean). Incluye funciones: login(token, userType, userData), logout(). Al cargar la app, verifica si hay un token en localStorage y si aún es válido.

### Modificar LoginPage.tsx:

Reemplaza el selector de perfiles con dos tabs: "Alumno" y "Administración".

Tab Alumno: un campo de input para correo electrónico con placeholder "tu.correo@alumno.buap.mx", un botón "Iniciar sesión". Al hacer submit, llama a studentLogin(email). Si el correo no existe en la DB, muestra un error inline "Este correo no está registrado en el sistema." Si el login es exitoso, guarda token en contexto y localStorage, redirige a /dashboard.

Tab Administración: campos de username y contraseña, botón "Acceder". Al hacer submit, llama a adminLogin(username, password). Si credenciales inválidas, muestra error. Si exitoso, guarda token y redirige a /admin.

Aplica las animaciones del SKILL: fade-in en la card de login, transición suave entre tabs. Mantén el diseño visual actual (logo FA, título del sistema, subtítulo de la facultad).

### Modificar hooks (useStudentProcess.ts, useDocuments.ts):

Reescribe los hooks para llamar a la API en vez de importar datos locales. Cada hook debe manejar tres estados: loading (true mientras espera la API), error (si la API falla), y data (los datos reales). Mientras loading=true, los componentes muestran skeleton loaders del SKILL de animations.

Agrega un hook nuevo useUploads.ts que expone: uploads (lista de uploads del alumno), submitUpload(stepNumber, documentType, file), getStepUploads(stepNumber), y estados de loading/error.

Agrega un hook nuevo useMessages.ts que expone: messages, sendMessage(stepNumber, message), unreadCount, getStepMessages(stepNumber), y estados de loading/error.

### Modificar DashboardPage.tsx:

Las stat cards, el stepper, y el panel de deadlines ahora consumen datos de la API vía los hooks. Agrega un indicador de mensajes no leídos en el sidebar (badge con número rojo si hay mensajes no leídos del admin).

En cada paso del stepper que tiene requires_upload=true, agrega el estado del upload:
- Si el alumno no ha subido nada: mostrar botón "Subir documento firmado"
- Si hay un upload pendiente de revisión: mostrar badge "En revisión" con icono de reloj
- Si fue rechazado: mostrar alerta con el motivo del rechazo + botón "Volver a subir"
- Si fue aprobado: mostrar badge "Aprobado" con check verde

En cada paso que tiene mensajes, mostrar un indicador. Al hacer clic en el paso, mostrar los mensajes dentro de la card expandida del paso como un mini-hilo de conversación (mensajes del admin a la izquierda en gris, mensajes del alumno a la derecha en azul) con un campo de input para responder.

### Crear componente UploadDocument.tsx:

Componente que maneja la subida de documentos escaneados. Incluye:
- Zona de drag & drop + botón de seleccionar archivo
- Validación client-side: solo PDF, JPG, PNG. Tamaño máximo 10MB.
- Preview del archivo seleccionado (nombre + tamaño)
- Botón "Subir documento" con el patrón de botón animado del SKILL (idle → uploading → uploaded)
- El ScannerWarningInline del SKILL siempre visible arriba del drop zone
- Si hay intentos previos, mostrar historial: "Intento 1 — Rechazado: {motivo}" / "Intento 2 — En revisión"

### Crear componente MessageThread.tsx:

Componente que muestra los mensajes de un paso como un hilo de conversación. Mensajes del admin aparecen con fondo gris claro alineados a la izquierda, mensajes del alumno con fondo azul claro alineados a la derecha. Cada mensaje muestra: nombre del remitente, fecha/hora, y el texto. Al fondo hay un campo de input con botón "Enviar" para que el alumno responda.

### Modificar DocumentsPage.tsx:

Los documentos ahora vienen de la API. Agrega un quinto estado a los document cards: 'awaiting_upload' — el documento ya fue generado e impreso, ahora el alumno necesita subirlo firmado. Cuando el documento está en este estado, la card muestra el componente UploadDocument embebido.

El flujo completo de un documento es: pending → ready → generated (se descargó el PDF) → awaiting_upload (el alumno lo imprimió y necesita subirlo firmado) → delivered (el upload fue aprobado por el admin).

### Modificar generación de PDFs:

El botón "Generar PDF" ahora llama a POST /api/documents/generate/{document_type} en el backend. El backend genera el PDF con ReportLab y devuelve el archivo. El frontend recibe el blob y triggerea la descarga. Mantén el patrón de botón animado (idle → generating → done) del SKILL.

---

## PASO 3 — PANEL ADMINISTRATIVO

Crea las páginas del panel admin dentro de src/pages/admin/. El panel admin usa el mismo MainLayout pero con navegación diferente.

### Navegación del admin (sidebar):

- Dashboard (icono LayoutDashboard)
- Alumnos (icono Users)
- Revisión de Documentos (icono FileSearch) — con badge de uploads pendientes
- Usuarios (icono UserCog) — solo visible para role=coordinador
- Cerrar sesión (icono LogOut)

### AdminDashboardPage.tsx:

Fila de stat cards animadas con useCountUp: "Total alumnos" (número), "Servicio Social" (número), "Práctica Profesional" (número), "Uploads pendientes" (número con badge rojo si >0).

Debajo, dos secciones lado a lado:
- Izquierda: "Alumnos recientes" — lista de los últimos 10 alumnos que tuvieron actividad (avanzaron de paso, subieron documento, enviaron mensaje). Cada item muestra nombre, proceso, paso actual, y hace cuánto fue la actividad.
- Derecha: "Uploads pendientes de revisión" — lista de los últimos 5 uploads pendientes con nombre del alumno, documento, y botón rápido de "Revisar".

### AdminStudentsPage.tsx:

Barra de filtros arriba: dropdown de tipo de proceso (Todos, SS, PP), dropdown de estado (Todos, Activos, Completados), campo de búsqueda por nombre o matrícula. Botón "Registrar alumno" a la derecha.

Tabla de alumnos debajo. Cada fila: nombre (clickeable), matrícula, proceso (badge de color), paso actual (ej: "9 de 17"), porcentaje de avance (barra visual), último avance (fecha relativa, ej: "hace 3 días"), estado (badge). Al hacer clic en un alumno, navega a /admin/students/{id}.

El botón "Registrar alumno" abre un modal con formulario: email, nombre completo, matrícula, carrera, semestre, promedio, programa, dependencia, dirección dependencia, tutor, email tutor, proceso (dropdown con los 6 procesos). Al guardar, llama a POST /api/admin/students.

### AdminStudentDetailPage.tsx (ruta: /admin/students/:id):

Esta es la vista más completa. Arriba: card con datos del alumno (nombre, matrícula, carrera, programa, dependencia, tutor). Badge de proceso y porcentaje de avance.

Debajo: tabs para organizar la información:

Tab "Progreso": el mismo stepper visual que ve el alumno (reutiliza el componente ProcessStepper), pero con dos botones de acción en la parte superior: "Avanzar paso" (botón primario) y "Establecer paso" (dropdown con todos los pasos). Al avanzar, se pide confirmación y una nota opcional.

Tab "Documentos y Uploads": lista de todos los documentos del proceso. Para cada documento muestra: si fue generado (con fecha y folio + botón descargar), si fue subido firmado (con historial de intentos — cada intento muestra: número, fecha, estado, motivo de rechazo si aplica, y un botón para ver/descargar el archivo escaneado), y botones de "Aprobar" / "Rechazar" para uploads pendientes. Al rechazar, aparece un campo de texto para escribir el motivo que el alumno verá.

Tab "Mensajes": historial completo de mensajes con el alumno, organizado por paso. El admin puede escribir un nuevo mensaje seleccionando primero el paso al que se refiere.

Tab "Historial": log cronológico de toda la actividad del alumno: cuándo completó cada paso, quién lo avanzó, cuándo generó documentos, cuándo subió uploads, cuándo se aprobaron/rechazaron.

### AdminUploadsPage.tsx:

Vista dedicada a revisar uploads pendientes. Lista de todos los uploads con status='pending' ordenados por fecha (más antiguo primero). Cada item muestra: nombre del alumno (clickeable, lleva al detalle), documento, paso, fecha de subida, número de intento, y botones "Aprobar" / "Rechazar". Al rechazar, se expande un campo de texto para el motivo. Al aprobar, se pide confirmación y el sistema auto-avanza al alumno si el paso lo requiere (muestra un texto: "El alumno será avanzado automáticamente al paso X").

Al hacer clic en el archivo, se abre en un viewer inline (si es imagen) o se descarga (si es PDF), para que el admin pueda revisar las firmas y sellos sin salir de la página.

### AdminUsersPage.tsx (solo visible para role=coordinador):

Lista de usuarios admin con: nombre, username, rol (badge), estado (activo/inactivo). Botón "Nuevo usuario". Cada usuario tiene botones de editar y desactivar. El formulario de crear/editar pide: nombre completo, username, contraseña (solo en crear o si se quiere cambiar), y rol (coordinador o subordinado).

### Protección de rutas:

Crea un componente ProtectedRoute que verifica si el usuario está autenticado y si tiene el userType correcto. Las rutas /dashboard, /documents, /calendar requieren userType='student'. Las rutas /admin/* requieren userType='admin'. Si no está autenticado, redirige a login. Si está autenticado pero con el tipo incorrecto, redirige a su área correspondiente.

---

## PASO 4 — VERIFICACIÓN FINAL Y LEVANTAMIENTO DE SERVIDORES

Verifica que todo compile y funcione:

1. Backend: cd backend && python seed.py (debe imprimir resumen de datos cargados sin errores)
2. Backend: uvicorn main:app --reload --port 8000 (debe arrancar sin errores, http://localhost:8000/docs debe mostrar todos los endpoints)
3. Frontend: npm run dev (debe compilar sin errores TypeScript, http://localhost:5173 debe mostrar el login)
4. Prueba flujo alumno: ingresa correo de Ana Sofía (el que esté en seed data), verifica que cargue su dashboard, navega a documentos, genera un PDF, verifica que se descargue.
5. Prueba flujo admin: ingresa username=coordinador password=admin2026, verifica que cargue el dashboard admin con las stats, navega a alumnos, haz clic en un alumno, avanza un paso, verifica que el cambio se refleje.
6. Prueba upload: desde la vista de alumno, sube un archivo de prueba en un paso que requiere upload. Desde la vista de admin, aprueba el upload y verifica que el alumno avanzó automáticamente al siguiente paso.
7. Prueba mensajes: desde admin, envía un mensaje a un alumno sobre un paso. Desde la vista de alumno, verifica que el mensaje aparezca en el paso correspondiente y responde. Verifica que la respuesta aparezca en el admin.

IMPORTANTE: Deja ambos servidores corriendo al terminar. El frontend en el puerto 5173 y el backend en el puerto 8000. No los cierres. Imprime un resumen final de todo lo que se construyó, las URLs de acceso, y las credenciales de prueba.
