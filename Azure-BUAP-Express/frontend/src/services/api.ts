import axios from 'axios'
import { FRONTEND_PROCESS_MAP } from '../data/processes'

const API_URL = (import.meta.env.VITE_API_URL || "https://app-buap-backend-axgrbkabgsh2h6g8.mexicocentral-01.azurewebsites.net").replace(/\/api\/?$/, '') + '/api';

// Axios instance
export const api = axios.create({
  baseURL: API_URL.endsWith('/') ? API_URL : `${API_URL}/`,
  headers: {
    'Content-Type': 'application/json',
    'X-Evangelista-Secure': '1'
  }
});

// Token management — stored in sessionStorage to mitigate XSS persistence
// Migrate legacy localStorage token if it exists
if (localStorage.getItem('buap_token')) {
  sessionStorage.setItem('buap_token', localStorage.getItem('buap_token')!)
  localStorage.removeItem('buap_token')
}

let _token: string | null = sessionStorage.getItem('buap_token')

export function setToken(t: string | null) {
  _token = t
  if (t) sessionStorage.setItem('buap_token', t)
  else sessionStorage.removeItem('buap_token')
}

export function getToken(): string | null {
  return _token
}

// Request Interceptor: Inject Token
api.interceptors.request.use((config) => {
  if (_token) {
    config.headers.Authorization = `Bearer ${_token}`
  }
  return config
})

// Response Interceptor: Handle 401 and Errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      setToken(null)
      window.location.href = '/'
      return Promise.reject(new Error('Sesión expirada. Por favor, inicia sesión de nuevo.'))
    }
    const detail = error.response?.data?.detail || error.message || 'Error en la solicitud'
    const err = new Error(typeof detail === 'string' ? detail : 'Error en la solicitud') as any
    err.status = error.response?.status
    err.response = error.response
    return Promise.reject(err)
  }
)

async function request<T>(path: string, options: any = {}): Promise<T> {
  const method = (options.method || 'GET').toLowerCase()
  
  // If body is already a string, we might need to parse it for axios, 
  // but axios also accepts objects. Let's be flexible.
  let data = options.body
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data)
    } catch (e) {
      // Keep as string if not valid JSON
    }
  }

  const res = await api.request({
    url: path,
    method,
    data,
    headers: options.headers
  })
  return res.data
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Career {
  id: number
  code: string
  name: string
}

export interface Modality {
  id: number
  code: string
  name: string
}

export interface StudentAPI {
  id: number
  email: string
  full_name: string
  first_name: string
  matricula: string
  career: Career | null
  modality: Modality | null
  study_plan: string | null
}

export interface AdminAPI {
  id: number
  username: string
  full_name: string
  role: string
}

export interface ProcessAPI {
  id: number
  code: string
  name: string
  is_primary: boolean
  generates_resource: boolean
  color_code: string
  display_order: number
  available: boolean
  total_steps: number
  current_step: number
  status: string
  started_at: string | null
}

export interface UploadStatusAPI {
  document_type_code: string
  document_type_name: string
  status: string
  attempt: number
  rejection_reason: string | null
}

export interface MessageAPI {
  id: number
  sender_type: string
  sender_name: string
  message: string
  created_at: string
}

export interface ProcessStepAPI {
  step_number: number
  title: string
  short_label: string
  description: string
  actor: string
  requires_upload: boolean
  requires_scan: boolean
  has_generated_document: boolean
  generated_document_type: string | null
  has_student_document: boolean
  student_document_type: string | null
  action_required: string
  warning_text: string | null
  status: 'completed' | 'current' | 'pending'
  uploads: UploadStatusAPI[]
  messages: MessageAPI[]
  required_documents?: string[]
  requires_folio_search?: boolean
  requires_appointment_check?: boolean
  requires_process_choice?: boolean
  external_form_url?: string
}

