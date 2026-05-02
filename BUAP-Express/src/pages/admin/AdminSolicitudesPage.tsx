import { useState, useEffect } from 'react'
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Loader2,
  FileText,
  Building2,
  User,
} from 'lucide-react'
import { AdminLayout, AdminPageHeader } from './AdminLayout'
import {
  adminGetPendingEnrollments,
  adminApproveEnrollment,
  adminRejectEnrollment,
  adminGetPendingChangeRequests,
  adminApproveChangeRequest,
  adminRejectChangeRequest,
} from '../../services/api'

// ─────────────────────────────────────────────────────────────────────────────
// Reject modal
// ─────────────────────────────────────────────────────────────────────────────

function RejectModal({
  onConfirm,
  onClose,
  loading,
}: {
  onConfirm: (reason: string) => void
  onClose: () => void
  loading: boolean
}) {
  const [reason, setReason] = useState('')

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-card shadow-modal border border-surface-border w-full max-w-md animate-scale-in">
        <div className="px-6 py-4 border-b border-surface-border">
          <h3 className="text-base font-semibold text-content-primary">Rechazar solicitud</h3>
          <p className="text-xs text-content-secondary mt-0.5">
            Proporciona un motivo para informar al alumno.
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1.5">
              Motivo del rechazo
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Explica el motivo del rechazo..."
              className="w-full px-3 py-2 text-sm rounded-input border border-surface-border
                         focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400
                         transition-all duration-150 resize-none"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-content-secondary hover:text-content-primary
                         border border-surface-border rounded-button hover:bg-surface-hover
                         transition-colors duration-150"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onConfirm(reason)}
              disabled={loading || !reason.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-danger hover:bg-danger-dark
                         disabled:opacity-50 text-white text-sm font-medium rounded-button
                         transition-colors duration-150"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
              Confirmar rechazo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Enrollment item
// ─────────────────────────────────────────────────────────────────────────────

function EnrollmentItem({
  item,
  onRefresh,
}: {
  item: any
  onRefresh: () => void
}) {
  const [appLoading, setAppLoading] = useState(false)
  const [rejLoading, setRejLoading] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  async function handleApprove() {
    setAppLoading(true)
    setActionError(null)
    try {
      await adminApproveEnrollment(item.id)
      onRefresh()
    } catch (err: any) {
      setActionError(err.message ?? 'Error al aprobar')
    } finally {
      setAppLoading(false)
    }
  }

  async function handleReject(reason: string) {
    setRejLoading(true)
    setActionError(null)
    try {
      await adminRejectEnrollment(item.id, reason)
      setShowReject(false)
      onRefresh()
    } catch (err: any) {
      setActionError(err.message ?? 'Error al rechazar')
    } finally {
      setRejLoading(false)
    }
  }

  return (
    <>
      {showReject && (
        <RejectModal
          onConfirm={handleReject}
          onClose={() => setShowReject(false)}
          loading={rejLoading}
        />
      )}
      <div className="bg-white rounded-card border border-surface-border shadow-card p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
              <FileText size={16} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-content-primary">
                {item.student_name ?? item.student?.full_name ?? '—'}
              </p>
              <p className="text-xs font-mono text-content-secondary">
                {item.student_matricula ?? item.student?.matricula ?? ''}
              </p>
            </div>
          </div>
          <span className="text-xs text-content-tertiary whitespace-nowrap">
            {item.created_at
              ? new Date(item.created_at).toLocaleDateString('es-MX', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })
              : ''}
          </span>
        </div>

        {item.program && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
            <span className="flex items-center gap-1.5 text-xs text-content-secondary">
              <Building2 size={12} />
              {item.program.name}
            </span>
            <span className="text-xs font-mono text-content-tertiary">{item.program.folio}</span>
          </div>
        )}

        {actionError && (
          <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-danger-light border border-danger/20">
            <AlertCircle size={12} className="text-danger" />
            <p className="text-xs text-danger-dark">{actionError}</p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleApprove}
            disabled={appLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-success hover:bg-success-dark
                       disabled:opacity-50 text-white text-xs font-medium rounded-button
                       transition-colors duration-150"
          >
            {appLoading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
            Aprobar
          </button>
          <button
            type="button"
            onClick={() => setShowReject(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-danger/30 bg-danger-light
                       hover:bg-danger/10 text-danger-dark text-xs font-medium rounded-button
                       transition-colors duration-150"
          >
            <XCircle size={12} />
            Rechazar
          </button>
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Change request item
// ─────────────────────────────────────────────────────────────────────────────

function ChangeRequestItem({
  item,
  onRefresh,
}: {
  item: any
  onRefresh: () => void
}) {
  const [appLoading, setAppLoading] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [rejLoading, setRejLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  async function handleApprove() {
    setAppLoading(true)
    setActionError(null)
    try {
      await adminApproveChangeRequest(item.id)
      onRefresh()
    } catch (err: any) {
      setActionError(err.message ?? 'Error')
    } finally {
      setAppLoading(false)
    }
  }

  async function handleReject(reason: string) {
    setRejLoading(true)
    setActionError(null)
    try {
      await adminRejectChangeRequest(item.id, reason)
      setShowReject(false)
      onRefresh()
    } catch (err: any) {
      setActionError(err.message ?? 'Error')
    } finally {
      setRejLoading(false)
    }
  }

  return (
    <>
      {showReject && (
        <RejectModal
          onConfirm={handleReject}
          onClose={() => setShowReject(false)}
          loading={rejLoading}
        />
      )}
      <div className="bg-white rounded-card border border-surface-border shadow-card p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center flex-shrink-0">
              <User size={16} className="text-content-secondary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-content-primary">
                {item.student_name ?? item.student?.full_name ?? '—'}
              </p>
              <p className="text-xs text-content-secondary">
                {item.justification?.slice(0, 100)}{item.justification?.length > 100 ? '...' : ''}
              </p>
            </div>
          </div>
          <span className="text-xs text-content-tertiary whitespace-nowrap">
            {item.created_at
              ? new Date(item.created_at).toLocaleDateString('es-MX', {
                  day: 'numeric', month: 'short',
                })
              : ''}
          </span>
        </div>

        {item.new_program && (
          <div className="mb-3 p-2 rounded-lg bg-primary-50 border border-primary-100">
            <p className="text-xs text-primary-700">
              Nuevo programa: <span className="font-medium">{item.new_program.name}</span>{' '}
              <span className="font-mono">{item.new_program.folio}</span>
            </p>
          </div>
        )}

        {actionError && (
          <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-danger-light border border-danger/20">
            <AlertCircle size={12} className="text-danger" />
            <p className="text-xs text-danger-dark">{actionError}</p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleApprove}
            disabled={appLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-success hover:bg-success-dark
                       disabled:opacity-50 text-white text-xs font-medium rounded-button
                       transition-colors duration-150"
          >
            {appLoading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
            Aprobar
          </button>
          <button
            type="button"
            onClick={() => setShowReject(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-danger/30 bg-danger-light
                       hover:bg-danger/10 text-danger-dark text-xs font-medium rounded-button
                       transition-colors duration-150"
          >
            <XCircle size={12} />
            Rechazar
          </button>
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mb-4">
        <CheckCircle2 size={20} className="text-content-tertiary" />
      </div>
      <h3 className="text-base font-semibold text-content-primary mb-1">
        Sin solicitudes pendientes
      </h3>
      <p className="text-sm text-content-secondary max-w-sm">
        Todas las {label.toLowerCase()} han sido procesadas.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

type TabType = 'inscripciones' | 'cambios' | 'bajas'

export function AdminSolicitudesPage() {
  const [tab, setTab] = useState<TabType>('inscripciones')
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [changeRequests, setChangeRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [enroll, changes] = await Promise.all([
        adminGetPendingEnrollments().catch(() => []),
        adminGetPendingChangeRequests().catch(() => []),
      ])
      setEnrollments(enroll)
      setChangeRequests(changes)
    } catch (err: any) {
      setError(err.message ?? 'Error al cargar solicitudes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const cambios = changeRequests.filter((r) => r.request_type === 'cambio')
  const bajas = changeRequests.filter((r) => r.request_type === 'baja')

  const tabs: { id: TabType; label: string; count: number }[] = [
    { id: 'inscripciones', label: 'Inscripciones', count: enrollments.length },
    { id: 'cambios', label: 'Cambios', count: cambios.length },
    { id: 'bajas', label: 'Bajas', count: bajas.length },
  ]

  return (
    <AdminLayout>
      <AdminPageHeader
        breadcrumb={['Admin', 'Solicitudes']}
        title="Solicitudes pendientes"
        subtitle="Inscripciones, cambios y bajas que requieren tu revisión"
        actions={
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 border border-surface-border rounded-button
                       text-sm text-content-secondary hover:bg-surface-hover transition-colors duration-150"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-surface rounded-lg p-1 max-w-md">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 text-sm rounded-md
                        transition-all duration-150 ${
              tab === t.id
                ? 'bg-white text-content-primary font-medium shadow-sm'
                : 'text-content-secondary hover:text-content-primary'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1
                               rounded-full text-[10px] font-semibold leading-none ${
                tab === t.id ? 'bg-danger text-white' : 'bg-danger/20 text-danger-dark'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-primary-500" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-card bg-danger-light border border-danger/20">
          <AlertCircle size={16} className="text-danger" />
          <p className="text-sm text-danger-dark">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-4 animate-fade-in">
          {tab === 'inscripciones' && (
            enrollments.length === 0
              ? <EmptyState label="Inscripciones" />
              : enrollments.map((item) => (
                  <EnrollmentItem key={item.id} item={item} onRefresh={load} />
                ))
          )}
          {tab === 'cambios' && (
            cambios.length === 0
              ? <EmptyState label="Solicitudes de cambio" />
              : cambios.map((item) => (
                  <ChangeRequestItem key={item.id} item={item} onRefresh={load} />
                ))
          )}
          {tab === 'bajas' && (
            bajas.length === 0
              ? <EmptyState label="Solicitudes de baja" />
              : bajas.map((item) => (
                  <ChangeRequestItem key={item.id} item={item} onRefresh={load} />
                ))
          )}
        </div>
      )}
    </AdminLayout>
  )
}
