# INSTRUCCIÓN COMPLETA — REDISEÑO SISTEMA SS/PP BUAP v2
# Copia y pega esto completo en Claude Code.
# Lee el CLAUDE.md y los tres SKILL.md en .claude/skills/ antes de empezar.

Este es un rediseño mayor del sistema. NO es un parche al MVP actual — es una reestructuración del flujo del alumno, del panel admin, y de la base de datos. El frontend React y el backend FastAPI se mantienen como stack, pero los componentes, las páginas, los modelos de datos y los endpoints cambian significativamente. El código que ya funciona (generación de PDFs, sistema de uploads, mensajería) se reutiliza dentro de la nueva estructura.

Ejecuta todo en secuencia. No te detengas entre pasos.

---

## PASO 1 — REESTRUCTURACIÓN DE LA BASE DE DATOS (Modelo Dimensional)

La base de datos actual tiene modelos planos. La nueva arquitectura separa la DB en tres capas: Dimensiones (catálogos de referencia), Hechos (eventos transaccionales append-only), y Operativas (estado actual reconstruible). Si una tabla OPS se corrompe, se regenera desde las FACT. Las FACT nunca se modifican ni se borran.

Elimina database.db y reescribe completamente models.py y database.py.

### CAPA 1 — Tablas de Dimensión (DIM)

Estas tablas almacenan catálogos de referencia. Cambian poco. Todas tienen un campo is_active (boolean, default True) para desactivación lógica — nunca se borran registros.

**dim_careers:**
- id: Integer, PK
- code: String(20), unique, not null — ej: "LAE", "LAT", "APG", "LCI", "ACP", "LNI", "LGA"
- name: String(200), not null — ej: "Administración de Empresas"
- full_code: String(50) — ej: "Administración de Empresas(LAE) 7"
- is_active: Boolean, default True

**dim_modalities:**
- id: Integer, PK
- code: String(30), unique — "escolarizado", "semi_escolarizado", "distancia"
- name: String(100) — "Escolarizado", "Semi-escolarizado", "Distancia"
- is_active: Boolean, default True

**dim_periods:**
- id: Integer, PK
- code: String(20), unique — ej: "otono_2026", "verano_2027"
- name: String(100) — "Otoño 2026"
- period_type: String(20) — "otono", "verano", "anual"
- year: Integer — 2026
- start_date: Date
- end_date: Date
- enrollment_start: Date — fecha en que se habilita la inscripción para alumnos
- enrollment_end: Date — fecha límite de inscripción
- is_current: Boolean, default False — solo un periodo puede ser current
- is_active: Boolean, default True

**dim_programs:**
- id: Integer, PK
- folio: String(20), unique, not null — el folio de 6 dígitos del SaaS BUAP
- name: String(500), not null — nombre del programa
- program_type: String(30), not null — "servicio_social" o "practica_profesional"
- career_id: Integer, FK(dim_careers.id), not null
- max_slots: Integer, not null — cupo máximo
- dependency_name: String(500) — empresa/institución
- sector: String(50) — "PRIVADO", "PUBLICO", "UNIVERSITARIO", "SOCIAL", "INCORPORADA"
- evaluator_name: String(200) — coordinador que avaló
- period_id: Integer, FK(dim_periods.id)
- status: String(20), default "active" — "active", "full", "inactive"
- is_active: Boolean, default True

**dim_process_definitions:**
- id: Integer, PK
- code: String(50), unique — "inscripcion", "acreditacion", "cambio", "baja"
- name: String(200)
- description: Text
- display_order: Integer — 1=inscripción, 2=acreditación, 3=cambio, 4=baja
- is_primary: Boolean — True para inscripción y acreditación (bloques grandes), False para cambio y baja (texto pequeño)
- generates_resource: Boolean, default False
- color_code: String(20) — color del bloque en la UI, ej: "blue", "green", "gray", "red"
- is_active: Boolean, default True

**dim_process_steps:**
- id: Integer, PK
- process_id: Integer, FK(dim_process_definitions.id)
- step_number: Integer
- title: String(300)
- short_label: String(100)
- description: Text
- actor: String(50) — "alumno", "cppc", "dependencia", "tutor", "alumno_cppc"
- requires_upload: Boolean, default False
- requires_scan: Boolean, default False
- has_generated_document: Boolean, default False
- generated_document_type: String(100), nullable — "solicitud", "carta_confidencialidad"
- has_student_document: Boolean, default False — True para docs que el alumno ya tiene (Kárdex, IMSS)
- student_document_type: String(100), nullable — "kardex", "vigencia_imss"
- action_required: Text
- warning_text: Text, nullable
- is_active: Boolean, default True
- Constraint: unique(process_id, step_number)

**dim_document_types:**
- id: Integer, PK
- code: String(50), unique — "solicitud", "carta_confidencialidad", "kardex", "vigencia_imss"
- name: String(200) — "Solicitud de Inscripción", "Carta de Confidencialidad", "Kárdex Simple", "Vigencia de Derechos IMSS"
- origin: String(20) — "generated" (la app lo genera) o "student" (el alumno lo tiene)
- requires_signature: Boolean — True para solicitud y carta confidencialidad, False para kárdex e IMSS
- requires_stamp: Boolean
- description: Text — qué es este documento y para qué sirve
- is_active: Boolean, default True

**dim_system_config:**
- id: Integer, PK
- config_key: String(100), unique — "enrollment_enabled", "block_message", "block_until_date", "current_period_id"
- config_value: Text
- config_type: String(20) — "boolean", "string", "date", "integer"
- description: Text — qué controla esta configuración
- updated_at: DateTime
- updated_by: String(100)

