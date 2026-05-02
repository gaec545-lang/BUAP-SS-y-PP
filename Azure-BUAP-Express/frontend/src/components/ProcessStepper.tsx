import { motion } from 'framer-motion'
import { Check, FileSearch } from 'lucide-react'
import type { ProcessStep } from '../types'
import { ActorBadge } from './ActorBadge'
import { ScannerWarningInline } from './ScannerWarning'
import { ResourceWarning } from './ResourceWarning'
import { GeneratePDFButton } from './GeneratePDFButton'
import { generateDocument } from '../services/api'

interface ProcessStepperProps {
  steps: ProcessStep[]
  currentStepOrder: number
  generatesResource: boolean
  onPdfGenerated?: () => void
  readOnly?: boolean
  /** Admin only: pending upload counts per step_number */
  pendingUploadsByStep?: Record<number, number>
  /** Admin only: navigate to uploads tab filtered by step */
  onViewStepUploads?: (stepNumber: number) => void
  processCode: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Vertical Stepper (>8 steps)
// ─────────────────────────────────────────────────────────────────────────────

function VerticalStepper({
  steps,
  onPdfGenerated,
  readOnly,
  pendingUploadsByStep,
  onViewStepUploads,
  processCode,
}: {
  steps: ProcessStep[]
  currentStepOrder: number
  onPdfGenerated?: () => void
  readOnly?: boolean
  pendingUploadsByStep?: Record<number, number>
  onViewStepUploads?: (stepNumber: number) => void
  processCode: string
}) {
  const completedCount = steps.filter((s) => s.status === 'completed').length
  const progressFraction = steps.length > 1 ? completedCount / (steps.length - 1) : 0

  return (
    <div className="relative">
      {/* Vertical line background */}
      <div
        className="absolute left-[14px] top-[15px] bottom-[15px] w-0.5 bg-surface-border"
        style={{ zIndex: 0 }}
      />
      {/* Animated progress line */}
      <motion.div
        className="absolute left-[14px] top-[15px] w-0.5 bg-primary-500 origin-top"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: progressFraction }}
        transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{
          height: 'calc(100% - 30px)',
          zIndex: 1,
        }}
      />

      <div className="space-y-2">
        {steps.map((step, index) => {
          const isCompleted = step.status === 'completed'
          const isCurrent = step.status === 'current'
          const isPending = step.status === 'pending'

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.3,
                ease: 'easeOut' as const,
                delay: index * 0.04,
              }}
              className="relative flex items-start gap-4"
            >
              {/* Node */}
              <div className="relative z-10 flex-shrink-0 mt-0.5">
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 20,
                      delay: index * 0.04 + 0.1,
                    }}
                    className="w-[30px] h-[30px] rounded-full bg-primary-600
                               border-2 border-primary-600 flex items-center justify-center"
                  >
                    <Check size={14} className="text-white" strokeWidth={2.5} />
                  </motion.div>
                ) : isCurrent ? (
                  <div
                    className="w-[30px] h-[30px] rounded-full bg-white
                               border-2 border-primary-500 ring-4 ring-primary-100
                               flex items-center justify-center"
                  >
                    <span className="text-xs font-semibold text-primary-600">
                      {step.order}
                    </span>
                  </div>
                ) : (
                  <div
                    className="w-[30px] h-[30px] rounded-full bg-white
                               border-2 border-gray-200 flex items-center justify-center"
                  >
                    <span className="text-xs text-gray-400">{step.order}</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-4">
                {isCompleted && (
                  <div className="flex items-center gap-3 py-1">
                    <span className="text-sm text-content-secondary">{step.title}</span>
                    {step.completedDate && (
                      <span className="text-xs text-content-tertiary">
                        · {step.completedDate}
                      </span>
                    )}
                  </div>
                )}

                {isCurrent && (
                  <div
                    className="bg-white rounded-card border-2 border-primary-200
                               shadow-card p-5"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="text-base font-medium text-content-primary">
                        {step.title}
                      </h3>
                      <ActorBadge actor={step.actor} />
                    </div>
                    <p className="text-sm text-content-secondary leading-relaxed mb-3">
                      {step.description}
                    </p>
                    {step.action && (
                      <div className="bg-primary-50 rounded-lg px-4 py-3 mb-3">
                        <p className="text-xs font-medium text-primary-700 mb-0.5">
                          Acción requerida
                        </p>
                        <p className="text-sm text-primary-800 leading-relaxed">
                          {step.action}
                        </p>
                      </div>
                    )}
                    {!readOnly && step.documents.length > 0 && step.documents[0].status === 'ready' && (
                      <div className="mt-3">
                        <GeneratePDFButton
                          label={`Generar: ${step.documents[0].name}`}
                          onGenerate={async () => {
                            await generateDocument(step.documents[0].id, processCode, step.order)
                            onPdfGenerated?.()
                          }}
                        />
                      </div>
                    )}
                    {step.requiresScan && <ScannerWarningInline />}
                    {onViewStepUploads && (step.requiresScan || step.documents.length > 0) && (
                      <div className="mt-3 pt-3 border-t border-surface-border">
                        <button
                          onClick={() => onViewStepUploads(step.order)}
                          className="relative inline-flex items-center gap-1.5 px-3 py-1.5
                                     border border-primary-200 text-primary-600 text-xs font-medium
                                     rounded-button hover:bg-primary-50 transition-colors duration-150"
                        >
                          <FileSearch size={13} />
                          Ver documentos de este paso
                          {(pendingUploadsByStep?.[step.order] ?? 0) > 0 && (
                            <span className="ml-1 inline-flex items-center px-1.5 py-0.5
                                             bg-danger text-white text-[10px] font-semibold rounded-full leading-none">
                              {pendingUploadsByStep![step.order]} pendiente{pendingUploadsByStep![step.order] !== 1 ? 's' : ''}
                            </span>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {isPending && (
                  <div className="py-1">
                    <span className="text-sm text-content-tertiary">{step.title}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Horizontal Stepper (≤8 steps)
// ─────────────────────────────────────────────────────────────────────────────

function HorizontalStepper({
  steps,
  onPdfGenerated,
  readOnly,
  pendingUploadsByStep,
  onViewStepUploads,
  processCode,
}: {
  steps: ProcessStep[]
  currentStepOrder: number
  onPdfGenerated?: () => void
  readOnly?: boolean
  pendingUploadsByStep?: Record<number, number>
  onViewStepUploads?: (stepNumber: number) => void
  processCode: string
}) {
  const currentStep = steps.find((s) => s.status === 'current')

  return (
    <div>
      {/* Scrollable stepper row */}
      <div className="overflow-x-auto pb-2">
        <div className="flex items-start min-w-max px-1">
          {steps.map((step, index) => {
            const isCompleted = step.status === 'completed'
            const isCurrent = step.status === 'current'
            const isLast = index === steps.length - 1

            return (
              <div key={step.id} className="flex items-start">
                {/* Step node + label */}
                <div className="flex flex-col items-center" style={{ minWidth: 90 }}>
                  {/* Node */}
                  <div className="relative">
                    {isCompleted ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          type: 'spring',
                          stiffness: 400,
                          damping: 20,
                          delay: index * 0.04,
                        }}
                        className="w-10 h-10 rounded-full bg-primary-600
                                   border-2 border-primary-600 flex items-center justify-center"
                      >
                        <Check size={16} className="text-white" strokeWidth={2.5} />
                      </motion.div>
                    ) : isCurrent ? (
                      <div
                        className="w-10 h-10 rounded-full bg-white border-2 border-primary-500
                                   ring-4 ring-primary-100 flex items-center justify-center relative"
                      >
                        <span className="text-sm font-semibold text-primary-600">
                          {step.order}
                        </span>
                        <span
                          className="absolute inset-0 rounded-full bg-primary-400/20 animate-ping"
                          style={{ animationDuration: '2s' }}
                        />
                      </div>
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full bg-white border-2 border-gray-200
                                   flex items-center justify-center"
                      >
                        <span className="text-sm text-gray-400">{step.order}</span>
                      </div>
                    )}
                  </div>

                  {/* Label */}
                  <p
                    className={`text-xs text-center mt-2 leading-tight max-w-[90px] ${
                      isCurrent
                        ? 'font-semibold text-primary-700'
                        : isCompleted
                          ? 'text-content-secondary'
                          : 'text-content-tertiary'
                    }`}
                  >
                    {step.shortLabel}
                  </p>

                  {/* Actor badge */}
                  <div className="mt-1">
                    <ActorBadge actor={step.actor} size="xs" />
                  </div>
                </div>

                {/* Connector line */}
                {!isLast && (
                  <div className="relative flex-1 flex items-center mt-5" style={{ minWidth: 24 }}>
                    <div className="w-full h-0.5 bg-surface-border" />
                    {isCompleted && (
                      <motion.div
                        className="absolute inset-y-0 left-0 h-0.5 bg-primary-500 origin-left"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{
                          duration: 0.4,
                          ease: 'easeOut' as const,
                          delay: index * 0.06 + 0.2,
                        }}
                        style={{ width: '100%' }}
                      />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Current step detail card — shown below stepper for horizontal mode */}
      {currentStep && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' as const, delay: 0.2 }}
          className="mt-6 bg-white rounded-card border-2 border-primary-200 shadow-card p-5"
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="text-base font-medium text-content-primary">
              Paso {currentStep.order}: {currentStep.title}
            </h3>
            <ActorBadge actor={currentStep.actor} />
          </div>
          <p className="text-sm text-content-secondary leading-relaxed mb-3">
            {currentStep.description}
          </p>
          {currentStep.action && (
            <div className="bg-primary-50 rounded-lg px-4 py-3 mb-3">
              <p className="text-xs font-medium text-primary-700 mb-0.5">
                Acción requerida
              </p>
              <p className="text-sm text-primary-800 leading-relaxed">
                {currentStep.action}
              </p>
            </div>
          )}
          {!readOnly && currentStep.documents.length > 0 &&
            currentStep.documents[0].status === 'ready' && (
              <div className="mt-3">
                <GeneratePDFButton
                  label={`Generar: ${currentStep.documents[0].name}`}
                  onGenerate={async () => {
                    await generateDocument(currentStep.documents[0].id, processCode, currentStep.order)
                    onPdfGenerated?.()
                  }}
                />
              </div>
            )}
          {currentStep.requiresScan && <ScannerWarningInline />}
          {onViewStepUploads && (currentStep.requiresScan || currentStep.documents.length > 0) && (
            <div className="mt-3 pt-3 border-t border-surface-border">
              <button
                onClick={() => onViewStepUploads(currentStep.order)}
                className="relative inline-flex items-center gap-1.5 px-3 py-1.5
                           border border-primary-200 text-primary-600 text-xs font-medium
                           rounded-button hover:bg-primary-50 transition-colors duration-150"
              >
                <FileSearch size={13} />
                Ver documentos de este paso
                {(pendingUploadsByStep?.[currentStep.order] ?? 0) > 0 && (
                  <span className="ml-1 inline-flex items-center px-1.5 py-0.5
                                   bg-danger text-white text-[10px] font-semibold rounded-full leading-none">
                    {pendingUploadsByStep![currentStep.order]} pendiente{pendingUploadsByStep![currentStep.order] !== 1 ? 's' : ''}
                  </span>
                )}
              </button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export function ProcessStepper({
  steps,
  currentStepOrder,
  generatesResource,
  onPdfGenerated,
  readOnly,
  pendingUploadsByStep,
  onViewStepUploads,
  processCode,
}: ProcessStepperProps) {
  const isVertical = steps.length > 8

  return (
    <div>
      {isVertical ? (
        <VerticalStepper
          steps={steps}
          currentStepOrder={currentStepOrder}
          onPdfGenerated={onPdfGenerated}
          readOnly={readOnly}
          pendingUploadsByStep={pendingUploadsByStep}
          onViewStepUploads={onViewStepUploads}
          processCode={processCode}
        />
      ) : (
        <HorizontalStepper
          steps={steps}
          currentStepOrder={currentStepOrder}
          onPdfGenerated={onPdfGenerated}
          readOnly={readOnly}
          pendingUploadsByStep={pendingUploadsByStep}
          onViewStepUploads={onViewStepUploads}
          processCode={processCode}
        />
      )}
      {generatesResource && <ResourceWarning />}
    </div>
  )
}
