import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  FileText,
  Check,
  X,
} from 'lucide-react'
import { AdminLayout, AdminPageHeader } from './AdminLayout'
import {
  adminGetPendingUploads,
  adminApproveUpload,
  adminRejectUpload,
} from '../../services/api'

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-card border border-surface-border p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-gray-100 rounded animate-pulse w-48" />
          <div className="h-3 bg-gray-100 rounded animate-pulse w-32" />
          <div className="h-3 bg-gray-100 rounded animate-pulse w-64" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-20 bg-gray-100 rounded-button animate-pulse" />
          <div className="h-8 w-20 bg-gray-100 rounded-button animate-pulse" />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload item
// ─────────────────────────────────────────────────────────────────────────────

interface PendingUpload {
  id: number
  student_id: number
  student_name: string
  student_matricula: string
  step_number: number
  document_type: string
  original_filename: string
  attempt_number: number
  uploaded_at: string
}

interface UploadItemProps {
  upload: PendingUpload
  onApproved: (id: number, result: { auto_advanced: boolean; new_step: number | null }) => void
  onRejected: (id: number) => void
}

function UploadItem({ upload, onApproved, onRejected }: UploadItemProps) {
  const [rejecting, setRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleApprove() {
    setLoading(true)
    setError(null)
    try {
      const result = await adminApproveUpload(upload.id)
      onApproved(upload.id, result)
    } catch (err: any) {
      setError(err.message ?? 'Error al aprobar')
    } finally {
      setLoading(false)
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) return
    setLoading(true)
    setError(null)
    try {
      await adminRejectUpload(upload.id, rejectReason.trim())
      onRejected(upload.id)
    } catch (err: any) {
      setError(err.message ?? 'Error al rechazar')
    } finally {
      setLoading(false)
    }
  }

  const uploadDate = new Date(upload.uploaded_at).toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="bg-white rounded-card border border-surface-border p-5 shadow-card"
    >
      <div className="flex items-start gap-4">
        {/* File icon */}
        <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
          <FileText size={20} className="text-primary-600" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-content-primary">{upload.student_name}</p>
            <span className="text-xs font-mono text-content-tertiary">{upload.student_matricula}</span>
          </div>
          <p className="text-xs text-content-secondary mb-1">
            <span className="font-medium">Paso {upload.step_number}</span>
            {' — '}
            {upload.document_type}
            {upload.attempt_number > 1 && (
              <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-badge text-xs
                               bg-warning-light text-warning-dark font-medium">
                Intento {upload.attempt_number}
              </span>
            )}
          </p>
          <p className="text-xs text-content-tertiary truncate">{upload.original_filename}</p>
          <div className="flex items-center gap-1 mt-1">
            <Clock size={10} className="text-content-tertiary" />
            <span className="text-xs text-content-tertiary">{uploadDate}</span>
          </div>
        </div>

        {/* Actions */}
        {!rejecting ? (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setRejecting(true)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                         text-danger border border-danger/30 rounded-button
                         hover:bg-danger-light transition-colors duration-150 disabled:opacity-50"
            >
              <X size={12} />
              Rechazar
            </button>
            <button
              onClick={handleApprove}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                         text-white bg-success hover:bg-success-dark rounded-button
                         transition-colors duration-150 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check size={12} />
              )}
              Aprobar
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 min-w-[200px] flex-shrink-0">
            <input
              autoFocus
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Motivo de rechazo..."
              className="px-2.5 py-1.5 text-xs rounded-input border border-danger/40
                         focus:outline-none focus:ring-2 focus:ring-danger/30 focus:border-danger/60
                         text-content-primary placeholder:text-content-tertiary transition-all"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setRejecting(false); setRejectReason('') }}
                disabled={loading}
                className="flex-1 py-1.5 text-xs text-content-secondary border border-surface-border
                           rounded-button hover:bg-surface-hover transition-colors duration-150"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={loading || !rejectReason.trim()}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium
                           text-white bg-danger hover:bg-danger-dark rounded-button
                           transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <XCircle size={12} />
                )}
                Confirmar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-danger-light rounded-lg border border-danger/20">
          <AlertCircle size={12} className="text-danger flex-shrink-0" />
          <p className="text-xs text-danger-dark">{error}</p>
        </div>
      )}
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Toast notification
// ─────────────────────────────────────────────────────────────────────────────