### CAPA 2 — Tablas de Hechos (FACT)

Tablas transaccionales. Append-only: NUNCA se hace UPDATE ni DELETE. Cada fila es un evento que ocurrió.

**fact_registrations:**
- id: Integer, PK
- email: String(100), not null
- full_name: String(200)
- first_name: String(100)
- last_name_paterno: String(100)
- last_name_materno: String(100)
- matricula: String(20)
- career_id: Integer, FK(dim_careers.id)
- modality_id: Integer, FK(dim_modalities.id)
- registered_at: DateTime, default now
- ip_address: String(50)

**fact_enrollments:**
- id: Integer, PK
- student_id: Integer, FK(ops_students.id)
- program_id: Integer, FK(dim_programs.id)
- period_id: Integer, FK(dim_periods.id)
- service_type: String(30) — "servicio_social" o "practica_profesional"
- folio_entered: String(20) — el folio que el alumno ingresó
- status: String(20), default "pending" — "pending", "approved", "rejected", "cancelled"
- enrolled_at: DateTime, default now
- validated_by: String(100), nullable
- validated_at: DateTime, nullable
- rejection_reason: Text, nullable
- slot_number: Integer — qué número de cupo obtuvo (ej: 3 de 5)

**fact_step_completions:**
- id: Integer, PK
- student_id: Integer, FK(ops_students.id)
- process_id: Integer, FK(dim_process_definitions.id)
- step_number: Integer
- completed_at: DateTime, default now
- completed_by: String(100) — "auto:upload_approved", "admin:{username}", "system"
- notes: Text, nullable

**fact_document_generations:**
- id: Integer, PK
- student_id: Integer, FK(ops_students.id)
- document_type_id: Integer, FK(dim_document_types.id)
- process_id: Integer, FK(dim_process_definitions.id)
- step_number: Integer
- file_path: String(500)
- folio: String(30), unique — "EVA-DOC-{6 random digits}"
- generated_at: DateTime, default now

**fact_document_uploads:**
- id: Integer, PK
- student_id: Integer, FK(ops_students.id)
- document_type_id: Integer, FK(dim_document_types.id)
- process_id: Integer, FK(dim_process_definitions.id)
- step_number: Integer
- file_path: String(500)
- original_filename: String(300)
- attempt_number: Integer
- uploaded_at: DateTime, default now

**fact_approval_actions:**
- id: Integer, PK
- entity_type: String(50) — "document_upload", "enrollment", "change_request"
- entity_id: Integer — ID del registro que se aprobó/rechazó
- action: String(20) — "approved", "rejected", "correction_requested"
- performed_by: String(100)
- reason: Text, nullable — motivo del rechazo o notas de corrección
- auto_advanced: Boolean, default False
- new_step: Integer, nullable — si hubo auto-advance, a qué paso
- performed_at: DateTime, default now

**fact_messages:**
- id: Integer, PK
- student_id: Integer, FK(ops_students.id)
- step_number: Integer
- process_id: Integer, FK(dim_process_definitions.id)
- sender_type: String(10) — "admin" o "student"
- sender_id: Integer
- sender_name: String(200)
- message: Text
- created_at: DateTime, default now

**fact_change_requests:**
- id: Integer, PK
- student_id: Integer, FK(ops_students.id)
- request_type: String(20) — "cambio" o "baja"
- current_program_id: Integer, FK(dim_programs.id), nullable
- new_program_id: Integer, FK(dim_programs.id), nullable — solo para cambio
- justification: Text, not null
- status: String(20), default "pending" — "pending", "approved", "rejected"
- submitted_at: DateTime, default now

**fact_audit_log:**
- id: Integer, PK
- timestamp: DateTime, default now
- user_type: String(10) — "admin", "student", "system"
- user_id: Integer, nullable
- user_name: String(200)
- action: String(100) — "register", "login", "generate_pdf", "upload_document", "approve_upload", "reject_upload", "advance_step", "create_enrollment", "approve_enrollment", "submit_change_request", "update_config", "upload_programs_excel"
- entity_type: String(50) — "student", "document_upload", "enrollment", "change_request", "system_config", "program"
- entity_id: Integer, nullable
- details_before: Text, nullable — JSON del estado anterior
- details_after: Text, nullable — JSON del estado posterior
- ip_address: String(50), nullable

### CAPA 3 — Tablas Operativas (OPS)

Estado actual del sistema. Se actualizan pero pueden reconstruirse desde las FACT.

**ops_students:**
- id: Integer, PK
- email: String(100), unique, not null
- full_name: String(200)
- first_name: String(100)
- last_name_paterno: String(100)
- last_name_materno: String(100)
- matricula: String(20), unique
- career_id: Integer, FK(dim_careers.id)
- modality_id: Integer, FK(dim_modalities.id)
- is_active: Boolean, default True
- created_at: DateTime
- last_login_at: DateTime, nullable

**ops_student_progress:**
- id: Integer, PK
- student_id: Integer, FK(ops_students.id)
- process_id: Integer, FK(dim_process_definitions.id)
- current_step: Integer, default 1
- status: String(20), default "active" — "not_started", "active", "completed", "suspended"
- started_at: DateTime, nullable
- completed_at: DateTime, nullable
- updated_at: DateTime

Un alumno tiene UN registro por proceso en esta tabla. Es decir, tiene un registro para inscripción, otro para acreditación, etc. No todos activos al mismo tiempo.

