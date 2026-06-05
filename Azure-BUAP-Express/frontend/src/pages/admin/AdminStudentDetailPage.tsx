import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Loader2,
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
  adminGetStudentMessages,
  adminSendMessageToStudent,
  adminGetStudentUploadHistory,
} from '../../services/api'
import { DocumentReviewModal } from '../../components/DocumentReviewModal'

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
  const [selectedUpload, setSelectedUpload] = useState<any>(null)
  const [uploadsHistory, setUploadsHistory] = useState<any[]>([])
  const [folioFilter, setFolioFilter] = useState('')

  async function load() {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [studentData, historyData] = await Promise.all([
        adminGetStudent(Number(id)),
        adminGetStudentUploadHistory(Number(id)).catch(() => []),
      ])
      setData(studentData)
      setUploadsHistory(historyData)
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

  const uniqueFolios = Array.from(
    new Set(
      uploadsHistory
        .map((u) => u.folio)
        .filter((f): f is string => typeof f === 'string' && f.trim() !== '')
    )
  ).sort()

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

            {/* Historial de Documentos */}
            <div className="bg-white rounded-card border border-surface-border shadow-card p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-base font-semibold text-content-primary">Historial de Documentos</h3>
                  <p className="text-xs text-content-secondary mt-0.5">
                    Todos los intentos de carga y estados de validación
                  </p>
                </div>
                <div className="w-full sm:w-64">
                  <select
                    value={folioFilter}
                    onChange={(e) => setFolioFilter(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-input border border-surface-border
                               focus:outline-none focus:ring-1 focus:ring-primary-300 bg-white"
                  >
                    <option value="">Todos los folios</option>
                    {uniqueFolios.map((folio) => (
                      <option key={folio} value={folio}>
                        {folio}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {uploadsHistory.filter((u) => !folioFilter || u.folio === folioFilter).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center bg-surface/30 rounded-lg border border-dashed border-surface-border">
                  <p className="text-xs text-content-secondary">
                    {folioFilter ? 'No hay documentos que coincidan con el folio.' : 'Sin historial de documentos para este alumno.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-surface-border text-content-tertiary font-medium">
                        <th className="py-2 px-3">Documento</th>
                        <th className="py-2 px-3 text-center">Intento</th>
                        <th className="py-2 px-3">Estado</th>
                        <th className="py-2 px-3 text-center">Confianza</th>
                        <th className="py-2 px-3 text-center">Revisión Manual</th>
                        <th className="py-2 px-3">Logs</th>
                        <th className="py-2 px-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {uploadsHistory
                        .filter((u) => !folioFilter || u.folio === folioFilter)
                        .map((u) => {
                          const statusBadge: Record<string, { label: string; cls: string }> = {
                            pending: { label: 'Pendiente', cls: 'bg-warning-light text-warning-dark' },
                            approved: { label: 'Aprobado', cls: 'bg-success-light text-success-dark' },
                            rejected: { label: 'Rechazado', cls: 'bg-danger-light text-danger-dark' },
                          }
                          const badge = statusBadge[u.status] ?? statusBadge.pending

                          return (
                            <tr key={u.upload_id} className="hover:bg-surface/30 transition-colors">
                              <td className="py-3 px-3">
                                <div className="font-medium text-content-primary">
                                  {u.document_type_name ?? u.document_type_code ?? 'Documento'}
                                </div>
                                {u.folio && (
                                  <div className="text-[10px] text-content-tertiary mt-0.5">
                                    Folio: {u.folio}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-3 text-center font-mono text-content-secondary">
                                {u.attempt}
                              </td>
                              <td className="py-3 px-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-badge text-[10px] font-medium ${badge.cls}`}>
                                  {badge.label}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center">
                                {u.confidence_score != null ? (
                                  <span className={`font-medium ${u.confidence_score >= 80 ? 'text-success-dark' : 'text-warning-dark'}`}>
                                    {u.confidence_score.toFixed(0)}%
                                  </span>
                                ) : (
                                  <span className="text-content-tertiary">—</span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-center">
                                {u.manual_review ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-danger-light text-danger-dark text-[10px] font-medium">
                                    Sí
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-success-light text-success-dark text-[10px] font-medium">
                                    No
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 max-w-[200px] truncate text-content-secondary" title={u.logs || u.validation_observations || ''}>
                                {u.logs || u.validation_observations || <span className="text-content-tertiary italic">Sin observaciones</span>}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => setSelectedUpload(u)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] bg-primary-50 text-primary-700 hover:bg-primary-100 font-medium rounded-button transition-colors duration-150"
                                >
                                  <Eye size={12} />
                                  Revisar
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedUpload && (
        <DocumentReviewModal
          upload={selectedUpload}
          onClose={() => setSelectedUpload(null)}
          onRefresh={load}
        />
      )}
    </AdminLayout>
  )
}
