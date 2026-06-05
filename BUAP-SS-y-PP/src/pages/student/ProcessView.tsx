import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Upload,
  AlertTriangle,
  MessageSquare,
  Send,
  Loader2,
  Download,
  AlertCircle,
  User,
  Building2,
} from 'lucide-react'
import {
  getProcessSteps,
  generateDocument,
  submitUpload,
  sendMessage,
  type ProcessStepAPI,
} from '../../services/api'
import { BuapLogo } from '../../components/BuapLogo'
import { ScannerWarningInline as ScannerWarning } from '../../components/ScannerWarning'
import { PoweredBy } from '../../components/PoweredBy'

// ─────────────────────────────────────────────────────────────────────────────
// Actor badge
// ─────────────────────────────────────────────────────────────────────────────

function ActorBadge({ actor }: { actor: string }) {
  const isAdmin = actor.toLowerCase().includes('coordinaci') || actor.toLowerCase() === 'admin'
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-badge text-xs font-medium ${
        isAdmin ? 'bg-primary-50 text-primary-700' : 'bg-surface text-content-secondary'
      }`}
    >
      {isAdmin ? <Building2 size={10} /> : <User size={10} />}
      {actor}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload zone
// ─────────────────────────────────────────────────────────────────────────────

function UploadZone({
  documentTypeCode,
  documentTypeName,
  processCode,
  stepNumber,
  currentStatus,
  onSuccess,
}: {
  documentTypeCode: string
  documentTypeName: string
  processCode: string
  stepNumber: number
  currentStatus: string
  onSuccess: () => void
}) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setUploading(true)
    setUploadError(null)
    try {
      await submitUpload(file, documentTypeCode, processCode, stepNumber)
      setUploadSuccess(true)
      setTimeout(() => onSuccess(), 1000)
    } catch (err: any) {
      setUploadError(err.message ?? 'Error al subir el archivo')
    } finally {
      setUploading(false)
    }
  }

  const statusColors: Record<string, string> = {
    pending: 'border-surface-border',
    approved: 'border-success/40 bg-success-light/30',
    rejected: 'border-danger/40 bg-danger-light/30',
  }

  return (
    <div className={`rounded-lg border ${statusColors[currentStatus] ?? 'border-surface-border'} p-4`}>
      <p className="text-xs font-medium text-content-secondary mb-2">{documentTypeName}</p>
      {uploadSuccess ? (
        <div className="flex items-center gap-2 text-xs text-success">
          <CheckCircle2 size={14} />
          Archivo enviado correctamente
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                      transition-colors duration-150 ${
            dragging
              ? 'border-primary-400 bg-primary-50'
              : 'border-surface-divider hover:border-primary-300 hover:bg-primary-50/40'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            const file = e.dataTransfer.files[0]
            if (file) handleFile(file)
          }}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={20} className="animate-spin text-primary-500" />
              <p className="text-xs text-content-secondary">Subiendo...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload size={20} className="text-content-tertiary" />
              <p className="text-xs text-content-secondary">
                Arrastra tu archivo aquí o{' '}
                <span className="text-primary-600 font-medium">haz clic para seleccionar</span>
              </p>
              <p className="text-xs text-content-tertiary">PDF, JPG, PNG</p>
            </div>
          )}
        </div>
      )}
      {uploadError && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-danger">
          <AlertCircle size={12} />
          {uploadError}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Messages thread
// ─────────────────────────────────────────────────────────────────────────────

function StepMessages({
  messages,
  processCode,
  stepNumber,
  onNewMessage,
}: {
  messages: ProcessStepAPI['messages']
  processCode: string
  stepNumber: number
  onNewMessage: () => void
}) {
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!msg.trim()) return
    setSending(true)
    setSendError(null)
    try {
      await sendMessage(processCode, stepNumber, msg.trim())
      setMsg('')
      onNewMessage()
    } catch (err: any) {
      setSendError(err.message ?? 'Error al enviar')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-3">
      {messages.length === 0 ? (
        <p className="text-xs text-content-tertiary italic">Sin mensajes en este paso.</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col gap-0.5 p-3 rounded-lg text-xs ${
                m.sender_type === 'student'
                  ? 'bg-primary-50 ml-8'
                  : 'bg-surface mr-8'
              }`}
            >
              <span className="font-medium text-content-secondary">{m.sender_name}</span>
              <span className="text-content-primary">{m.message}</span>
              <span className="text-content-tertiary">
                {new Date(m.created_at).toLocaleDateString('es-MX', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="flex-1 px-3 py-1.5 text-xs rounded-input border border-surface-border
                     focus:outline-none focus:ring-2 focus:ring-primary-300 transition-all duration-150"
        />
        <button
          type="submit"
          disabled={sending || !msg.trim()}
          className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300
                     text-white rounded-button text-xs transition-colors duration-150"
        >
          {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
        </button>
      </form>
      {sendError && <p className="text-xs text-danger">{sendError}</p>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Step detail
// ─────────────────────────────────────────────────────────────────────────────

function StepDetail({
  step,
  processCode,
  onRefresh,
}: {
  step: ProcessStepAPI
  processCode: string
  onRefresh: () => void
}) {
  const [genLoading, setGenLoading] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  async function handleGenerate() {
    if (!step.generated_document_type) return
    setGenLoading(true)
    setGenError(null)
    try {
      await generateDocument(step.generated_document_type, processCode, step.step_number)
    } catch (err: any) {
      setGenError(err.message ?? 'Error al generar PDF')
    } finally {
      setGenLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Description */}
      <p className="text-sm text-content-secondary leading-relaxed">{step.description}</p>

      {/* Actor */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-content-tertiary">Responsable:</span>
        <ActorBadge actor={step.actor} />
      </div>

      {/* Action required */}
      {step.action_required && (
        <div className="p-3 rounded-lg bg-primary-50 border border-primary-100">
          <p className="text-xs font-medium text-primary-700">{step.action_required}</p>
        </div>
      )}

      {/* Warning */}
      {step.warning_text && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-warning-light border border-warning/30">
          <AlertTriangle size={14} className="text-warning-dark flex-shrink-0 mt-0.5" />
          <p className="text-xs text-warning-dark">{step.warning_text}</p>
        </div>
      )}

      {/* Scanner warning */}
      {step.requires_scan && <ScannerWarning />}

      {/* Generate document button */}
      {step.has_generated_document && step.generated_document_type && (
        <div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={genLoading}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700
                       disabled:bg-primary-300 text-white text-sm font-medium rounded-button
                       transition-colors duration-150"
          >
            {genLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            Generar PDF
          </button>
          {genError && (
            <p className="mt-1.5 text-xs text-danger">{genError}</p>
          )}
        </div>
      )}

      {/* Upload zones */}
      {step.requires_upload && step.uploads.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-content-secondary uppercase tracking-wider">
            Documentos a subir
          </p>
          {step.uploads.map((upload) => (
            <UploadZone
              key={upload.document_type_code}
              documentTypeCode={upload.document_type_code}
              documentTypeName={upload.document_type_name}
              processCode={processCode}
              stepNumber={step.step_number}
              currentStatus={upload.status}
              onSuccess={onRefresh}
            />
          ))}
        </div>
      )}

      {/* Messages */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare size={14} className="text-content-secondary" />
          <p className="text-xs font-medium text-content-secondary uppercase tracking-wider">
            Mensajes
          </p>
        </div>
        <StepMessages
          messages={step.messages}
          processCode={processCode}
          stepNumber={step.step_number}
          onNewMessage={onRefresh}
        />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export function ProcessView() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()

  const [data, setData] = useState<{
    process: any
    current_step: number
    status: string
    steps: ProcessStepAPI[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedStep, setExpandedStep] = useState<number | null>(null)

  async function load() {
    if (!code) return
    setLoading(true)
    try {
      const result = await getProcessSteps(code)
      setData(result)
      // Auto-expand current step
      const current = result.steps.find((s) => s.status === 'current')
      if (current) setExpandedStep(current.step_number)
    } catch (err: any) {
      setError(err.message ?? 'Error al cargar el proceso')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [code])

  const statusMap: Record<string, { label: string; cls: string }> = {
    active: { label: 'En curso', cls: 'bg-info-light text-info-dark' },
    completed: { label: 'Completado', cls: 'bg-success-light text-success-dark' },
    not_started: { label: 'No iniciado', cls: 'bg-gray-100 text-gray-500' },
    pending_validation: { label: 'En revisión', cls: 'bg-warning-light text-warning-dark' },
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-white border-b border-surface-border sticky top-0 z-10 backdrop-blur-md bg-white/80">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center gap-4">
          <BuapLogo size={32} />
          <div className="flex-1">
            <p className="text-xs text-content-tertiary">Proceso activo</p>
            <h1 className="text-base font-semibold text-content-primary leading-tight">
              {data?.process?.name ?? (loading ? 'Cargando...' : 'Proceso')}
            </h1>
          </div>
          {data && statusMap[data.status] && (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-badge text-xs font-medium ${statusMap[data.status].cls}`}>
              {statusMap[data.status].label}
            </span>
          )}
          <button
            onClick={() => navigate('/student')}
            className="flex items-center gap-1.5 text-sm text-content-secondary
                       hover:text-content-primary transition-colors duration-150"
          >
            <ArrowLeft size={16} />
            Regresar
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={24} className="animate-spin text-primary-500" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-4 rounded-card bg-danger-light border border-danger/20">
            <AlertCircle size={16} className="text-danger" />
            <p className="text-sm text-danger-dark">{error}</p>
          </div>
        )}

        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            {/* Stepper column */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-card border border-surface-border shadow-card p-4 sticky top-24">
                <h2 className="text-sm font-semibold text-content-primary mb-4">
                  Pasos del proceso
                </h2>
                <div className="space-y-1">
                  {data.steps.map((step, idx) => {
                    const isLast = idx === data.steps.length - 1
                    const isExpanded = expandedStep === step.step_number
                    return (
                      <div key={step.step_number}>
                        <button
                          type="button"
                          onClick={() => setExpandedStep(isExpanded ? null : step.step_number)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
                                      transition-colors duration-150 ${
                            isExpanded
                              ? 'bg-primary-50'
                              : 'hover:bg-surface-hover'
                          }`}
                        >
                          {/* Step icon */}
                          <div className="flex-shrink-0">
                            {step.status === 'completed' ? (
                              <CheckCircle2 size={18} className="text-success" />
                            ) : step.status === 'current' ? (
                              <div className="w-[18px] h-[18px] rounded-full border-2 border-primary-500 bg-primary-500 flex items-center justify-center animate-pulse-soft">
                                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                              </div>
                            ) : (
                              <Circle size={18} className="text-content-tertiary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium truncate ${
                              step.status === 'completed'
                                ? 'text-success-dark'
                                : step.status === 'current'
                                ? 'text-primary-700'
                                : 'text-content-tertiary'
                            }`}>
                              {step.short_label}
                            </p>
                          </div>
                          {step.status === 'current' && (
                            <Clock size={12} className="text-primary-500 flex-shrink-0" />
                          )}
                        </button>
                        {!isLast && (
                          <div className={`ml-[21px] w-px h-3 ${
                            step.status === 'completed' ? 'bg-success/40' : 'bg-surface-divider'
                          }`} />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Detail column */}
            <div className="lg:col-span-2 space-y-4">
              {data.steps.map((step) => {
                const isExpanded = expandedStep === step.step_number
                if (!isExpanded) return null
                return (
                  <div
                    key={step.step_number}
                    className="bg-white rounded-card border border-surface-border shadow-card p-6 animate-slide-up"
                  >
                    <div className="flex items-start justify-between mb-5">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-content-tertiary">
                            Paso {step.step_number}
                          </span>
                          {step.status === 'completed' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-badge
                                             text-xs font-medium bg-success-light text-success-dark">
                              <CheckCircle2 size={10} />
                              Completado
                            </span>
                          )}
                          {step.status === 'current' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-badge
                                             text-xs font-medium bg-info-light text-info-dark">
                              <span className="w-1.5 h-1.5 rounded-full bg-info animate-pulse-soft" />
                              En curso
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-semibold text-content-primary">{step.title}</h3>
                      </div>
                    </div>
                    <StepDetail step={step} processCode={code!} onRefresh={load} />
                  </div>
                )
              })}

              {expandedStep === null && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mb-4">
                    <FileText size={20} className="text-content-tertiary" />
                  </div>
                  <h3 className="text-base font-semibold text-content-primary mb-1">
                    Selecciona un paso
                  </h3>
                  <p className="text-sm text-content-secondary max-w-sm">
                    Haz clic en cualquier paso del lado izquierdo para ver sus detalles.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        <PoweredBy />
    </div>
    </div>
  )
}