**ops_student_enrollments:**
- id: Integer, PK
- student_id: Integer, FK(ops_students.id)
- program_id: Integer, FK(dim_programs.id)
- period_id: Integer, FK(dim_periods.id)
- service_type: String(30)
- status: String(20) — "pending_validation", "active", "completed", "cancelled"
- enrolled_at: DateTime

**ops_upload_status:**
- id: Integer, PK
- student_id: Integer, FK(ops_students.id)
- document_type_id: Integer, FK(dim_document_types.id)
- process_id: Integer, FK(dim_process_definitions.id)
- current_status: String(20) — "not_uploaded", "pending_review", "approved", "rejected"
- current_attempt: Integer, default 0
- last_upload_id: Integer, FK(fact_document_uploads.id), nullable
- last_rejection_reason: Text, nullable
- approved_at: DateTime, nullable

**ops_program_availability:**
- id: Integer, PK
- program_id: Integer, FK(dim_programs.id), unique
- max_slots: Integer
- used_slots: Integer, default 0
- available_slots: Integer — computed: max_slots - used_slots
- is_full: Boolean, default False

**ops_admin_users:**
- id: Integer, PK
- username: String(50), unique
- password_hash: String(200)
- full_name: String(200)
- role: String(20) — "coordinador", "subordinado"
- is_active: Boolean, default True
- created_at: DateTime

### Utility function — rebuild_ops_from_facts(db):

Crea una función en database.py que pueda reconstruir TODAS las tablas OPS a partir de las tablas FACT. Esta función se usa en emergencias o para verificar integridad. Implementa la lógica para cada tabla OPS:
- ops_student_progress: lee fact_step_completions, agrupa por student_id+process_id, toma el max step_number como current_step.
- ops_program_availability: lee fact_enrollments WHERE status IN ('pending','approved','active'), cuenta por program_id, compara contra dim_programs.max_slots.
- ops_upload_status: lee fact_document_uploads + fact_approval_actions, determina el estado actual de cada documento de cada alumno.

### Audit log helper — log_action(db, user_type, user_id, user_name, action, entity_type, entity_id, details_before, details_after, ip_address):

Crea una función helper que se llama desde CADA endpoint que modifica datos. Inserta un registro en fact_audit_log. Úsala en todos los endpoints de los routers.

---

## PASO 2 — SEED DATA

Reescribe seed.py completamente. Debe cargar:

1. Las 7 carreras en dim_careers:
   - LAE: Administración de Empresas
   - LAT: Administración Turística
   - APG: Administración Pública y Gestión para el Desarrollo
   - LCI: Comercio Internacional
   - ACP: Administración Pública y Ciencias Políticas
   - LNI: Negocios Internacionales
   - LGA: Gastronomía

2. Las 3 modalidades en dim_modalities: Escolarizado, Semi-escolarizado, Distancia

3. Un periodo de prueba en dim_periods: "Verano 2026", period_type="verano", year=2026, enrollment_start=2026-04-07, enrollment_end=2026-05-15, is_current=True

4. Los 4 procesos macro en dim_process_definitions:
   - inscripcion: "Inscripción a SS/PP", display_order=1, is_primary=True, color_code="blue"
   - acreditacion: "Acreditación de SS/PP", display_order=2, is_primary=True, color_code="green"
   - cambio: "Cambio de Programa", display_order=3, is_primary=False, generates_resource=True, color_code="amber"
   - baja: "Baja de Programa", display_order=4, is_primary=False, generates_resource=True, color_code="red"

5. Los pasos de cada proceso en dim_process_steps. Diseña los pasos basándote en estos flujos:

   INSCRIPCIÓN (proceso principal, ~8-10 pasos después de fusionar redundancias):
   - Paso 1: Selección de servicio (SS o PP). Actor: alumno. Sin upload.
   - Paso 2: Ingreso de folio y vinculación al programa. Actor: alumno. Sin upload.
   - Paso 3: Generación y carga de Solicitud de Inscripción. Actor: alumno. has_generated_document=True, generated_document_type="solicitud", requires_upload=True (sube el PDF firmado).
   - Paso 4: Generación y carga de Carta de Confidencialidad. Actor: alumno. has_generated_document=True, generated_document_type="carta_confidencialidad", requires_upload=True.
   - Paso 5: Carga de Kárdex Simple. Actor: alumno. has_student_document=True, student_document_type="kardex", requires_upload=True. warning_text="El Kárdex debe ser reciente (no mayor a 10 días)."
   - Paso 6: Carga de Vigencia de Derechos IMSS. Actor: alumno. has_student_document=True, student_document_type="vigencia_imss", requires_upload=True.
   - Paso 7: Validación de documentos por CPPC. Actor: cppc. (El admin revisa y aprueba/rechaza cada documento individualmente. El auto-advance mueve al alumno cuando TODOS los uploads de este paso están aprobados.)
   - Paso 8: Aceptación por dependencia. Actor: alumno_dependencia. requires_upload=True (sube carta de aceptación firmada por la dependencia).
   - Paso 9: Inscripción formal y generación de Carta de Presentación. Actor: cppc.
   - Paso 10: Entrega de Carta de Presentación a la dependencia. Actor: alumno_dependencia.

   ACREDITACIÓN (~6-8 pasos):
   - Paso 1: Solicitud de cierre con dependencia (obtener Carta de Liberación). Actor: alumno_dependencia.
   - Paso 2: Carga de Carta de Liberación firmada. Actor: alumno. requires_upload=True.
   - Paso 3: Carga de Hoja de Desempeño firmada en tinta azul. Actor: alumno. requires_upload=True. requires_scan=True.
   - Paso 4: Entrega de documentos al Tutor para acreditación de materia. Actor: alumno. requires_upload=True (sube todos los docs escaneados).
   - Paso 5: Evaluación y acreditación de materia por Tutor. Actor: tutor.
   - Paso 6: Solicitud de Carta Término Digital a CPPC. Actor: alumno. requires_upload=True (sube Carta Liberación + Nombramiento + Kárdex actualizado).
   - Paso 7: Generación de Carta Término Digital por CPPC. Actor: cppc.
   - Paso 8: Obtención de Certificado/Constancia en Autoservicios. Actor: alumno.

   CAMBIO DE PROGRAMA (~5 pasos):
   - Paso 1: Solicitud de cambio con justificación. Actor: alumno. (El alumno escribe su motivo y selecciona el nuevo programa.)
   - Paso 2: Revisión y aprobación por CPPC. Actor: cppc.
   - Paso 3: Generación de documentos de cambio (CPA nueva + Formato de Cambio). Actor: alumno. has_generated_document=True. requires_upload=True.
   - Paso 4: Carga de documentos firmados por nueva dependencia. Actor: alumno. requires_upload=True.
   - Paso 5: Confirmación de cambio en sistema. Actor: cppc.

   BAJA (~4 pasos):
   - Paso 1: Solicitud de baja con justificación. Actor: alumno. (El alumno escribe su motivo.)
   - Paso 2: Revisión y aprobación por CPPC. Actor: cppc. warning_text="Este trámite puede generar recurso académico."
   - Paso 3: Generación y carga de Formato de Baja firmado. Actor: alumno. has_generated_document=True. requires_upload=True. requires_scan=True.
   - Paso 4: Confirmación de baja en sistema. Actor: cppc.