export interface EnrollmentStatusAPI {
  status: 'blocked' | 'not_enrolled' | 'pending_validation' | 'active' | 'completed' | 'cancelled'
  enrollment_id: number | null
  program: {
    id: number
    folio: string
    name: string
    dependency_name: string
    program_type: string
  } | null
  config: {
    enrollment_enabled: string
    block_message: string
    block_until_date: string
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────

export async function registerStudent(data: {
  email_user: string
  email_domain: string
  first_name: string
  last_name_paterno: string
  last_name_materno: string
  matricula: string
  career_code: string
  modality_code: string
  study_plan: string
}): Promise<{ token: string; student: StudentAPI }> {
  return request('auth/register', { method: 'POST', body: JSON.stringify(data) })
}

export async function loginStudent(email: string): Promise<{
  token: string
  student: StudentAPI
  enrollment_status: string
}> {
  return request('auth/student-login', { method: 'POST', body: JSON.stringify({ email }) })
}

export async function loginAdmin(username: string, password: string): Promise<{
  token: string
  admin: AdminAPI
}> {
  return request('auth/admin-login', { method: 'POST', body: JSON.stringify({ username, password }) })
}

// ─────────────────────────────────────────────────────────────────────────────
// Student
// ─────────────────────────────────────────────────────────────────────────────

export async function getMe(): Promise<StudentAPI> {
  return request('student/me')
}

export async function getEnrollmentStatus(): Promise<EnrollmentStatusAPI> {
  return request('student/enrollment-status')
}

// Map frontend shortcodes to backend enum values
const SERVICE_TYPE_MAP: Record<string, string> = {
  ss: 'servicio_social',
  pp: 'practica_profesional',
}

export async function getAvailablePrograms(serviceType: string): Promise<any[]> {
  const backendType = SERVICE_TYPE_MAP[serviceType] ?? serviceType
  return request(`student/available-programs?service_type=${encodeURIComponent(backendType)}`)
}

export async function getProgramByFolio(folio: string): Promise<any> {
  return request(`student/programs/by-folio?folio=${encodeURIComponent(folio.trim())}`)
}

export async function selectProgram(serviceType: string, folio: string): Promise<any> {
  const backendType = SERVICE_TYPE_MAP[serviceType] ?? serviceType
  return request('student/select-program', {
    method: 'POST',
    body: JSON.stringify({ service_type: backendType, folio }),
  })
}

export async function getProcesses(): Promise<ProcessAPI[]> {
  return request('student/processes')
}

export function advanceFrontendStep(processCode: string, targetStepNumber: number) {
  localStorage.setItem(`buap_frontend_step_${processCode}`, String(targetStepNumber))
}

export function regressFrontendStep(processCode: string, currentStepNumber: number) {
  const target = Math.max(1, currentStepNumber - 1)
  localStorage.setItem(`buap_frontend_step_${processCode}`, String(target))
}

export function getFrontendStep(processCode: string): number {
  const v = localStorage.getItem(`buap_frontend_step_${processCode}`)
  return v ? parseInt(v, 10) : 1
}

export async function getProcessSteps(processCode: string): Promise<{
  process: any
  current_step: number
  status: string
  steps: ProcessStepAPI[]
}> {
  let result: any = null
  try {
    result = await request(`student/process/${processCode}/steps`)
  } catch (err: any) {
    // Si el backend no tiene este proceso (ej. exencion), devuelve 404.
    // Solo enmascaramos el error 404 para crear un estado base temporal.
    if (err.status === 404) {
      result = {
        process: { name: processCode, code: processCode, total_steps: 0 },
        current_step: 1,
        status: 'active',
        steps: []
      }
    } else {
      // Lanzamos otros errores (ej. 500, red) para que la UI los maneje y muestre correctamente.
      throw err
    }
  }

  // -- FRONTEND OVERRIDE LOGIC --
  let overrideSteps = FRONTEND_PROCESS_MAP[processCode]
  if (!overrideSteps) {
    if (processCode.includes('inscripcion') || processCode.includes('ss_') || processCode.includes('pp_')) {
      overrideSteps = FRONTEND_PROCESS_MAP['inscripcion']
    } else if (processCode.includes('acreditacion')) {
      overrideSteps = FRONTEND_PROCESS_MAP['acreditacion']
    }
  }

  if (overrideSteps) {
    const backendCurrent = result.current_step || 1
    const frontendCurrent = getFrontendStep(processCode)

    const mappedSteps = overrideSteps.map((localStep, index) => {
      const stepNum = index + 1
      let status: 'completed' | 'current' | 'pending' = 'pending'

      if (stepNum < frontendCurrent) status = 'completed'
      else if (stepNum === frontendCurrent) status = 'current'

      return {
        ...localStep,
        status,
        step_number: stepNum,
        uploads: status === 'current' ? (result.steps[backendCurrent - 1]?.uploads || []) : [],
        messages: status === 'current' ? (result.steps[backendCurrent - 1]?.messages || []) : []
      }
    })

    return {
      ...result,
      steps: mappedSteps,
      current_step: frontendCurrent,
      process: { ...result.process, total_steps: mappedSteps.length }
    }
  }

  return result
}

export async function submitChangeRequest(data: {
  request_type: string
  justification: string
  new_program_folio?: string
}): Promise<any> {
  return request('student/change-request', { method: 'POST', body: JSON.stringify(data) })
}

// ─────────────────────────────────────────────────────────────────────────────
// Documents
// ─────────────────────────────────────────────────────────────────────────────

export async function generateDocument(
  documentTypeCode: string,
  processCode: string,
  stepNumber: number,
  addressedTo?: string,
  programFolio?: string,
  phone_number?: string,
  period?: string,
  year_digit?: string,
  month?: string,
  responsible_position?: string
): Promise<void> {
  const query = new URLSearchParams({ process_code: processCode, step_number: String(stepNumber) })
  if (addressedTo) query.append('addressed_to', addressedTo)
  if (programFolio) query.append('program_folio', programFolio)
  if (phone_number) query.append('phone_number', phone_number)
  if (period) query.append('period', period)
  if (year_digit) query.append('year_digit', year_digit)
  if (month) query.append('month', month)
  if (responsible_position) query.append('responsible_position', responsible_position)

  const res = await api.post(`documents/generate/${documentTypeCode}?${query.toString()}`, null, {
    responseType: 'blob'
  })

  const blob = res.data
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${documentTypeCode}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─────────────────────────────────────────────────────────────────────────────
// Uploads
// ─────────────────────────────────────────────────────────────────────────────

export async function submitUpload(
  file: File,
  documentTypeCode: string,
  processCode: string,
  stepNumber: number,
): Promise<any> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('document_type_code', documentTypeCode)

  formData.append('process_code', processCode)
  formData.append('step_number', String(stepNumber))

  const res = await api.post('uploads/submit', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return res.data
}

export async function getMyUploads(): Promise<any[]> {
  return request('uploads/my-uploads')
}

export async function getMyFiles(): Promise<any[]> {
  return request('uploads/my-files')
}


// ─────────────────────────────────────────────────────────────────────────────
// Admin
// ─────────────────────────────────────────────────────────────────────────────

export async function adminGetMe(): Promise<AdminAPI> {
  return request('admin/me')
}

export async function adminGetDashboardStats(): Promise<any> {
  return request('admin/dashboard-stats')
}

export async function adminGetStudents(params?: {
  search?: string
  modality_code?: string
  service_type?: string
}): Promise<any[]> {
  const qs = new URLSearchParams()
  if (params?.search) qs.set('search', params.search)
  if (params?.modality_code) qs.set('modality_code', params.modality_code)
  if (params?.service_type) qs.set('service_type', params.service_type)
  const query = qs.toString()
  return request(`admin/students${query ? `?${query}` : ''}`)
}

export async function adminGetStudent(id: number): Promise<any> {
  return request(`admin/students/${id}`)
}

export async function adminAdvanceStep(
  studentId: number,
  processCode: string,
  notes?: string,
): Promise<any> {
  return request(`admin/students/${studentId}/advance`, {
    method: 'POST',
    body: JSON.stringify({ process_code: processCode, notes }),
  })
}

export async function adminGetPendingUploads(): Promise<any[]> {
  const data = await request<any[]>('uploads/pending')
  return (data || []).map((item: any) => ({
    id: item.upload_id,
    student_id: item.student?.id ?? 0,
    student_name: item.student?.full_name ?? 'Alumno',
    student_matricula: item.student?.matricula ?? '',
    step_number: item.step_number,
    document_type: typeof item.document_type === 'object'
      ? (item.document_type?.name ?? item.document_type?.code ?? 'Documento')
      : (item.document_type ?? 'Documento'),
    original_filename: item.original_filename,
    attempt_number: item.attempt_number,
    uploaded_at: item.uploaded_at,
    status: item.status ?? 'pending',
    folio: item.folio,
    // Keep raw properties in case they are referenced
    upload_id: item.upload_id,
    student: item.student,
  }))
}

export async function adminGetStudentUploads(studentId: number): Promise<any[]> {
  return request(`uploads/student/${studentId}`)
}


export async function adminApproveUpload(uploadId: number): Promise<any> {
  return request(`uploads/${uploadId}/approve`, { method: 'POST' })
}

export async function adminRejectUpload(uploadId: number, reason: string): Promise<any> {
  return request(`uploads/${uploadId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export async function openUploadFile(uploadId: number): Promise<void> {
  const res = await api.get(`uploads/${uploadId}/file`, {
    responseType: 'blob'
  })
  const blob = res.data
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}

export async function getUploadBlobUrl(uploadId: number): Promise<string> {
  const res = await api.get(`uploads/${uploadId}/file`, {
    responseType: 'blob'
  })
  return URL.createObjectURL(res.data)
}

export async function adminGetPendingEnrollments(): Promise<any[]> {
  return request('admin/enrollments/pending')
}

export async function adminApproveEnrollment(id: number): Promise<any> {
  return request(`admin/enrollments/${id}/approve`, { method: 'POST' })
}

export async function adminRejectEnrollment(id: number, reason: string): Promise<any> {
  return request(`admin/enrollments/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export async function adminGetPendingChangeRequests(): Promise<any[]> {
  return request('admin/change-requests/pending')
}

export async function adminApproveChangeRequest(id: number): Promise<any> {
  return request(`admin/change-requests/${id}/approve`, { method: 'POST' })
}

export async function adminRejectChangeRequest(id: number, reason: string): Promise<any> {
  return request(`admin/change-requests/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export async function adminGetConfig(): Promise<any[]> {
  return request('admin/config')
}

// ─────────────────────────────────────────────────────────────────────────────
// V2 Interests API
// ─────────────────────────────────────────────────────────────────────────────

export interface InterestAPI {
  id: number
  program_id: number
  folio: string
  name: string
  program_name?: string
  dependency_name: string
  status: string
  max_slots: number
  used_slots: number
  interested_count: number
  addressed_to?: string
  responsible_name?: string
  responsible_position?: string
}


export async function addInterest(folio: string): Promise<any> {
  return request('student/interests', { method: 'POST', body: JSON.stringify({ folio }) })
}

export async function getInterests(): Promise<InterestAPI[]> {
  return request('student/interests')
}

export async function updateInterest(id: number, status?: string, addressedTo?: string): Promise<any> {
  return request(`student/interests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, addressed_to: addressedTo })
  })
}

export async function removeInterest(id: number): Promise<any> {
  return request(`student/interests/${id}`, { method: 'DELETE' })
}

export async function adminUpdateConfig(key: string, value: string): Promise<any> {
  return request(`admin/config/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  })
}

export async function adminGetAuditLog(params?: {
  action?: string
  limit?: number
}): Promise<any[]> {
  const qs = params ? `?${new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString()}` : ''
  return request(`admin/audit-log${qs}`)
}

export async function adminGetPeriods(): Promise<any[]> {
  return request('admin/periods')
}

export async function adminGetPrograms(params?: any): Promise<any[]> {
  const qs = params ? `?${new URLSearchParams(params).toString()}` : ''
  return request(`admin/programs${qs}`)
}

export async function adminGetProgramStats(): Promise<any> {
  return request('admin/programs/stats')
}

export async function adminGetCareers(): Promise<any[]> {
  return request('admin/careers')
}

export async function adminGetUsers(): Promise<any[]> {
  return request('admin/users')
}

export async function adminCreateUser(data: any): Promise<any> {
  return request('admin/users', { method: 'POST', body: JSON.stringify(data) })
}

export async function adminUpdateUser(id: number, data: any): Promise<any> {
  return request(`admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function adminUploadPrograms(file: File): Promise<any> {
  const formData = new FormData()
  formData.append('file', file)

  console.log('--- Iniciando carga de Excel ---')
  // 1. Post the file — returns immediately with a job_id
  const res = await api.post('admin/programs/upload-excel', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  
  console.log('Respuesta del servidor (POST):', res.data)
  const job_id = res.data?.job_id
  
  if (!job_id) {
    console.error('ERROR: No se recibió job_id. Estructura de res.data:', res.data)
    throw new Error('No se recibió job_id del servidor.')
  }

  console.log(`Job ID recibido: ${job_id}. Iniciando polling cada 3s...`)

  // 2. Poll for completion every 3 seconds (max 10 minutes)
  const MAX_POLLS = 200  // 200 * 3s = 600s max
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise(r => setTimeout(r, 3000))
    
    try {
      const statusRes = await api.get(`admin/programs/upload-status/${job_id}`)
      console.log(`Polling [${i}]:`, statusRes.data)
      
      const { status, result } = statusRes.data
      if (status === 'done') {
        console.log('Procesamiento completado con éxito.')
        return result
      }
      if (status === 'error') {
        console.error('Error reportado por el backend:', result)
        throw new Error(result?.detail || 'Error en el procesamiento del Excel.')
      }
    } catch (pollError: any) {
      console.warn('Error en polling (reintentando...):', pollError.message)
      // Si el error es 404, el backend podría haber perdido el job (si no es persistente)
      // Pero ahora es persistente en DB, así que no debería pasar.
    }
  }
  throw new Error('El procesamiento tardó demasiado. Refresca la página y revisa si los programas fueron cargados.')
}

export async function adminUploadProgramsPdf(files: File | File[]): Promise<any> {
  const fileList = Array.isArray(files) ? files : [files]
  const formData = new FormData()
  fileList.forEach(file => {
    formData.append('files', file)
  })

  console.log('--- Iniciando carga masiva de PDFs ---')
  const res = await api.post('admin/programs/upload-pdf', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  
  const job_id = res.data?.job_id
  if (!job_id) {
    throw new Error('No se recibió job_id del servidor para el PDF.')
  }

  console.log(`Job PDF ID: ${job_id}. Iniciando polling...`)

  const MAX_POLLS = 100
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise(r => setTimeout(r, 2000))
    
    const statusRes = await api.get(`admin/programs/upload-status/${job_id}`)
    const { status, result } = statusRes.data
    
    if (status === 'done') {
      return result
    }
    if (status === 'error') {
      throw new Error(result?.detail || 'Error en el procesamiento de los PDFs.')
    }
  }
  throw new Error('El procesamiento de PDFs tardó demasiado.')
}




// ─────────────────────────────────────────────────────────────────────────────
// Messages
// ─────────────────────────────────────────────────────────────────────────────

export async function getMyMessages(): Promise<MessageAPI[]> {
  return request('messages/my-messages')
}

export async function sendMessage(
  processCode: string,
  stepNumber: number,
  message: string,
): Promise<any> {
  return request('messages/send', {
    method: 'POST',
    body: JSON.stringify({ process_code: processCode, step_number: stepNumber, message }),
  })
}

export async function getUnreadMessageCount(): Promise<number> {
  const data = await request<{ unread_count: number }>('messages/unread-count')
  return data.unread_count
}

export async function adminGetStudentMessages(studentId: number): Promise<MessageAPI[]> {
  return request(`messages/admin/student/${studentId}`)
}

export async function adminSendMessageToStudent(
  studentId: number,
  processCode: string,
  stepNumber: number,
  message: string,
): Promise<any> {
  return request(`messages/admin/send/${studentId}`, {
    method: 'POST',
    body: JSON.stringify({ process_code: processCode, step_number: stepNumber, message }),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Developer Panel
// ─────────────────────────────────────────────────────────────────────────────

export async function developerLogin(credentials: any): Promise<any> {
  return request('developer/login', { method: 'POST', body: JSON.stringify(credentials) })
}

export async function developerGetStatus(): Promise<any> {
  return request('developer/status')
}

export async function developerGetActiveSessions(): Promise<any[]> {
  return request('developer/active-sessions')
}

export async function developerGetUploadLogs(): Promise<any[]> {
  return request('developer/upload-logs')
}

export async function developerDeleteStudent(id: number): Promise<any> {
  return request(`developer/users/student/${id}`, { method: 'DELETE' })
}

export async function developerDeleteAdmin(id: number): Promise<any> {
  return request(`developer/users/admin/${id}`, { method: 'DELETE' })
}

export async function validateDocument(file: File, studentId?: number): Promise<any> {
  const formData = new FormData()
  formData.append('file', file)
  if (studentId) {
    formData.append('student_id', studentId.toString())
  }
  const res = await api.post('validate/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return res.data
}

export async function validateUnifiedDocuments(files: Record<string, File | null>, studentId?: number, folio?: string): Promise<any> {
  const formData = new FormData()
  
  Object.entries(files).forEach(([key, file]) => {
    if (file) {
      formData.append(key, file)
    }
  })
  
  if (studentId) {
    formData.append('student_id', studentId.toString())
  }
  
  if (folio) {
    formData.append('folio', folio)
  }
  
  const res = await api.post('validate/upload-batch', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return res.data
}


