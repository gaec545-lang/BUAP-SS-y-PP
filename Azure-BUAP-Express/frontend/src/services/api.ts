import { FRONTEND_PROCESS_MAP } from '../data/processes'

const BASE = 'https://app-buap-backend.azurewebsites.net/api'

// Token management — stored in localStorage
let _token: string | null = localStorage.getItem('buap_token')

export function setToken(t: string | null) {
  _token = t
  if (t) localStorage.setItem('buap_token', t)
  else localStorage.removeItem('buap_token')
}

export function getToken(): string | null {
  return _token
}

async function checkStatus(res: Response): Promise<Response> {
  if (res.status === 401) {
    setToken(null)
    window.location.href = '/' // Force redirect to login
    throw new Error('Sesión expirada. Por favor, inicia sesión de nuevo.')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    const message = typeof err.detail === 'string' ? err.detail : 'Error en la solicitud'
    const error = new Error(message) as Error & { status: number; data: unknown }
    error.status = res.status
    error.data = err
    throw error
  }
  return res
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  }
  if (_token) {
    headers['Authorization'] = `Bearer ${_token}`
  }
  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  await checkStatus(res)
  return res.json()
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
  return request('/auth/register', { method: 'POST', body: JSON.stringify(data) })
}

export async function loginStudent(email: string): Promise<{
  token: string
  student: StudentAPI
  enrollment_status: string
}> {
  return request('/auth/student-login', { method: 'POST', body: JSON.stringify({ email }) })
}

export async function loginAdmin(username: string, password: string): Promise<{
  token: string
  admin: AdminAPI
}> {
  return request('/auth/admin-login', { method: 'POST', body: JSON.stringify({ username, password }) })
}

// ─────────────────────────────────────────────────────────────────────────────
// Student
// ─────────────────────────────────────────────────────────────────────────────

export async function getMe(): Promise<StudentAPI> {
  return request('/student/me')
}

export async function getEnrollmentStatus(): Promise<EnrollmentStatusAPI> {
  return request('/student/enrollment-status')
}

// Map frontend shortcodes to backend enum values
const SERVICE_TYPE_MAP: Record<string, string> = {
  ss: 'servicio_social',
  pp: 'practica_profesional',
}

export async function getAvailablePrograms(serviceType: string): Promise<any[]> {
  const backendType = SERVICE_TYPE_MAP[serviceType] ?? serviceType
  return request(`/student/available-programs?service_type=${encodeURIComponent(backendType)}`)
}

export async function getProgramByFolio(folio: string): Promise<any> {
  return request(`/student/programs/by-folio?folio=${encodeURIComponent(folio.trim())}`)
}

export async function selectProgram(serviceType: string, folio: string): Promise<any> {
  const backendType = SERVICE_TYPE_MAP[serviceType] ?? serviceType
  return request('/student/select-program', {
    method: 'POST',
    body: JSON.stringify({ service_type: backendType, folio }),
  })
}