6. Los 4 tipos de documento en dim_document_types:
   - solicitud: "Solicitud de Inscripción", origin="generated", requires_signature=True, requires_stamp=True
   - carta_confidencialidad: "Carta de Confidencialidad", origin="generated", requires_signature=True, requires_stamp=False
   - kardex: "Kárdex Simple", origin="student", requires_signature=False, requires_stamp=False
   - vigencia_imss: "Vigencia de Derechos IMSS", origin="student", requires_signature=False, requires_stamp=False

7. Configuración del sistema en dim_system_config:
   - enrollment_enabled: "false", type="boolean", description="Habilita/deshabilita el acceso a procesos de inscripción"
   - block_message: "El periodo de inscripción aún no está habilitado. La coordinación está validando los programas disponibles. Debes esperar hasta la fecha indicada. Mientras tanto, conserva el folio del programa al que deseas ingresar.", type="string"
   - block_until_date: "2026-04-07", type="date", description="Fecha hasta la cual el alumno ve la pantalla de bloqueo"
   - current_period_id: "1", type="integer"

8. Importar los programas del Excel. Lee el archivo Excel que está en la ruta /mnt/user-data/uploads/xlsx.xlsx (o cópialo a backend/data/programs.xlsx). Parsea las 1,879 filas y crea registros en dim_programs. Mapea las columnas así:
   - Folio → folio
   - Programa → name
   - Tipo → program_type ("práctica profesional" → "practica_profesional", "servicio social" → "servicio_social")
   - Perfil → career_id (mapear el código de carrera al dim_careers correspondiente)
   - "." (columna 7) → max_slots
   - Industria → dependency_name
   - Sector → sector
   - Evaluó → evaluator_name
   - Inscritos → used_slots (para ops_program_availability)
   - Cupo → is_full (si "COMPLETO" → True)
   
   También crea/actualiza ops_program_availability para cada programa.

9. Crear 3 alumnos mock en ops_students (con sus fact_registrations correspondientes):
   - Ana Sofía Reyes Morales, 202112345, LAE, escolarizado
   - Carlos Eduardo Hernández Ruiz, 202054321, LCI, escolarizado
   - María Fernanda Torres López, 202198765, APG, semi_escolarizado

10. Crear 2 admins en ops_admin_users:
    - coordinador / admin2026 / "Coordinadora CPPC" / role=coordinador
    - asistente / asist2026 / "Asistente de Coordinación" / role=subordinado

11. Imprimir resumen: cuántos registros en cada tabla.

---

## PASO 3 — BACKEND: ROUTERS COMPLETOS

Reescribe todos los routers para la nueva arquitectura. Cada endpoint que modifica datos debe llamar a log_action() para registrar en fact_audit_log.

### auth_router.py (prefix: /api/auth):

POST /register — Registro libre de alumno. Recibe: email_user (solo la parte antes de @, el backend concatena @alm.buap.mx), first_name, last_name_paterno, last_name_materno, matricula (validar 9 dígitos numéricos), career_code (validar contra dim_careers), modality_code (validar contra dim_modalities). Validar: email no existe en ops_students, matrícula no existe en ops_students. Si válido: crear registro en fact_registrations + ops_students. Generar JWT. Devolver token + datos del alumno. SIN aprobación — el alumno queda activo inmediatamente.

POST /student-login — Recibe email completo o solo el usuario (si no tiene @, concatenar @alm.buap.mx). Buscar en ops_students. Si existe y is_active, generar JWT, actualizar last_login_at, devolver token + datos + enrollment_status (para saber si mostrar bloqueo o dashboard).

POST /admin-login — Igual que antes. Verificar contra ops_admin_users con bcrypt.

### student_router.py (prefix: /api/student, dependency: get_current_student):

GET /me — Datos del alumno con su carrera y modalidad (joins a dim_careers y dim_modalities).

