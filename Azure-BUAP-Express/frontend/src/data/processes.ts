import type { ProcessStepAPI } from '../services/api'

function createStep(
  step_number: number,
  title: string,
  description: string,
  actor: string,
  opts?: Partial<ProcessStepAPI>
): ProcessStepAPI {
  return {
    step_number,
    short_label: title,
    title,
    description,
    actor,
    requires_upload: false,
    requires_scan: false,
    has_generated_document: false,
    generated_document_type: null,
    has_student_document: false,
    student_document_type: null,
    action_required: '',
    warning_text: null,
    status: 'pending',
    uploads: [],
    messages: [],
    ...opts,
  }
}

export const INSCRIPCION_STEPS: ProcessStepAPI[] = [
  createStep(1, 'Convocatoria', 'Consulta la convocatoria oficial publicada en la página de Facebook de la Coordinación.', 'Coordinación SS-PP', { external_form_url: 'https://es-la.facebook.com/SSyPPFAdmonBUAP/' }),
  createStep(2, 'Pláticas de inducción', 'Visualiza la videograbación de las pláticas de inducción obligatorias para conocer los lineamientos.', 'Coordinación SS-PP'),
  createStep(3, 'Elección de proceso de inscripción', 'Selecciona si realizarás tu Servicio Social o Práctica Profesional en este periodo.', 'Alumno', { requires_process_choice: true }),
  createStep(4, 'Pre-registro en autoservicios', 'Ingresa a la plataforma oficial para realizar tu pre-registro inicial.', 'Alumno', { external_form_url: 'https://autoservicios.buap.mx' }),
  createStep(5, 'CONSULTA DE PROGRAMA EN AUTOSERVICIOS', 'Consulta cada folio de tu interés en autoservicios BUAP, ingresa cada folio para armar tu carrito de folios interesados.', 'Alumno', { requires_folio_search: true }),
  createStep(6, 'Solicitud de cita a la dependencia', 'Contacta a las dependencias de tus folios y marca cuáles aceptaron tu cita.', 'Alumno', { requires_appointment_check: true }),
  createStep(7, 'Descarga CPA por folios aceptados', 'Genera y descarga la Carta de Presentación y Aceptación por cada cita confirmada.', 'Alumno', { has_generated_document: true, generated_document_type: 'cpa' }),
  createStep(8, 'Obtención de Firmas y Sellos', 'Acude presencialmente para obtener la firma de la coordinación y luego la de tu dependencia.', 'Alumno', { warning_text: 'IMPORTANTE: Antes de recabar firmas en tu CPA, asegúrate que en la parte inferior aparezca el NOMBRE Y CARGO de quién firmará por parte de tu dependencia.' }),
  createStep(9, 'Descarga de Carta de Confidencialidad', 'Genera el documento de resguardo de información que requiere la universidad.', 'Alumno', { has_generated_document: true, generated_document_type: 'carta_confidencialidad_signed' }),
  createStep(10, 'Subir documentos', 'Selecciona tu programa final y carga los 4 documentos operativos: CPA, Carta de Confidencialidad, Kárdex y Vigencia IMSS.', 'Alumno', { requires_upload: true, required_documents: ['cpa_signed', 'carta_confidencialidad_signed', 'kardex_simple', 'vigencia_imss'] }),
  createStep(11, 'Aviso de inscripción', 'Tu expediente ha sido completado y estás formalmente inscrito al programa.', 'Sistema'),
]

export const ACREDITACION_STEPS: ProcessStepAPI[] = [
  createStep(1, 'Obligaciones Dependencia', 'La dependencia debe validar el desempeño del alumno, emitir reportes y carta de término', 'Dependencia'),
  createStep(2, 'Obligaciones Alumno', 'El alumno carga sus reportes finales, descarga guías y formatos para su validación', 'Alumno', { requires_upload: true, action_required: 'Accede a los códigos QR y sube tu información al formulario.' }),
  createStep(3, 'Obligaciones Tutor', 'El tutor revisa los documentos, avala el progreso académico y asienta la calificación', 'Tutor'),
  createStep(4, 'Obligaciones CPPC', 'La CPPC revisa el expediente completo y emite la liberación final del servicio', 'CPPC'),
]

export const CAMBIO_STEPS: ProcessStepAPI[] = [
  createStep(1, 'Búsqueda nuevo programa', 'Identificar el folio del nuevo programa en el catálogo', 'Alumno'),
  createStep(2, 'Descarga CPA', 'Descargar Carta de Presentación y Aceptación actual', 'Alumno', { has_generated_document: true, generated_document_type: 'cpa' }),
  createStep(3, 'Descarga formato cambio', 'Descargar el formato oficial de cambio de asignación', 'Alumno', { has_generated_document: true, generated_document_type: 'formato_cambio' }),
  createStep(4, 'Descarga carta confidencialidad', 'Descargar nueva carta de confidencialidad y compromiso', 'Alumno', { has_generated_document: true, generated_document_type: 'carta_confidencialidad' }),
  createStep(5, 'Carga al formulario sin firmas', 'Subir los documentos preliminares al formulario correspondiente', 'Alumno', { requires_upload: true }),
  createStep(6, 'Impresión + firma nueva dependencia', 'Imprimir los documentos, acudir a la nueva dependencia y obtener firmas y sellos', 'Alumno', { warning_text: 'Asegúrate de llevar todos los documentos impresos.' }),
  createStep(7, 'Acudir a CPPC con 5 documentos', 'Entregar los 5 documentos físicos directamente en ventanilla de la CPPC', 'Alumno'),
  createStep(8, 'Escanear y cargar a formulario', 'Subir la versión final de los documentos escaneados una vez avalados', 'Alumno', { requires_upload: true, requires_scan: true }),
  createStep(9, 'Retroalimentación por email', 'Esperar la validación y confirmación del trámite por correo', 'CPPC'),
  createStep(10, 'Solicitud cambio en Autoservicios', 'Realizar el trámite oficial de cambio en la plataforma institucional BUAP', 'Alumno', { external_form_url: 'https://autoservicios.buap.mx' } as any),
  createStep(11, 'Descarga nuevo nombramiento', 'Descargar el nuevo nombramiento oficial de asignación', 'Alumno', { has_generated_document: true, generated_document_type: 'nuevo_nombramiento' }),
]

export const EXENCION_STEPS: ProcessStepAPI[] = [
  createStep(1, 'Llenado formulario', 'Llenar el formulario de exención justificando el motivo y anexando comprobantes', 'Alumno', { requires_upload: true }),
  createStep(2, 'Validación CPPC por email (3 días)', 'Revisión técnica de la documentación probatoria enviada al correo de contacto', 'CPPC'),
  createStep(3, 'Vo.Bo. o rechazo (3 días)', 'Visto bueno final formal o notificación de rechazo', 'CPPC', { warning_text: 'Si es rechazado, deberás continuar tu proceso de inscripción habitual.' }),
  createStep(4, 'Inscripción oficial', 'Si fue aprobada, el sistema emite tu inscripción formal por exención', 'CPPC'),
]

export const FRONTEND_PROCESS_MAP: Record<string, ProcessStepAPI[]> = {
  inscripcion: INSCRIPCION_STEPS,
  acreditacion: ACREDITACION_STEPS,
  cambio: CAMBIO_STEPS,
  exencion: EXENCION_STEPS,
  baja: CAMBIO_STEPS, // Temporal map
}