export async function getProcesses(): Promise<ProcessAPI[]> {
  return request('/student/processes')
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
    result = await request(`/student/process/${processCode}/steps`)
  } catch (err) {
    // Si el backend no tiene este proceso (ej. exencion), creamos un estado base temporal
    result = {
      process: { name: processCode, code: processCode, total_steps: 0 },
      current_step: 1,
      status: 'active',
      steps: []
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
  return request('/student/change-request', { method: 'POST', body: JSON.stringify(data) })
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
  const headers: Record<string, string> = {}
  if (_token) headers['Authorization'] = `Bearer ${_token}`

  const query = new URLSearchParams({ process_code: processCode, step_number: String(stepNumber) })
  if (addressedTo) query.append('addressed_to', addressedTo)
  if (programFolio) query.append('program_folio', programFolio)
  if (phone_number) query.append('phone_number', phone_number)
  if (period) query.append('period', period)
  if (year_digit) query.append('year_digit', year_digit)
  if (month) query.append('month', month)
  if (responsible_position) query.append('responsible_position', responsible_position)

  const res = await fetch(`${BASE}/documents/generate/${documentTypeCode}?${query.toString()}`, {
    method: 'POST',
    headers,
  })
  await checkStatus(res)

  const blob = await res.blob()
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
  const headers: Record<string, string> = {}
  if (_token) headers['Authorization'] = `Bearer ${_token}`

  const formData = new FormData()
  formData.append('file', file)
  formData.append('document_type_code', documentTypeCode)

  formData.append('process_code', processCode)
  formData.append('step_number', String(stepNumber))

  const res = await fetch(`${BASE}/uploads/submit`, { method: 'POST', headers, body: formData })
  await checkStatus(res)
  return res.json()
}

export async function getMyUploads(): Promise<any[]> {
  return request('/uploads/my-uploads')
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin
// ─────────────────────────────────────────────────────────────────────────────

export async function adminGetMe(): Promise<AdminAPI> {
  return request('/admin/me')
}

export async function adminGetDashboardStats(): Promise<any> {
  return request('/admin/dashboard-stats')
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
  return request(`/admin/students${query ? `?${query}` : ''}`)
}

export async function adminGetStudent(id: number): Promise<any> {
  return request(`/admin/students/${id}`)
}

export async function adminAdvanceStep(
  studentId: number,
  processCode: string,
  notes?: string,
): Promise<any> {
  return request(`/admin/students/${studentId}/advance`, {
    method: 'POST',
    body: JSON.stringify({ process_code: processCode, notes }),
  })
}

export async function adminGetPendingUploads(): Promise<any[]> {
  return request('/uploads/pending')
}

export async function adminApproveUpload(uploadId: number): Promise<any> {
  return request(`/uploads/${uploadId}/approve`, { method: 'POST' })
}

export async function adminRejectUpload(uploadId: number, reason: string): Promise<any> {
  return request(`/uploads/${uploadId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export async function openUploadFile(uploadId: number): Promise<void> {
  const headers: Record<string, string> = {}
  if (_token) headers['Authorization'] = `Bearer ${_token}`
  const res = await fetch(`${BASE}/uploads/${uploadId}/file`, { headers })
  await checkStatus(res)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}

export async function adminGetPendingEnrollments(): Promise<any[]> {
  return request('/admin/enrollments/pending')
}

export async function adminApproveEnrollment(id: number): Promise<any> {
  return request(`/admin/enrollments/${id}/approve`, { method: 'POST' })
}

export async function adminRejectEnrollment(id: number, reason: string): Promise<any> {
  return request(`/admin/enrollments/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export async function adminGetPendingChangeRequests(): Promise<any[]> {
  return request('/admin/change-requests/pending')
}

export async function adminApproveChangeRequest(id: number): Promise<any> {
  return request(`/admin/change-requests/${id}/approve`, { method: 'POST' })
}

export async function adminRejectChangeRequest(id: number, reason: string): Promise<any> {
  return request(`/admin/change-requests/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export async function adminGetConfig(): Promise<any[]> {
  return request('/admin/process-config/types')
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
}

export async function addInterest(folio: string): Promise<any> {
  return request('/student/interests', { method: 'POST', body: JSON.stringify({ folio }) })
}

export async function getInterests(): Promise<InterestAPI[]> {
  return request('/student/interests')
}

export async function updateInterest(id: number, status?: string, addressedTo?: string): Promise<any> {
  return request(`/student/interests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, addressed_to: addressedTo })
  })
}

export async function removeInterest(id: number): Promise<any> {
  return request(`/student/interests/${id}`, { method: 'DELETE' })
}

export async function adminUpdateConfig(key: string, value: string): Promise<any> {
  return request(`/admin/config/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  })
}

export async function adminGetAuditLog(params?: {
  action?: string
  limit?: number
}): Promise<any[]> {
  const qs = params ? `?${new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString()}` : ''
  return request(`/admin/audit-log${qs}`)
}

export async function adminGetPeriods(): Promise<any[]> {
  return request('/admin/periods')
}

export async function adminGetPrograms(params?: any): Promise<any[]> {
  const qs = params ? `?${new URLSearchParams(params).toString()}` : ''
  return request(`/admin/programs${qs}`)
}

export async function adminGetProgramStats(): Promise<any> {
  return request('/admin/programs/stats')
}

export async function adminGetCareers(): Promise<any[]> {
  return request('/admin/careers')
}

export async function adminGetUsers(): Promise<any[]> {
  return request('/admin/users')
}

export async function adminCreateUser(data: any): Promise<any> {
  return request('/admin/users', { method: 'POST', body: JSON.stringify(data) })
}

export async function adminUpdateUser(id: number, data: any): Promise<any> {
  return request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function adminUploadPrograms(file: File): Promise<any> {
  const headers: Record<string, string> = {}
  if (_token) headers['Authorization'] = `Bearer ${_token}`

  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${BASE}/admin/programs/upload-excel`, {
    method: 'POST',
    headers,
    body: formData,
  })
  await checkStatus(res)
  return res.json()
}

// ─────────────────────────────────────────────────────────────────────────────
// Messages
// ─────────────────────────────────────────────────────────────────────────────

export async function getMyMessages(): Promise<MessageAPI[]> {
  return request('/messages/')
}

export async function sendMessage(
  processCode: string,
  stepNumber: number,
  message: string,
): Promise<any> {
  return request('/messages/', {
    method: 'POST',
    body: JSON.stringify({ process_code: processCode, step_number: stepNumber, message }),
  })
}

export async function getUnreadMessageCount(): Promise<number> {
  const data = await request<{ count: number }>('/messages/unread-count')
  return data.count
}

export async function adminGetStudentMessages(studentId: number): Promise<MessageAPI[]> {
  return request(`/messages/student/${studentId}`)
}

export async function adminSendMessageToStudent(
  studentId: number,
  processCode: string,
  stepNumber: number,
  message: string,
): Promise<any> {
  return request(`/messages/student/${studentId}`, {
    method: 'POST',
    body: JSON.stringify({ process_code: processCode, step_number: stepNumber, message }),
  })
}