GET /enrollment-status — Devuelve el estado de inscripción del alumno para el periodo actual: "not_enrolled" (no ha seleccionado programa), "pending_validation" (esperando aprobación de coordinador), "active" (inscrito y activo), "blocked" (periodo no habilitado). También devuelve la configuración del sistema: enrollment_enabled, block_message, block_until_date. El frontend usa esto para decidir si muestra la pantalla de bloqueo o el dashboard.

GET /available-programs — Recibe query params: service_type (ss/pp). Devuelve programas de dim_programs filtrados por: career_id del alumno, service_type, periodo actual, status != "full", is_active=True. Incluye cupos disponibles de ops_program_availability.

POST /select-program — Recibe: service_type ("servicio_social" o "practica_profesional"), folio (string). Valida: el folio existe en dim_programs, el programa corresponde a la carrera del alumno, el programa es del tipo correcto (SS o PP), hay cupo disponible en ops_program_availability. Si todo válido: crear fact_enrollments con status="pending", crear ops_student_enrollments con status="pending_validation". Actualizar ops_program_availability (incrementar used_slots). Devolver datos del programa. Si cupo lleno: devolver error 409 "Este programa ya no tiene cupo disponible."

GET /processes — Devuelve los 4 procesos (inscripción, acreditación, cambio, baja) con su estado para el alumno. Cada proceso incluye: definición (de dim_process_definitions), estado actual (de ops_student_progress si existe, o "not_started"), es primario o no (is_primary), color. Para cambio y baja, solo están disponibles si el alumno tiene una inscripción activa.

GET /process/{process_code}/steps — Devuelve todos los pasos del proceso con su estado para el alumno (completed/current/pending), uploads por paso, mensajes por paso.

POST /change-request — Recibe: request_type ("cambio" o "baja"), justification (text, obligatorio), new_program_folio (solo para cambio, opcional). Crea fact_change_requests con status="pending". Si es cambio, inicia ops_student_progress para el proceso "cambio". Si es baja, inicia para "baja".

### document_router.py (prefix: /api/documents, dependency: get_current_student):

GET / — Devuelve los 4 documentos obligatorios del proceso de inscripción con su estado: origin (generated/student), current_status (de ops_upload_status), generation_info (de fact_document_generations si existe).

POST /generate/{document_type_code} — Genera PDF con ReportLab. Solo para documentos con origin="generated" (solicitud, carta_confidencialidad). Registra en fact_document_generations. Devuelve el archivo.

### upload_router.py (prefix: /api/uploads):

Para alumnos:
POST /submit — Recibe archivo + document_type_code + process_code + step_number. Valida formato (PDF, JPG, PNG, max 10MB). Calcula attempt_number. Guarda archivo. Crea fact_document_uploads. Actualiza ops_upload_status (current_status="pending_review", current_attempt++). Registra en audit log.

GET /my-uploads — Uploads del alumno agrupados por document_type.
GET /my-uploads/{document_type_code} — Historial de intentos de un documento.

Para admins:
GET /pending — Todos los uploads pending_review. Incluye datos del alumno.
GET /student/{student_id} — Todos los uploads de un alumno.
GET /{upload_id}/file — Devuelve el archivo para que el admin lo vea. FileResponse con content-type correcto.

POST /{upload_id}/approve — Aprueba. Crea fact_approval_actions. Actualiza ops_upload_status a "approved". Auto-advance: si el paso requiere upload Y el current_step del alumno coincide, Y TODOS los documentos requeridos del paso están aprobados (no solo este — los 4 docs deben estar approved), entonces avanza automáticamente. Crea fact_step_completions. Actualiza ops_student_progress.

POST /{upload_id}/reject — Rechaza con motivo. Crea fact_approval_actions. Actualiza ops_upload_status a "rejected" con reason.

### message_router.py (prefix: /api/messages):

Mismo que antes pero usando fact_messages y las tablas dimensionales. Endpoints para alumno (get messages, send message, unread count) y para admin (get student messages, send to student).

### admin_router.py (prefix: /api/admin, dependency: get_current_admin):

GET /dashboard-stats — Stats filtradas por periodo y año (query params). Total alumnos, distribución SS/PP, uploads pendientes, solicitudes pendientes (cambio/baja/inscripción), programas con cupo lleno.

GET /students — Lista filtrable: por periodo, año, modalidad (dim_modalities), estado (inscripción/acreditación/completado/baja), servicio (SS/PP), búsqueda por nombre/matrícula.
GET /students/{id} — Detalle completo del alumno con todo su historial.
POST /students/{id}/advance — Avanzar paso manualmente.
POST /students/{id}/set-step — Establecer paso arbitrario.

### enrollment_router.py (prefix: /api/admin/enrollments, dependency: get_current_admin):

GET /pending — Solicitudes de inscripción pendientes de validación.
GET /{enrollment_id} — Detalle de una solicitud.
POST /{enrollment_id}/approve — Aprobar inscripción. Cambia status en ops_student_enrollments a "active". Inicia ops_student_progress para el proceso de inscripción en paso 3 (ya completó selección de servicio y folio). Crea fact_approval_actions. Registra audit log.
POST /{enrollment_id}/reject — Rechazar con motivo. Libera el cupo en ops_program_availability (decrementa used_slots).

### change_request_router.py (prefix: /api/admin/change-requests, dependency: get_current_admin):

GET /pending — Solicitudes pendientes de cambio y baja.
GET /{id} — Detalle con justificación del alumno.
POST /{id}/approve — Aprobar. Si es cambio: actualizar ops_student_enrollments, liberar cupo del programa anterior, ocupar cupo del nuevo. Si es baja: marcar enrollment como cancelled, liberar cupo.
POST /{id}/reject — Rechazar con motivo.

