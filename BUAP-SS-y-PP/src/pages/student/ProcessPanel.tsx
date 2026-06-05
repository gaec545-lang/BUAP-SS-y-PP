import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, CheckCircle2, Download, ExternalLink, AlertTriangle, Loader2, Clock } from 'lucide-react'
import { useStudent } from '../../context/StudentContext'
import { getProcessSteps, generateDocument, advanceFrontendStep, regressFrontendStep, getMyUploads, type ProcessStepAPI } from '../../services/api'
import { UploadDocument } from '../../components/UploadDocument'
import { FolioSearchStep } from './FolioSearchStep'
import { FolioAppointmentStep } from './FolioAppointmentStep'
import { CpaDownloaderStep } from './CpaDownloaderStep'
import { MultiDocsUploadStep } from './MultiDocsUploadStep'
import { ProcessChoiceStep } from './ProcessChoiceStep'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ProcessPanelProps {
  processCode: string // 'inscripcion' | 'acreditacion' (or any valid process code)
  onClose: () => void
}

interface ProcessData {
  process: { name?: string; [key: string]: unknown }
  current_step: number
  status: string
  steps: ProcessStepAPI[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Actor badge
// ─────────────────────────────────────────────────────────────────────────────

function ActorBadge({ actor, muted = false }: { actor: string; muted?: boolean }) {
  const lower = actor.toLowerCase()

  let colorClass: string
  if (lower.includes('alumno') || lower.includes('estudiante')) {
    colorClass = muted
      ? 'bg-primary-50/60 text-primary-400'
      : 'bg-primary-50 text-primary-700'
  } else if (
    lower === 'cppc' ||
    lower.includes('coordinaci') ||
    lower === 'admin'
  ) {
    colorClass = muted
      ? 'bg-warning-light/50 text-warning-dark/60'
      : 'bg-warning-light text-warning-dark'
  } else if (lower.includes('dependencia')) {
    colorClass = muted
      ? 'bg-purple-50 text-purple-400'
      : 'bg-purple-100 text-purple-700'
  } else if (lower.includes('tutor')) {
    colorClass = muted
      ? 'bg-success-light/50 text-success-dark/60'
      : 'bg-success-light text-success-dark'
  } else {
    colorClass = muted
      ? 'bg-gray-100/60 text-gray-400'
      : 'bg-gray-100 text-gray-600'
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium rounded-badge px-2 py-0.5 ${colorClass}`}
    >
      {actor}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton loading card
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonStep() {
  return (
    <div className="flex gap-4">
      {/* Left column */}
      <div className="flex flex-col items-center w-8 flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-surface-divider animate-pulse" />
        <div className="w-0.5 flex-1 min-h-[48px] bg-surface-divider animate-pulse mt-1" />
      </div>
      {/* Right card */}
      <div className="flex-1 mb-6 pb-2">
        <div className="bg-white rounded-card border border-surface-border p-4 space-y-2">
          <div className="h-3 w-16 bg-surface-divider rounded animate-pulse" />
          <div className="h-4 w-48 bg-surface-divider rounded animate-pulse" />
          <div className="h-3 w-24 bg-surface-divider rounded animate-pulse" />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Completed step card
// ─────────────────────────────────────────────────────────────────────────────

function CompletedStepCard({
  step,
  isLast,
}: {
  step: ProcessStepAPI
  isLast: boolean
}) {
  return (
    <div className="flex gap-4">
      {/* Left column: circle + line */}
      <div className="flex flex-col items-center w-8 flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-success flex items-center justify-center flex-shrink-0 z-10">
          <CheckCircle2 size={16} className="text-white" />
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 min-h-[32px] bg-success/40 mx-auto mt-1" />
        )}
      </div>
      {/* Right card */}
      <div className="flex-1 mb-4">
        <div className="bg-white rounded-card border border-surface-border border-l-4 border-l-green-500 p-4">
          <p className="text-sm font-medium text-content-secondary">
            {step.title}
          </p>
          {/* Completed date if available — ProcessStepAPI doesn't expose completed_at, use action_required as fallback label */}
          <p className="text-xs text-content-tertiary mt-0.5">
            Completado
          </p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Current step card
// ─────────────────────────────────────────────────────────────────────────────

function CurrentStepCard({
  step,
  processCode,
  isLast,
  uploadStatuses,
  onDocumentGenerated,
  onManualAdvance,
  onRegress,
  onUploadStateChange,
}: {
  step: ProcessStepAPI
  processCode: string
  isLast: boolean
  uploadStatuses: any[]
  onDocumentGenerated: () => void
  onManualAdvance: () => void
  onRegress: () => void
  onUploadStateChange: () => void
}) {
  const [genLoading, setGenLoading] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  const docCode = step.student_document_type || step.generated_document_type || 'solicitud'
  const statusObj = uploadStatuses.find((u: any) => u.document_type_code === docCode && u.process_code === processCode)

  useEffect(() => {
    if (step.requires_upload && statusObj?.current_status === 'approved') {
      onManualAdvance()
    }
  }, [step.requires_upload, statusObj?.current_status, onManualAdvance])

  async function handleGenerate() {
    if (!step.generated_document_type) return
    setGenLoading(true)
    setGenError(null)
    try {
      await generateDocument(step.generated_document_type, processCode, step.step_number)
      onDocumentGenerated()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al generar PDF'
      setGenError(message)
    } finally {
      setGenLoading(false)
    }
  }

  // Cast to access optional fields that may exist in API responses beyond the typed shape
  const stepExtra = step as ProcessStepAPI & {
    external_form_url?: string
    special_instructions?: string
  }

  return (
    <div className="flex gap-4">
      {/* Left column: animated circle + gray line ahead */}
      <div className="flex flex-col items-center w-8 flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0 z-10 animate-pulse-soft">
          <div className="w-3 h-3 rounded-full bg-white" />
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 min-h-[32px] bg-surface-divider mx-auto mt-1" />
        )}
      </div>

      {/* Right card */}
      <div className="flex-1 mb-4">
        <div className="bg-blue-50 border border-blue-200 border-l-4 border-l-blue-500 rounded-card p-5 shadow-card">
          {/* Step number badge */}
          <span className="text-xs bg-blue-100 text-blue-700 rounded-badge px-2 py-0.5 font-medium mb-2 inline-block">
            Paso {step.step_number}
          </span>
          {step.step_number > 1 && step.step_number < 10 && (
            <button
              type="button"
              onClick={onRegress}
              className="float-right text-xs text-primary-600 hover:text-primary-700 font-medium underline flex items-center gap-1"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Regresar al paso anterior
            </button>
          )}

          {/* Title */}
          <h3 className="text-lg font-semibold text-content-primary mb-1">
            {step.title}
          </h3>

          {/* Actor badge */}
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-xs text-content-tertiary">Responsable:</span>
            <ActorBadge actor={step.actor} />
          </div>

          {/* Description */}
          <p className="text-sm text-content-secondary mb-4 leading-relaxed">
            {step.description}
          </p>

          {/* Action required (additional instruction box) */}
          {step.action_required && (
            <div className="p-3 rounded-lg bg-primary-50 border border-primary-100 mb-4">
              <p className="text-xs font-medium text-primary-700">
                {step.action_required}
              </p>
            </div>
          )}

          {/* Warning text */}
          {step.warning_text && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-warning-light border border-warning/30 mb-4">
              <AlertTriangle
                size={14}
                className="text-warning-dark flex-shrink-0 mt-0.5"
              />
              <p className="text-xs text-warning-dark">{step.warning_text}</p>
            </div>
          )}

          {/* Special instructions (optional field) */}
          {stepExtra.special_instructions && (
            <p className="text-xs text-danger mb-3">
              {stepExtra.special_instructions}
            </p>
          )}

          {/* Scanner warning */}
          {step.requires_scan && (
            <div className="flex items-center gap-2 bg-warning-light border border-warning/30 rounded-lg p-3 mb-4">
              <AlertTriangle size={14} className="text-warning-dark flex-shrink-0" />
              <p className="text-xs text-warning-dark">
                Este paso requiere documentos escaneados, NO fotografías.
              </p>
            </div>
          )}

          {/* V2 Specialized Step Rendering */}
          {step.requires_folio_search && (
            <FolioSearchStep onComplete={onManualAdvance} />
          )}

          {step.requires_appointment_check && (
            <FolioAppointmentStep onComplete={onManualAdvance} />
          )}

          {step.has_generated_document && step.generated_document_type === 'cpa' && (
            <CpaDownloaderStep processCode={processCode} stepNumber={step.step_number} onComplete={onManualAdvance} />
          )}

          {step.required_documents && step.required_documents.length > 0 && (
            <MultiDocsUploadStep 
              processCode={processCode}
              stepNumber={step.step_number}
              requiredDocs={step.required_documents}
              uploadStatuses={uploadStatuses}
              onUploadStateChange={onUploadStateChange}
              onComplete={onManualAdvance}
            />
          )}

          {step.requires_process_choice && (
            <ProcessChoiceStep onComplete={onManualAdvance} />
          )}

          {/* Legacy Rendering (only if no V2 specialized view matched) */}
          {!step.requires_folio_search && !step.requires_appointment_check && step.generated_document_type !== 'cpa' && (!step.required_documents || step.required_documents.length === 0) && (
            <>
          {/* Generate document button */}
          {step.has_generated_document && step.generated_document_type && (
            <div className="mb-4">
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
                Descargar {step.generated_document_type.replace(/_/g, ' ')}
              </button>
              {genError && (
                <p className="mt-1.5 text-xs text-danger">{genError}</p>
              )}
              <p className="mt-2 text-xs font-bold text-red-600 bg-red-50 p-2 rounded border border-red-200">
                ⚠️ Atención: Solo puedes generar 1 documento de este tipo a la semana. Revisa que toda la información sea correcta antes de descargarlo.
              </p>
              <p className="mt-2 text-xs text-content-tertiary">
                Descarga este documento, imprímelo y llévalo con firma en tinta azul
                y sello a la CPPC.
              </p>
            </div>
          )}

          {/* External form URL (optional field) */}
          {stepExtra.external_form_url && (
            <div className="mb-4">
              <a
                href={stepExtra.external_form_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-primary-600 text-sm underline
                           hover:text-primary-700 transition-colors duration-150"
              >
                {step.step_number === 1 && processCode === 'inscripcion' 
                  ? 'CONSULTAR CONVOCATORIA PUBLICADA EN PÁGINA DE FACEBOOK' 
                  : 'Ir al formulario electrónico'}
                <ExternalLink size={13} />
              </a>
              <p className="mt-1 text-xs text-content-tertiary">
                Accede con tu correo @alm.buap.mx
              </p>
            </div>
          )}

          {/* Upload Document Integration */}
          {step.requires_upload && statusObj?.current_status === 'pending_review' && (
             <div className="mb-4 bg-primary-50 rounded-lg p-4 border border-primary-100 flex items-start gap-3">
               <Clock size={18} className="text-primary-600 mt-0.5 flex-shrink-0" />
               <div>
                 <p className="text-sm font-medium text-primary-900">Documento en revisión</p>
                 <p className="text-xs text-primary-700 mt-1">La coordinación está revisando tu documento. Vuelve más tarde una vez que te notifiquen resolución.</p>
               </div>
             </div>
          )}

          {step.requires_upload && statusObj?.current_status !== 'pending_review' && statusObj?.current_status !== 'approved' && (
            <div className="mb-4">
              {statusObj?.current_status === 'rejected' && (
                <div className="mb-4 bg-danger-50 rounded-lg p-3 border border-danger/30 flex items-start gap-2">
                  <AlertTriangle size={16} className="text-danger flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-danger-900">Documento Rechazado</p>
                    <p className="text-xs text-danger-800 mt-1">
                      Motivo: {statusObj.last_rejection_reason || 'Sin motivo especificado. Favor de intentar nuevamente con correcciones oportunas.'}
                    </p>
                  </div>
                </div>
              )}
              <div className="bg-white rounded-lg p-3 border border-surface-divider shadow-sm">
                <UploadDocument
                  documentTypeCode={docCode}
                  documentTypeName={`Documento: ${step.short_label}`}
                  processCode={processCode}
                  stepNumber={step.step_number}
                  onUploadSuccess={onUploadStateChange}
                />
              </div>
            </div>
          )}

          {/* Manual advance button */}
          {!step.requires_upload && (
            <div className="mt-6">
              <button
                type="button"
                onClick={onManualAdvance}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700
                           text-white text-sm font-medium rounded-button transition-colors duration-150
                           shadow-sm"
              >
                Completar y continuar
                <CheckCircle2 size={16} />
              </button>
            </div>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Pending step card
// ─────────────────────────────────────────────────────────────────────────────

function PendingStepCard({
  step,
  isLast,
}: {
  step: ProcessStepAPI
  isLast: boolean
}) {
  return (
    <div className="flex gap-4">
      {/* Left column: empty circle + dashed line */}
      <div className="flex flex-col items-center w-8 flex-shrink-0">
        <div className="w-8 h-8 rounded-full border-2 border-surface-divider bg-white flex-shrink-0 z-10" />
        {!isLast && (
          <div
            className="w-0.5 flex-1 min-h-[32px] mx-auto mt-1"
            style={{
              borderLeft: '1px dashed #DEE2E6',
            }}
          />
        )}
      </div>

      {/* Right card — muted, no interactivity */}
      <div className="flex-1 mb-4 opacity-60">
        <div className="bg-white border border-surface-border rounded-card p-4">
          <span className="text-xs text-content-tertiary font-mono">
            Paso {step.step_number}
          </span>
          <p className="text-sm text-content-secondary font-medium mt-0.5">
            {step.title}
          </p>
          <div className="mt-2">
            <ActorBadge actor={step.actor} muted />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Process title lookup
// ─────────────────────────────────────────────────────────────────────────────

function getProcessTitle(processCode: string, processName?: string): string {
  if (processName) return processName
  if (processCode === 'inscripcion' || processCode === 'ss_inscripcion') {
    return 'Proceso de Inscripción'
  }
  if (processCode === 'acreditacion' || processCode === 'ss_acreditacion') {
    return 'Proceso de Acreditación'
  }
  if (processCode === 'cambio') return 'Cambio de Programa'
  if (processCode === 'baja') return 'Baja de Programa'
  if (processCode === 'exencion') return 'Exención de Servicio / Práctica'
  return 'Detalle del Proceso'
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function ProcessPanel({ processCode, onClose }: ProcessPanelProps) {
  // useStudent() — student data available for prefilling PDF downloads if needed
  const { student } = useStudent()
  void student // available for future use (e.g. pre-filling download filenames)

  const [data, setData] = useState<ProcessData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadStatuses, setUploadStatuses] = useState<any[]>([])
  const [showRegressConfirm, setShowRegressConfirm] = useState(false)

  async function loadSteps() {
    setLoading(true)
    setError(null)
    try {
      const result = await getProcessSteps(processCode)
      setData(result as ProcessData)
      const ups = await getMyUploads()
      setUploadStatuses(ups)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar el proceso'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSteps()
  // processCode won't change while panel is open, but include it for correctness
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processCode])

  // ── Derived values ──────────────────────────────────────────────────────────
  const steps = data?.steps ?? []
  const totalSteps = steps.length
  const currentStepIndex = steps.findIndex((s) => s.status === 'current')
  const currentStepNumber = currentStepIndex >= 0 ? currentStepIndex + 1 : null
  const processTitle = getProcessTitle(processCode, data?.process?.name as string | undefined)

  const handleAdvance = () => {
    if (currentStepNumber !== null) {
      advanceFrontendStep(processCode, currentStepNumber + 1)
      loadSteps()
    }
  }

  const handleRegress = () => {
    if (currentStepNumber !== null && currentStepNumber > 1) {
      setShowRegressConfirm(true)
    }
  }

  const confirmRegress = () => {
    if (currentStepNumber !== null) {
      regressFrontendStep(processCode, currentStepNumber)
      loadSteps()
      setShowRegressConfirm(false)
    }
  }

  return (
    <>
      <div className="bg-white rounded-card border border-surface-border shadow-card mt-4">
        {/* ── Panel header ─────────────────────────────────────────────────────── */}
        <div className="border-b border-surface-border p-4 flex items-center justify-between gap-4">
          {/* Left: process title */}
          <h2 className="text-base font-semibold text-content-primary truncate">
            {processTitle}
          </h2>

          {/* Center: step counter badge */}
          {currentStepNumber !== null && totalSteps > 0 && (
            <span className="flex-shrink-0 bg-primary-50 text-primary-700 text-xs font-medium rounded-badge px-2.5 py-1">
              Paso {currentStepNumber} de {totalSteps}
            </span>
          )}

          {/* Right: close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar panel"
            className="flex-shrink-0 p-1.5 rounded-lg text-content-secondary hover:text-content-primary
                       hover:bg-surface-hover transition-colors duration-150"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body ─────────────────────────────────────────────────────────────── */}
        <div>
          <div className="max-w-2xl mx-auto px-6 py-6">

            {/* Loading state — 5 skeleton cards */}
            {loading && (
              <div className="space-y-0">
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonStep key={i} />
                ))}
              </div>
            )}

            {/* Error state */}
            {!loading && error && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-full bg-danger-light flex items-center justify-center mb-4">
                  <AlertTriangle size={20} className="text-danger" />
                </div>
                <h3 className="text-base font-semibold text-content-primary mb-1">
                  No se pudo cargar el proceso
                </h3>
                <p className="text-sm text-content-secondary max-w-sm mb-4">{error}</p>
                <button
                  type="button"
                  onClick={loadSteps}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm
                             font-medium rounded-button transition-colors duration-150"
                >
                  Reintentar
                </button>
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && steps.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mb-4">
                  <X size={20} className="text-content-tertiary" />
                </div>
                <h3 className="text-base font-semibold text-content-primary mb-1">
                  Sin pasos disponibles
                </h3>
                <p className="text-sm text-content-secondary max-w-sm">
                  Este proceso aún no tiene pasos configurados. Contacta a la
                  Coordinación para más información.
                </p>
              </div>
            )}

            {/* Timeline */}
            {!loading && !error && steps.length > 0 && (
              <div>
                {steps.map((step, index) => {
                  const isLast = index === steps.length - 1

                  return (
                    <motion.div
                      key={step.step_number}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.25 }}
                    >
                      {step.status === 'completed' && (
                        <CompletedStepCard step={step} isLast={isLast} />
                      )}
                      {step.status === 'current' && (
                        <CurrentStepCard
                    step={step}
                    processCode={processCode}
                    isLast={index === totalSteps - 1}
                    uploadStatuses={uploadStatuses}
                    onDocumentGenerated={loadSteps}
                    onManualAdvance={handleAdvance}
                    onRegress={handleRegress}
                    onUploadStateChange={loadSteps}
                  />
                      )}
                      {step.status === 'pending' && (
                        <PendingStepCard step={step} isLast={isLast} />
                      )}
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      {showRegressConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-orange-200"
          >
            <div className="bg-orange-500 p-4 flex items-center gap-3 text-white">
              <AlertTriangle size={24} />
              <h3 className="font-bold text-lg">Aviso Importante</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-700 leading-relaxed">
                Si regresas al paso anterior, es posible que tu proceso se vea afectado (por ejemplo, alguien más podría ocupar los lugares disponibles).
              </p>
              <p className="text-gray-900 font-bold">
                Por favor, sé consciente de cada elección. ¿Estás seguro de que deseas regresar?
              </p>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowRegressConfirm(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmRegress}
                  className="flex-1 py-3 rounded-xl font-bold bg-orange-600 text-white hover:bg-orange-700 transition-colors shadow-lg shadow-orange-200"
                >
                  Sí, regresar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}
