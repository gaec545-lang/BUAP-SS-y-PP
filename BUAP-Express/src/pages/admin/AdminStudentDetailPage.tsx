import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  ChevronRight,
  User,
  BookOpen,
  FileText,
  MessageSquare,
  Send,
} from 'lucide-react'
import { AdminLayout, AdminPageHeader } from './AdminLayout'
import {
  adminGetStudent,
  adminAdvanceStep,
  adminGetPendingUploads,
  adminApproveUpload,
  adminRejectUpload,
  openUploadFile,
  adminGetStudentMessages,
  adminSendMessageToStudent,
} from '../../services/api'

// ─────────────────────────────────────────────────────────────────────────────
// Step status badge
// ─────────────────────────────────────────────────────────────────────────────

function StepStatusDot({ status }: { status: string }) {
  const cls =
    status === 'completed'
      ? 'bg-success'
      : status === 'current'
      ? 'bg-primary-500 animate-pulse-soft'
      : 'bg-surface-divider'
  return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cls}`} />
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload item
// ─────────────────────────────────────────────────────────────────────────────

function UploadItem({
  upload,
  onRefresh,
}: {
  upload: any
  onRefresh: () => void
}) {
  const [appLoading, setAppLoading] = useState(false)
  const [rejLoading, setRejLoading] = useState(false)
  const [viewLoading, setViewLoading] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleApprove() {
    setAppLoading(true)
    try {
      await adminApproveUpload(upload.id)
      onRefresh()
    } catch (err: any) {
      setError(err.message ?? 'Error')
    } finally {
      setAppLoading(false)
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) return
    setRejLoading(true)
    try {
      await adminRejectUpload(upload.id, rejectReason)
      onRefresh()
    } catch (err: any) {
      setError(err.message ?? 'Error')
    } finally {
      setRejLoading(false)
    }
  }

  async function handleView() {
    setViewLoading(true)
    try {
      await openUploadFile(upload.id)
    } catch (err: any) {
      setError(err.message ?? 'Error')
    } finally {
      setViewLoading(false)
    }
  }

  const statusBadge: Record<string, { label: string; cls: string }> = {
    pending: { label: 'Pendiente', cls: 'bg-warning-light text-warning-dark' },
    approved: { label: 'Aprobado', cls: 'bg-success-light text-success-dark' },
    rejected: { label: 'Rechazado', cls: 'bg-danger-light text-danger-dark' },
  }
  const badge = statusBadge[upload.status] ?? statusBadge.pending

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg border border-surface-border bg-white">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-content-primary truncate">
            {upload.document_type_name ?? upload.document_type ?? 'Documento'}
          </p>
          <p className="text-xs text-content-secondary">
            Intento {upload.attempt ?? upload.attempt_number ?? 1}
          </p>
        </div>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-badge text-xs font-medium ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      {upload.rejection_reason && (
        <p className="text-xs text-danger-dark bg-danger-light p-2 rounded">
          {upload.rejection_reason}
        </p>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}

      {upload.status === 'pending' && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleView}
            disabled={viewLoading}
            className="flex items-center gap-1 px-2 py-1 text-xs border border-surface-border
                       rounded-button hover:bg-surface-hover transition-colors duration-150"
          >
            {viewLoading ? <Loader2 size={11} className="animate-spin" /> : <Eye size={11} />}
            Ver
          </button>
          <button
            type="button"
            onClick={handleApprove}
            disabled={appLoading}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-success hover:bg-success-dark
                       text-white rounded-button transition-colors duration-150"
          >
            {appLoading ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
            Aprobar
          </button>
          {!showRejectInput ? (
            <button
              type="button"
              onClick={() => setShowRejectInput(true)}
              className="flex items-center gap-1 px-2 py-1 text-xs border border-danger/30 bg-danger-light
                         text-danger-dark rounded-button transition-colors duration-150"
            >
              <XCircle size={11} />
              Rechazar
            </button>
          ) : (
            <div className="flex gap-1 flex-1">
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Motivo..."
                className="flex-1 px-2 py-1 text-xs rounded-input border border-surface-border
                           focus:outline-none focus:ring-1 focus:ring-primary-300"
              />
              <button
                type="button"
                onClick={handleReject}
                disabled={rejLoading || !rejectReason.trim()}
                className="px-2 py-1 text-xs bg-danger text-white rounded-button
                           disabled:opacity-50 transition-colors"
              >
                {rejLoading ? <Loader2 size={11} className="animate-spin" /> : 'OK'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Messages panel
// ─────────────────────────────────────────────────────────────────────────────

function MessagesPanel({
  studentId,
  processCode,
}: {
  studentId: number
  processCode?: string
}) {
  const [messages, setMessages] = useState<any[]>([])
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)

  async function loadMessages() {
    try {
      const data = await adminGetStudentMessages(studentId)
      setMessages(data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadMessages() }, [studentId])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!msg.trim() || !processCode) return
    setSending(true)
    try {
      await adminSendMessageToStudent(studentId, processCode, 1, msg.trim())
      setMsg('')
      loadMessages()
    } catch {}
    setSending(false)
  }

  return (
    <div className="bg-white rounded-card border border-surface-border shadow-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare size={16} className="text-content-secondary" />
        <h3 className="text-sm font-semibold text-content-primary">Mensajes</h3>
      </div>
      {loading ? (
        <div className="h-4 bg-gray-100 rounded animate-pulse" />
      ) : messages.length === 0 ? (
        <p className="text-xs text-content-tertiary italic">Sin mensajes aún.</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`p-2 rounded-lg text-xs ${
                m.sender_type === 'admin' ? 'bg-primary-50 ml-8' : 'bg-surface mr-8'
              }`}
            >
              <span className="font-medium text-content-secondary block mb-0.5">{m.sender_name}</span>
              <span className="text-content-primary">{m.message}</span>
            </div>
          ))}
        </div>
      )}
      {processCode && (
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1 px-2 py-1.5 text-xs rounded-input border border-surface-border
                       focus:outline-none focus:ring-1 focus:ring-primary-300"
          />
          <button
            type="submit"
            disabled={sending || !msg.trim()}
            className="px-2 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300
                       text-white rounded-button text-xs transition-colors"
          >
            {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          </button>
        </form>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export function AdminStudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [advLoading, setAdvLoading] = useState<string | null>(null)
  const [studentUploads, setStudentUploads] = useState<any[]>([])

  async function load() {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [studentData, allUploads] = await Promise.all([
        adminGetStudent(Number(id)),
        adminGetPendingUploads().catch(() => []),
      ])
      setData(studentData)
      // Filter uploads for this student
      const filtered = allUploads.filter(
        (u: any) => u.student_id === Number(id) || u.student?.id === Number(id),
      )
      setStudentUploads(filtered)
    } catch (err: any) {
      setError(err.message ?? 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function handleAdvance(processCode: string) {
    setAdvLoading(processCode)
    setError(null)
    try {
      await adminAdvanceStep(Number(id), processCode)
      await load()
    } catch (err: any) {
      setError(err.message ?? 'Error al avanzar paso')
    } finally {
      setAdvLoading(null)
    }
  }

  const student = data?.student ?? data
  const processes: any[] = data?.processes ?? []
  const enrollment = data?.enrollment_status ?? null
  const activeProcess = processes.find((p) => p.status === 'active') ?? processes[0]

  return (
    <AdminLayout>
      <AdminPageHeader
        breadcrumb={['Admin', 'Alumnos', student?.full_name ?? 'Detalle']}
        title={student?.full_name ?? 'Alumno'}
        subtitle={student?.matricula}
        actions={
          <button
            onClick={() => navigate('/admin/students')}
            className="flex items-center gap-1.5 text-sm text-content-secondary
                       hover:text-content-primary transition-colors duration-150"
          >
            <ArrowLeft size={16} />
            Volver a alumnos
          </button>
        }
      />

      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={24} className="animate-spin text-primary-500" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-card bg-danger-light border border-danger/20">
          <AlertCircle size={16} className="text-danger" />
          <p className="text-sm text-danger-dark">{error}</p>
          <button onClick={load} className="ml-auto flex items-center gap-1 text-xs text-danger-dark underline">
            <RefreshCw size={12} /> Reintentar
          </button>
        </div>
      )}

      {!loading && !error && student && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Left column: student info */}
          <div className="space-y-5">
            {/* Personal data */}
            <div className="bg-white rounded-card border border-surface-border shadow-card p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <User size={18} className="text-primary-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-content-primary">{student.full_name}</p>
                  <p className="text-xs font-mono text-content-secondary">{student.matricula}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-content-tertiary">Carrera</span>
                  <span className="text-xs text-content-secondary">
                    {student.career?.code ?? student.career ?? '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-content-tertiary">Modalidad</span>
                  <span className="text-xs text-content-secondary capitalize">
                    {student.modality?.code?.replace('_', ' ') ?? student.modality ?? '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-content-tertiary">Correo</span>
                  <span className="text-xs text-content-secondary truncate max-w-[140px]">{student.email}</span>
                </div>
              </div>
            </div>

            {/* Enrollment */}
            {enrollment && (
              <div className="bg-white rounded-card border border-surface-border shadow-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen size={16} className="text-content-secondary" />
                  <h3 className="text-sm font-semibold text-content-primary">Inscripción</h3>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-xs text-content-tertiary">Estado</span>
                    <span className="text-xs font-medium text-content-primary capitalize">
                      {enrollment.status?.replace('_', ' ') ?? '—'}
                    </span>
                  </div>
                  {enrollment.program && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-xs text-content-tertiary">Programa</span>
                        <span className="text-xs text-content-secondary max-w-[140px] truncate text-right">
                          {enrollment.program.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-content-tertiary">Folio</span>
                        <span className="text-xs font-mono text-content-secondary">
                          {enrollment.program.folio}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Uploads for this student */}
            {studentUploads.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-content-tertiary uppercase tracking-wider">
                  Documentos pendientes
                </h3>
                {studentUploads.map((u) => (
                  <UploadItem key={u.id} upload={u} onRefresh={load} />
                ))}
              </div>
            )}

            {/* Messages */}
            <MessagesPanel studentId={Number(id)} processCode={activeProcess?.code} />
          </div>

          {/* Right column: processes */}
          <div className="lg:col-span-2 space-y-5">
            {processes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-card border border-surface-border shadow-card">
                <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mb-4">
                  <FileText size={20} className="text-content-tertiary" />
                </div>
                <p className="text-sm font-medium text-content-primary mb-1">Sin procesos</p>
                <p className="text-xs text-content-secondary">
                  Este alumno no tiene procesos activos.
                </p>
              </div>
            ) : (
              processes.map((proc) => (
                <div
                  key={proc.code ?? proc.id}
                  className="bg-white rounded-card border border-surface-border shadow-card p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-content-primary">{proc.name}</h3>
                      <p className="text-xs text-content-secondary mt-0.5 capitalize">
                        {proc.status?.replace('_', ' ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {proc.total_steps > 0 && (
                        <span className="text-xs font-mono text-content-secondary">
                          {proc.current_step} / {proc.total_steps}
                        </span>
                      )}
                      {proc.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => handleAdvance(proc.code)}
                          disabled={!!advLoading}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700
                                     disabled:bg-primary-300 text-white text-xs font-medium rounded-button
                                     transition-colors duration-150"
                        >
                          {advLoading === proc.code ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <ChevronRight size={12} />
                          )}
                          Avanzar paso
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  {proc.total_steps > 0 && (
                    <div className="mb-4">
                      <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.round((proc.current_step / proc.total_steps) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Steps list */}
                  {proc.steps && proc.steps.length > 0 && (
                    <div className="space-y-1 max-h-80 overflow-y-auto">
                      {proc.steps.map((step: any) => (
                        <div
                          key={step.step_number}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${
                            step.status === 'current' ? 'bg-primary-50' : ''
                          }`}
                        >
                          <StepStatusDot status={step.status} />
                          <span className="font-mono text-content-tertiary w-5 flex-shrink-0">
                            {step.step_number}
                          </span>
                          <span
                            className={`flex-1 truncate ${
                              step.status === 'completed'
                                ? 'text-content-tertiary line-through'
                                : step.status === 'current'
                                ? 'text-primary-700 font-medium'
                                : 'text-content-secondary'
                            }`}
                          >
                            {step.title ?? step.short_label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