### config_router.py (prefix: /api/admin/config, dependency: get_current_admin):

GET / — Devuelve toda la configuración de dim_system_config.
PUT /{config_key} — Actualizar un valor de configuración. Registra en audit log con before/after.

### period_router.py (prefix: /api/admin/periods, dependency: get_current_admin):

GET / — Lista de periodos.
POST / — Crear nuevo periodo.
PUT /{id} — Editar periodo (fechas, nombre).
POST /{id}/activate — Marcar como periodo actual (desactiva el anterior).

### program_router.py (prefix: /api/admin/programs, dependency: get_current_admin):

GET / — Lista de programas filtrable por periodo, carrera, tipo, disponibilidad.
POST /upload-excel — Recibe archivo Excel. Parsea las columnas (Folio, Programa, Tipo, Perfil, cupo, Industria, Sector, Evaluó, Inscritos, Cupo). Crea/actualiza dim_programs y ops_program_availability. Registra en audit log cuántos programas se crearon/actualizaron.
GET /stats — Estadísticas: total programas, por tipo, por carrera, cupos completos vs disponibles.

### deadline_router.py — Se mantiene igual.

---

## PASO 4 — FRONTEND: REDISEÑO COMPLETO DEL FLUJO DEL ALUMNO

### Nueva estructura de páginas del alumno:

```
src/pages/
├── LoginPage.tsx          (MODIFICAR: tabs Alumno/Admin + registro + link estatus)
├── RegisterPage.tsx       (MODIFICAR: campos nuevos — email user + @alm.buap.mx fijo, nombre en 3 campos, carrera dropdown, modalidad)
├── RegistrationStatusPage.tsx (ELIMINAR — ya no hay aprobación de registro)
├── BlockedPage.tsx        (NUEVO: pantalla de bloqueo con mensaje y fecha configurable)
├── student/
│   ├── StudentDashboard.tsx    (NUEVO: vista de bloques — Inscripción y Acreditación arriba, Cambio y Baja abajo)
│   ├── StudentProfile.tsx      (NUEVO: datos del alumno solo lectura)
│   ├── ProcessView.tsx         (NUEVO: cuando el alumno hace clic en un bloque, se despliega el proceso con stepper + documentos + uploads)
│   ├── ProgramSelector.tsx     (NUEVO: selección SS/PP + búsqueda por folio)
│   ├── DocumentsPanel.tsx      (MODIFICAR: los 4 docs obligatorios — 2 generados + 2 propios del alumno)
│   └── ChangeRequestForm.tsx   (NUEVO: formulario para solicitar cambio o baja con justificación)
```

### LoginPage.tsx — Modificaciones:

Tab Alumno: campo de email con @alm.buap.mx fijo a la derecha del input. El alumno solo escribe su usuario. Botón "Iniciar sesión". Link "¿No tienes cuenta? Regístrate" que va a /register. Link "¿Tienes una cuenta pero no puedes acceder? Contáctanos" (texto pasivo, sin link funcional aún).

Tab Administración: username + password. Sin cambios.

### RegisterPage.tsx — Rediseño completo:

Ya no tiene aprobación. El registro es inmediato. Campos:

Sección "Credencial de acceso":
- Correo institucional: input text a la izquierda + texto fijo "@alm.buap.mx" a la derecha en un div gris que visualmente se ve como parte del input. El alumno solo escribe su usuario (ej: "ana.reyes"). Validar que no contenga @. Visualmente debe quedar como: [ana.reyes][@alm.buap.mx]

Sección "Datos personales":
- Nombre(s): input text
- Apellido paterno: input text
- Apellido materno: input text
- Matrícula: input text, validación 9 dígitos numéricos
- Carrera: dropdown con las 7 carreras de dim_careers
- Modalidad: radio buttons con las 3 opciones (Escolarizado, Semi-escolarizado, Distancia) con descripción breve debajo de cada una si es necesario

Botón "Crear mi cuenta" con animación del SKILL. Al enviar exitosamente: crear cuenta + auto-login + redirigir al dashboard (o a la pantalla de bloqueo si el periodo no está habilitado).

### BlockedPage.tsx — NUEVA:

Pantalla que se muestra cuando enrollment_enabled=false o la fecha actual es menor a block_until_date. Diseño centrado, card grande con:
- Icono de candado (Lock de Lucide) grande, color gris
- Título: "Periodo de inscripción no habilitado"
- Mensaje: el block_message de dim_system_config
- Fecha: "Los procesos estarán disponibles a partir del [block_until_date]"
- Nota: "Mientras tanto, conserva el folio del programa al que deseas ingresar. Lo necesitarás cuando se habilite la inscripción."
- El sidebar y el menú de perfil SÍ son accesibles. Solo los bloques de proceso están bloqueados.

### StudentDashboard.tsx — NUEVO (reemplaza al DashboardPage actual):

El layout principal del alumno. Sidebar a la izquierda con:
- Logo del sistema
- Menú Inicio (icono Home)
- Menú Perfil (icono User)
- Al fondo: datos del alumno (nombre, matrícula, carrera) y botón cerrar sesión

Contenido principal — la vista de bloques:

Arriba, dos bloques grandes prominentes con colores diferenciados:

BLOQUE INSCRIPCIÓN (color azul, tamaño grande):
- Card grande con icono FileText, título "Inscripción a SS/PP", y subtexto con el estado actual ("No iniciado" / "En proceso — Paso 3 de 10" / "Completado").
- Si el alumno no tiene inscripción activa: el bloque dice "Iniciar inscripción" y al hacer clic navega a ProgramSelector.
- Si tiene inscripción activa: muestra un resumen compacto (programa, dependencia, paso actual) y al hacer clic se despliega/navega a ProcessView con todo el detalle del proceso.
- Barra de progreso visual en la parte inferior del bloque.

