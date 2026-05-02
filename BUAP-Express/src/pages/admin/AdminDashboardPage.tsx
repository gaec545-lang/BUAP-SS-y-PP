import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  BookOpen,
  Briefcase,
  Upload,
  FileCheck,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Clock,
} from 'lucide-react'
import { AdminLayout, AdminPageHeader } from './AdminLayout'
import { adminGetDashboardStats } from '../../services/api'

// ─────────────────────────────────────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  alert?: boolean
  onClick?: () => void
  subtitle?: string
}

function StatCard({ label, value, icon, alert, onClick, subtitle }: StatCardProps) {
  return (
    <div
      className={`bg-white rounded-card border shadow-card p-5 transition-all duration-200 ${
        alert
          ? 'border-warning/30 bg-warning-light/30 cursor-pointer hover:shadow-card-hover'
          : onClick
          ? 'border-surface-border cursor-pointer hover:shadow-card-hover hover:border-primary-200'
          : 'border-surface-border'
      }`}
      onClick={onClick}
      style={{ animationDelay: '0ms' }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className={`text-xs font-medium uppercase tracking-wider ${
          alert ? 'text-warning-dark' : 'text-content-tertiary'
        }`}>
          {label}
        </p>
        <span className={alert ? 'text-warning' : 'text-content-tertiary'}>
          {icon}
        </span>
      </div>
      <p className={`text-2xl font-semibold ${alert ? 'text-warning-dark' : 'text-content-primary'}`}>
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-content-tertiary mt-1">{subtitle}</p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────

function StatSkeleton() {
  return (
    <div className="bg-white rounded-card border border-surface-border shadow-card p-5">
      <div className="h-3 bg-gray-100 rounded animate-pulse mb-3 w-2/3" />
      <div className="h-7 bg-gray-100 rounded animate-pulse w-1/3" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export function AdminDashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await adminGetDashboardStats()
      setStats(data)
    } catch (err: any) {
      setError(err.message ?? 'Error al cargar estadísticas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const statCards = stats
    ? [
        {
          label: 'Total alumnos',
          value: stats.total_students ?? 0,
          icon: <Users size={16} />,
          alert: false,
          onClick: () => navigate('/admin/students'),
          subtitle: 'Ver lista completa →',
        },
        {
          label: 'Servicio Social',
          value: stats.ss_count ?? 0,
          icon: <BookOpen size={16} />,
          alert: false,
          onClick: () => navigate('/admin/students'),
        },
        {
          label: 'Práctica Profesional',
          value: stats.pp_count ?? 0,
          icon: <Briefcase size={16} />,
          alert: false,
          onClick: () => navigate('/admin/students'),
        },
        {
          label: 'Uploads pendientes',
          value: stats.pending_uploads ?? 0,
          icon: <Upload size={16} />,
          alert: (stats.pending_uploads ?? 0) > 0,
          onClick: () => navigate('/admin/solicitudes'),
          subtitle: (stats.pending_uploads ?? 0) > 0 ? 'Requieren revisión' : undefined,
        },
        {
          label: 'Solicitudes pendientes',
          value: stats.pending_requests ?? 0,
          icon: <FileCheck size={16} />,
          alert: (stats.pending_requests ?? 0) > 0,
          onClick: () => navigate('/admin/solicitudes'),
          subtitle: (stats.pending_requests ?? 0) > 0 ? 'Ver solicitudes →' : undefined,
        },
      ]
    : []

  return (
    <AdminLayout>
      <AdminPageHeader
        breadcrumb={['Admin']}
        title="Dashboard"
        subtitle="Gestión de Alumnos y Trámites Express"
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

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {loading
          ? [...Array(5)].map((_, i) => <StatSkeleton key={i} />)
          : error
          ? (
            <div className="col-span-5 flex flex-col items-center justify-center py-12">
              <AlertCircle size={24} className="text-danger mb-3" />
              <p className="text-sm text-content-secondary mb-4">{error}</p>
              <button
                onClick={load}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700
                           text-white text-sm rounded-button transition-colors"
              >
                <RefreshCw size={14} />
                Reintentar
              </button>
            </div>
          )
          : statCards.map((s, i) => (
            <div
              key={s.label}
              className="animate-fade-in"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <StatCard {...s} />
            </div>
          ))
        }
      </div>

      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent activity */}
          <div className="bg-white rounded-card border border-surface-border shadow-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={16} className="text-content-secondary" />
              <h2 className="text-base font-semibold text-content-primary">Actividad reciente</h2>
            </div>
            {stats.recent_activity && stats.recent_activity.length > 0 ? (
              <div className="divide-y divide-surface-border">
                {stats.recent_activity.slice(0, 8).map((item: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 py-3 hover:bg-surface-hover rounded-lg px-2
                               transition-colors duration-150 cursor-pointer"
                    onClick={() => item.student_id && navigate(`/admin/students/${item.student_id}`)}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-content-primary truncate">
                        {item.description ?? item.message ?? '—'}
                      </p>
                      {item.student_name && (
                        <p className="text-xs text-content-secondary truncate">{item.student_name}</p>
                      )}
                    </div>
                    <span className="text-xs text-content-tertiary whitespace-nowrap flex-shrink-0">
                      {item.created_at
                        ? new Date(item.created_at).toLocaleDateString('es-MX', {
                            day: 'numeric',
                            month: 'short',
                          })
                        : ''}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center mb-3">
                  <Clock size={18} className="text-content-tertiary" />
                </div>
                <p className="text-sm text-content-secondary">Sin actividad reciente</p>
              </div>
            )}
          </div>

          {/* Top programs */}
          <div className="bg-white rounded-card border border-surface-border shadow-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-content-secondary" />
              <h2 className="text-base font-semibold text-content-primary">Programas más solicitados</h2>
            </div>
            {stats.top_programs && stats.top_programs.length > 0 ? (
              <div className="space-y-3">
                {stats.top_programs.slice(0, 5).map((prog: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-content-tertiary w-4 flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-content-primary truncate">{prog.name}</p>
                      <p className="text-xs text-content-secondary truncate">{prog.dependency_name}</p>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-badge text-xs
                                     font-medium bg-primary-50 text-primary-700 flex-shrink-0">
                      {prog.count} alumnos
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center mb-3">
                  <TrendingUp size={18} className="text-content-tertiary" />
                </div>
                <p className="text-sm text-content-secondary">Sin datos de programas</p>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