interface ToastProps {
  message: string
  type: 'success' | 'info'
  onClose: () => void
}

function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-card shadow-dropdown
                  border ${type === 'success'
                    ? 'bg-success-light border-success/30 text-success-dark'
                    : 'bg-info-light border-info/30 text-info-dark'
                  }`}
    >
      {type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
      <p className="text-sm font-medium">{message}</p>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export function AdminUploadsPage() {
  const [uploads, setUploads] = useState<PendingUpload[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null)

  async function loadUploads() {
    setLoading(true)
    setError(null)
    try {
      const data = await adminGetPendingUploads()
      setUploads(data)
    } catch (err: any) {
      setError(err.message ?? 'Error al cargar uploads pendientes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUploads()
  }, [])

  function handleApproved(id: number, result: { auto_advanced: boolean; new_step: number | null }) {
    setUploads(prev => prev.filter(u => u.id !== id))
    const msg = result.auto_advanced
      ? `Documento aprobado. Alumno avanzado al paso ${result.new_step}.`
      : 'Documento aprobado correctamente.'
    setToast({ message: msg, type: 'success' })
  }

  function handleRejected(id: number) {
    setUploads(prev => prev.filter(u => u.id !== id))
    setToast({ message: 'Documento rechazado. Se notificará al alumno.', type: 'info' })
  }

  return (
    <AdminLayout>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <AdminPageHeader
        breadcrumb={['Admin', 'Documentos']}
        title="Documentos Pendientes"
        subtitle="Revisa y aprueba o rechaza los documentos subidos por los alumnos"
        actions={
          <button
            onClick={loadUploads}
            className="flex items-center gap-2 px-3 py-2 text-sm text-content-secondary
                       border border-surface-border rounded-button hover:bg-surface-hover
                       transition-colors duration-150"
          >
            <RefreshCw size={14} />
            Actualizar
          </button>
        }
      />

      {/* Count badge */}
      {!loading && !error && (
        <div className="mb-6">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-badge text-xs font-medium ${
            uploads.length > 0
              ? 'bg-warning-light text-warning-dark'
              : 'bg-gray-100 text-content-secondary'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              uploads.length > 0 ? 'bg-warning animate-pulse-soft' : 'bg-gray-300'
            }`} />
            {uploads.length > 0
              ? `${uploads.length} documento${uploads.length !== 1 ? 's' : ''} pendiente${uploads.length !== 1 ? 's' : ''}`
              : 'Sin pendientes'
            }
          </span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="w-8 h-8 text-danger mb-3" />
          <p className="text-sm text-content-secondary mb-4">{error}</p>
          <button
            onClick={loadUploads}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700
                       text-white text-sm rounded-button transition-colors"
          >
            <RefreshCw size={14} />
            Reintentar
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && uploads.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mb-4">
            <CheckCircle className="w-6 h-6 text-success" />
          </div>
          <h3 className="text-lg font-semibold text-content-primary mb-1">
            Todo al día
          </h3>
          <p className="text-sm text-content-secondary max-w-sm">
            No hay documentos pendientes de revisión en este momento.
          </p>
        </div>
      )}

      {/* Upload list */}
      {!loading && !error && uploads.length > 0 && (
        <div className="space-y-4">
          {uploads.map((upload, index) => (
            <motion.div
              key={upload.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.06 }}
            >
              <UploadItem
                upload={upload}
                onApproved={handleApproved}
                onRejected={handleRejected}
              />
            </motion.div>
          ))}
        </div>
      )}
    </AdminLayout>
  )
}