BLOQUE ACREDITACIÓN (color verde, tamaño grande):
- Similar al de inscripción pero para acreditación.
- Si el alumno no ha completado inscripción: el bloque está deshabilitado/gris con texto "Disponible al completar tu inscripción."
- Si inscripción completada: se activa y funciona igual que el bloque de inscripción.

Abajo, en texto pequeño y discreto (NO bloques grandes — texto tipo link con icono pequeño):

"Cambio de programa" — link que abre ChangeRequestForm con tipo "cambio". Solo visible si tiene inscripción activa.
"Baja de programa" — link que abre ChangeRequestForm con tipo "baja". Solo visible si tiene inscripción activa.

Si el alumno ya tiene una solicitud de cambio o baja pendiente, en vez del link muestra un badge: "Solicitud de cambio en revisión — pendiente de aprobación por la coordinación."

### StudentProfile.tsx — NUEVO:

Página de perfil solo lectura. Muestra en cards organizadas:
- Datos personales: nombre completo, matrícula, correo institucional, carrera, modalidad
- Datos del servicio (si ya está inscrito): tipo de servicio (SS/PP), programa, folio, dependencia, sector, tutor (si asignado)
- Historial: servicios anteriores (si los hay)

### ProgramSelector.tsx — NUEVO:

Se muestra cuando el alumno inicia su proceso de inscripción por primera vez. Dos pasos:

Paso 1: "¿Qué servicio deseas realizar?" — Dos cards grandes: "Servicio Social" y "Práctica Profesional". Cada una con una breve descripción. Al seleccionar, se resalta y aparece el paso 2.

Paso 2: "Ingresa el folio de tu programa" — Un campo de input grande con placeholder "Ej: 230765". Al escribir el folio y hacer clic en "Buscar", el sistema llama a la API. Si el folio existe, es del tipo correcto, corresponde a la carrera del alumno, y tiene cupo: muestra una card con todos los datos del programa (nombre, dependencia, sector, cupos disponibles). Botón "Confirmar inscripción" que crea la solicitud de inscripción (status pending_validation). Mensaje de confirmación: "Tu inscripción al programa [nombre] ha sido enviada. La coordinación validará tus datos y te notificará."

Si el folio no existe: "Este folio no se encontró. Verifica que sea correcto."
Si no corresponde a su carrera: "Este programa no está disponible para tu carrera ([carrera del alumno])."
Si no hay cupo: "Este programa ya completó su cupo. Selecciona otro programa."

### ProcessView.tsx — NUEVO:

Se muestra cuando el alumno hace clic en un bloque de proceso. Contiene:
- Título del proceso con badge de estado
- Stepper vertical (reutiliza el componente existente pero adaptado a los nuevos pasos)
- En cada paso: su estado (completed/current/pending), actor responsable con badge de color, acción requerida
- Para pasos con documentos generados: botón "Generar PDF" + zona de upload para subir firmado (reutiliza componentes existentes)
- Para pasos con documentos del alumno: solo zona de upload
- Mensajes del coordinador contextuales por paso
- Alertas de escáner donde aplique

### ChangeRequestForm.tsx — NUEVO:

Formulario para solicitar cambio o baja. Recibe el tipo como prop.

Si es cambio: muestra el programa actual del alumno, un campo para el folio del nuevo programa (con la misma búsqueda y validación de ProgramSelector), y un textarea obligatorio "Justifica tu motivo de cambio" (mínimo 50 caracteres).

Si es baja: muestra el programa actual, un textarea obligatorio "Justifica tu motivo de baja" (mínimo 50 caracteres), y una alerta tipo ResourceWarning del SKILL si genera recurso académico.

Al enviar: mensaje de confirmación "Tu solicitud ha sido enviada. La coordinación revisará tu caso. Este proceso puede tomar hasta [X] días hábiles."

### DocumentsPanel.tsx — MODIFICAR:

Ahora muestra específicamente los 4 documentos obligatorios organizados en dos secciones:

Sección "Documentos generados por el sistema" (Solicitud + Carta Confidencialidad):
- Cada uno muestra: botón generar PDF (si aún no se genera), botón descargar (si ya se generó), zona de upload para subir la versión firmada y sellada (con ScannerWarning), estado del upload (pending/approved/rejected).

Sección "Documentos que debes proporcionar" (Kárdex + Vigencia IMSS):
- Cada uno muestra: solo zona de upload (no hay PDF que generar), descripción de qué es y dónde obtenerlo, estado del upload.

---

## PASO 5 — FRONTEND: REDISEÑO DEL PANEL ADMIN

### Nuevo sidebar del admin:

```
Panel Admin
SS/PP · BUAP
─────────────
🏠 Dashboard
👥 Alumnos
📋 Solicitudes          [badge con total pendientes]
⚙️ Configuración
👤 Usuarios             (solo role=coordinador)
─────────────
← Cerrar sesión
```

### AdminDashboardPage.tsx — Rediseño:

Arriba: selectores de filtro — Periodo (dropdown: Otoño/Verano/Año) y Año (dropdown: 2026, 2027...). Estos filtros afectan TODAS las stats debajo.

Fila de stat cards (con useCountUp): Total alumnos, En Servicio Social, En Práctica Profesional, Uploads pendientes (badge rojo si >0), Solicitudes pendientes (badge rojo si >0).

