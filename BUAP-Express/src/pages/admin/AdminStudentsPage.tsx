import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronRight, AlertCircle, RefreshCw, Loader2 } from 'lucide-react'
import { AdminLayout, AdminPageHeader } from './AdminLayout'
import { adminGetStudents } from '../../services/api'

// ─────────────────────────────────────────────────────────────────────────────
// Enrollment status badge
// ─────────────────────────────────────────────────────────────────────────────

function EnrollStatusBadge({ status }: { status?: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    not_enrolled: { label: 'Sin inscripción', cls: 'bg-gray-100 text-gray-500' },
    pending_validation: { label: 'En revisión', cls: 'bg-warning-light text-warning-dark' },
    active: { label: 'Activo', cls: 'bg-info-light text-info-dark' },
    completed: { label: 'Completado', cls: 'bg-success-light text-success-dark' },
    cancelled: { label: 'Cancelado', cls: 'bg-danger-light text-danger-dark' },
    blocked: { label: 'Bloqueado', cls: 'bg-danger-light text-danger-dark' },
  }
  const s = map[status ?? ''] ?? { label: status ?? '—', cls: 'bg-gray-100 text-gray-500' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-badge text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton rows
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${50 + i * 10}%` }} />
        </td>
      ))}
    </tr>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export function AdminStudentsPage() {
  const navigate = useNavigate()
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [modalityFilter, setModalityFilter] = useState('')
  const [serviceFilter, setServiceFilter] = useState('')

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await adminGetStudents({
        search: search || undefined,
        modality_code: modalityFilter || undefined,
        service_type: serviceFilter || undefined,
      })
      setStudents(data)
    } catch (err: any) {
      setError(err.message ?? 'Error al cargar alumnos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    load()
  }

  const modalities = [
    { code: '', label: 'Todas las modalidades' },
    { code: 'escolarizado', label: 'Escolarizado' },
    { code: 'semi_escolarizado', label: 'Semi-escolarizado' },
    { code: 'distancia', label: 'Distancia' },
  ]

  const serviceTypes = [
    { code: '', label: 'Todos los servicios' },
    { code: 'ss', label: 'Servicio Social' },
    { code: 'pp', label: 'Práctica Profesional' },
  ]

  return (
    <AdminLayout>
      <AdminPageHeader
        breadcrumb={['Admin', 'Alumnos']}
        title="Alumnos"
        subtitle={`${students.length} alumno${students.length !== 1 ? 's' : ''} registrado${students.length !== 1 ? 's' : ''}`}
      />

      {/* Filters */}
      <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o matrícula..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-input border border-surface-border
                       focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400
                       transition-all text-content-primary placeholder:text-content-tertiary"
          />
        </div>
        <select
          value={modalityFilter}
          onChange={(e) => setModalityFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-input border border-surface-border bg-white
                     text-content-primary focus:outline-none focus:ring-2 focus:ring-primary-300
                     focus:border-primary-400 transition-all"
        >
          {modalities.map((m) => (
            <option key={m.code} value={m.code}>{m.label}</option>
          ))}
        </select>
        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-input border border-surface-border bg-white
                     text-content-primary focus:outline-none focus:ring-2 focus:ring-primary-300
                     focus:border-primary-400 transition-all"
        >
          {serviceTypes.map((s) => (
            <option key={s.code} value={s.code}>{s.label}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700
                     disabled:bg-primary-300 text-white text-sm font-medium rounded-button
                     transition-colors duration-150"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          Buscar
        </button>
        <button
          type="button"
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-2 border border-surface-border rounded-button
                     text-sm text-content-secondary hover:bg-surface-hover transition-colors duration-150"
        >
          <RefreshCw size={14} />
        </button>
      </form>

      {/* Table */}
      {error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
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
      ) : (
        <div className="bg-white rounded-card border border-surface-border shadow-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-border bg-surface">
                {['Alumno', 'Matrícula', 'Carrera', 'Modalidad', 'Estado', 'Paso actual'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-medium text-content-tertiary uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {loading ? (
                [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <p className="text-sm text-content-tertiary">No se encontraron alumnos</p>
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => navigate(`/admin/students/${s.id}`)}
                    className="hover:bg-surface-hover cursor-pointer transition-colors duration-150"
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-content-primary">{s.full_name}</p>
                      <p className="text-xs text-content-tertiary">{s.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono text-content-secondary">{s.matricula}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-content-secondary">
                        {s.career?.code ?? s.career ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-content-secondary capitalize">
                        {s.modality?.code?.replace('_', ' ') ?? s.modality ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <EnrollStatusBadge status={s.enrollment_status} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono text-content-secondary">
                        {s.current_step != null
                          ? `${s.current_step}${s.total_steps ? ` / ${s.total_steps}` : ''}`
                          : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight size={16} className="text-content-tertiary" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  )
}
