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
  ChevronDown,
  ChevronUp,
  Eye,
  Loader2,
  FileText
} from 'lucide-react'
import { AdminLayout, AdminPageHeader } from './AdminLayout'
import { 
  adminGetDashboardStats, 
  adminGetStudents,
  adminGetStudent,
  api
} from '../../services/api'

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
// Student Row with Expandable Details
// ─────────────────────────────────────────────────────────────────────────────

function StudentRow({ student }: { student: any }) {
  const [expanded, setExpanded] = useState(false)
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [uploads, setUploads] = useState<any[]>([])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  async function toggleExpand() {
    if (!expanded) {
      setExpanded(true)
      if (uploads.length === 0) {
        setLoadingDocs(true)
        try {
          const stData = await adminGetStudent(student.id)
          const allUploads: any[] = []
          stData.processes?.forEach((proc: any) => {
            proc.steps?.forEach((step: any) => {
              step.uploads?.forEach((up: any) => {
                allUploads.push({ ...up, process_name: proc.name, step_name: step.short_label })
              })
            })
          })
          setUploads(allUploads)
        } catch (err) {
          console.error(err)
        } finally {
          setLoadingDocs(false)
        }
      }
    } else {
      setExpanded(false)
      setPreviewUrl(null)
    }
  }

  async function loadPreview(uploadId: number) {
    setPreviewLoading(true)
    try {
      const res = await api.get(`uploads/${uploadId}/file`, { responseType: 'blob' })
      const blob = res.data
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
    } catch (err) {
      console.error(err)
    } finally {
      setPreviewLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'approved': return 'bg-success-light text-success-dark'
      case 'rejected': return 'bg-danger-light text-danger-dark'
      default: return 'bg-warning-light text-warning-dark'
    }
  }

  return (
    <div className="border-b border-surface-border last:border-0 bg-white">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-hover transition-colors"
        onClick={toggleExpand}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-content-primary truncate">{student.full_name}</p>
          <p className="text-xs text-content-secondary">{student.matricula} • {student.email}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded">
            {student.career?.code || student.career || 'N/A'}
          </span>
          {expanded ? <ChevronUp size={16} className="text-content-tertiary" /> : <ChevronDown size={16} className="text-content-tertiary" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-2 bg-surface">
          <h4 className="text-xs font-bold text-content-secondary uppercase tracking-wider mb-3">Documentos y Validación</h4>
          
          {loadingDocs ? (
            <div className="flex items-center gap-2 text-xs text-content-tertiary">
              <Loader2 size={14} className="animate-spin" /> Cargando documentos...
            </div>
          ) : uploads.length === 0 ? (
            <p className="text-xs text-content-tertiary italic">Este alumno no tiene documentos subidos.</p>
          ) : (
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 space-y-2">
                {uploads.map((up, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg border border-surface-border flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-content-primary">{up.document_type_name || up.document_type || 'Documento'}</p>
                      <p className="text-[10px] text-content-tertiary">{up.process_name} - {up.step_name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${getStatusColor(up.status)}`}>
                        {up.status === 'pending' ? 'Pendiente' : up.status === 'approved' ? 'Aprobado' : 'Rechazado'}
                      </span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); loadPreview(up.id); }}
                        className="p-1.5 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded transition-colors"
                        title="Ver previsualización"
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Document Preview Panel */}
              <div className="flex-1 min-h-[300px] border border-surface-border rounded-lg bg-white flex flex-col overflow-hidden">
                <div className="bg-surface px-3 py-2 border-b border-surface-border flex items-center justify-between">
                  <span className="text-xs font-bold text-content-secondary flex items-center gap-1.5">
                    <FileText size={14} /> Previsualización
                  </span>
                  {previewUrl && (
                    <a href={previewUrl} target="_blank" rel="noreferrer" className="text-[10px] text-primary-600 hover:underline">
                      Abrir en pestaña nueva
                    </a>
                  )}
                </div>
                <div className="flex-1 flex items-center justify-center bg-gray-50/50 p-2">
                  {previewLoading ? (
                    <Loader2 size={24} className="animate-spin text-primary-400" />
                  ) : previewUrl ? (
                    <iframe src={previewUrl} className="w-full h-full min-h-[400px] border-0 rounded" title="Document Preview" />
                  ) : (
                    <p className="text-xs text-content-tertiary text-center">Selecciona un documento para visualizarlo aquí.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export function AdminDashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<any>(null)
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await adminGetDashboardStats()
      setStats(data)
      const stData = await adminGetStudents()
      setStudents(stData.slice(0, 10)) // load recent students for dashboard
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
          label: 'Revisiones',
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
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main List of Students */}
          <div className="xl:col-span-2 bg-white rounded-card border border-surface-border shadow-card overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-surface-border bg-surface">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-content-secondary" />
                <h2 className="text-base font-semibold text-content-primary">Lista de Estudiantes (Recientes)</h2>
              </div>
              <button 
                onClick={() => navigate('/admin/students')}
                className="text-xs font-medium text-primary-600 hover:underline"
              >
                Ver todos
              </button>
            </div>
            
            <div className="divide-y divide-surface-border max-h-[600px] overflow-y-auto">
              {students.length > 0 ? (
                students.map((student) => (
                  <StudentRow key={student.id} student={student} />
                ))
              ) : (
                <div className="p-8 text-center text-sm text-content-tertiary">
                  No hay estudiantes recientes para mostrar.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Recent activity */}
          <div className="space-y-6">
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
        </div>
      )}
    </AdminLayout>
  )
}