Debajo, dos columnas:
- Izquierda: "Actividad reciente" — últimos 10 eventos (registros, inscripciones, uploads, aprobaciones) con timestamp relativo.
- Derecha: "Programas" — top 5 programas con más demanda (cupo casi lleno), y conteo de programas disponibles vs completos.

### AdminStudentsPage.tsx — Rediseño:

Barra de filtros: Periodo, Año, Modalidad (dropdown: Todas, Escolarizado, Semi, Distancia), Estado (dropdown: Todos, En inscripción, En acreditación, Completado, Baja, Cambio), Tipo (dropdown: Todos, SS, PP), Campo de búsqueda.

Tabla de alumnos igual que antes pero con las nuevas columnas: modalidad, periodo.

Detalle de alumno: igual que lo que ya funciona (tabs de progreso, documentos, mensajes, historial) pero adaptado a los nuevos modelos.

### AdminSolicitudesPage.tsx — NUEVO:

Tabs: "Inscripciones pendientes" | "Cambios pendientes" | "Bajas pendientes". Cada tab con badge de conteo.

Tab Inscripciones: lista de fact_enrollments con status="pending". Cada card muestra: nombre del alumno, matrícula, carrera, programa solicitado (con folio), dependencia, cupo del programa. Botones: "Aprobar" (validar que el Kárdex cumple requisitos) y "Rechazar" con motivo. Al aprobar: el alumno se activa en el proceso de inscripción paso 3 (ya completó selección y folio).

Tab Cambios: lista de fact_change_requests con type="cambio". Muestra: alumno, programa actual, programa nuevo solicitado, justificación del alumno. Botones aprobar/rechazar.

Tab Bajas: lista de fact_change_requests con type="baja". Muestra: alumno, programa actual, justificación. Alerta si genera recurso académico. Botones aprobar/rechazar.

### AdminConfigPage.tsx — NUEVO:

Secciones organizadas en cards:

Card "Periodo activo": muestra el periodo actual, botón para cambiar, crear nuevo periodo con fechas.

Card "Fechas del periodo": fecha de habilitación de inscripción (enrollment_start), fecha límite, fecha de cierre. Editable con datepickers.

Card "Bloqueo de portal": toggle para habilitar/deshabilitar inscripciones (enrollment_enabled), campo de texto para el mensaje de bloqueo, datepicker para la fecha de bloqueo.

Card "Programas": botón "Subir Excel de programas" que abre un uploader. Al subir, el sistema procesa el Excel, muestra un resumen ("Se importaron X programas, Y nuevos, Z actualizados"), y el admin confirma. Debajo: tabla con los programas cargados, filtrable por carrera, tipo, disponibilidad. Cada programa muestra cupo actual vs máximo.

### AdminUsersPage.tsx — Sin cambios (funciona igual).

---

## PASO 6 — RUTAS ACTUALIZADAS

```tsx
// Públicas (sin auth)
/                        → LoginPage
/register                → RegisterPage

// Alumno (requiere auth tipo student)
/student                 → StudentDashboard (o BlockedPage si periodo no habilitado)
/student/profile         → StudentProfile
/student/enroll          → ProgramSelector
/student/process/:code   → ProcessView (inscripcion, acreditacion, cambio, baja)
/student/documents       → DocumentsPanel
/student/change-request/:type → ChangeRequestForm

// Admin (requiere auth tipo admin)
/admin                   → AdminDashboardPage
/admin/students          → AdminStudentsPage
/admin/students/:id      → AdminStudentDetailPage
/admin/solicitudes       → AdminSolicitudesPage
/admin/config            → AdminConfigPage
/admin/users             → AdminUsersPage
```

---

## PASO 7 — VERIFICACIÓN FINAL

1. Eliminar database.db
2. cd backend && python seed.py — debe imprimir resumen de todas las tablas con conteos. Los 1,214+ programas del Excel deben aparecer cargados.
3. uvicorn main:app --reload --port 8000 — sin errores, /docs muestra todos los endpoints.
4. npm run dev — compila sin errores TypeScript.

Pruebas de flujo:

FLUJO REGISTRO:
5. Abrir localhost:5173 → Registrar alumno nuevo con email de prueba → verificar que entra directo al sistema → verificar que ve la pantalla de bloqueo (porque enrollment_enabled=false).

FLUJO ADMIN HABILITA PERIODO:
6. Login como admin → Configuración → Cambiar enrollment_enabled a true → Cambiar block_until_date a una fecha pasada.

FLUJO INSCRIPCIÓN:
7. Login como alumno → ahora ve los bloques → clic en Inscripción → seleccionar SS o PP → ingresar un folio real del Excel → verificar que muestra el programa → confirmar inscripción → verificar que queda en "pendiente de validación".
8. Login como admin → Solicitudes → tab Inscripciones → ver la solicitud → aprobar → verificar que el alumno pasa al paso 3 del proceso.
9. Login como alumno → ver que el bloque de Inscripción ahora muestra "En proceso — Paso 3" → clic → ver el stepper → generar PDF de Solicitud → descargar → subir un archivo de prueba como documento firmado.
10. Login como admin → ver upload pendiente → ver el archivo → aprobar → verificar auto-advance.

FLUJO CAMBIO/BAJA:
11. Login como alumno con inscripción activa → clic en "Cambio de programa" (texto pequeño abajo) → llenar justificación y folio nuevo → enviar.
12. Login como admin → Solicitudes → tab Cambios → aprobar → verificar que el alumno cambió de programa.

AUDIT LOG:
13. Verificar que fact_audit_log tiene registros de todas las acciones realizadas en las pruebas anteriores.

Deja ambos servidores corriendo. Imprime resumen final con URLs y credenciales.
