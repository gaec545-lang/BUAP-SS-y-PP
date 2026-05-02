import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Upload,
  Settings,
  Calendar,
  MessageSquare,
  RefreshCw,
  FileSpreadsheet,
  ChevronDown,
  Search,
  X,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { AdminLayout, AdminPageHeader } from './AdminLayout'
import {
  adminGetConfig,
  adminUpdateConfig,
  adminGetPrograms,
  adminGetAuditLog,
  adminUploadPrograms,
} from '../../services/api'
import { ErrorBoundary } from '../../components/ErrorBoundary'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ConfigItem {
  key: string
  value: string
  description?: string
}

interface Program {
  id: number
  folio: string
  name: string
  program_type: 'ss' | 'pp' | string
  career_name?: string
  career?: string
  dependency_name?: string
  sector?: string
  max_slots: number
  used_slots: number
  cupos?: number
  cupos_disponibles?: number
}

interface UploadResult {
  success: boolean
  total_rows: number
  new_programs: number
  updated_programs: number
  errors_count: number
  errors: Array<{ row: number; error: string }>
  // aliases returned by the backend
  processed: number
  created: number
  updated: number
}

interface AuditEntry {
  id: number
  action: string
  user_name: string
  created_at: string
  details_after?: {
    processed?: number
    created?: number
    updated?: number
    new_programs?: number
    updated_programs?: number
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────────────────────

interface ToastProps {
  message: string
  type: 'success' | 'error'
  onClose: () => void
}

function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3
                  rounded-card shadow-dropdown animate-slide-up
                  ${type === 'success' ? 'bg-success text-white' : 'bg-danger text-white'}`}
    >
      {type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
      <p className="text-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        className="ml-2 opacity-70 hover:opacity-100 transition-opacity duration-150"
      >
        <X size={14} />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Toggle Switch
// ─────────────────────────────────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (val: boolean) => void
  label?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex items-center w-14 h-7 rounded-full
                  transition-colors duration-200 focus:outline-none focus:ring-2
                  focus:ring-primary-300 focus:ring-offset-2
                  ${checked ? 'bg-success' : 'bg-gray-300'}`}
    >
      <span className="sr-only">{label}</span>
      <span
        className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow
                    transition-transform duration-200
                    ${checked ? 'translate-x-7' : 'translate-x-0'}`}
      />
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton row
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[...Array(10)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 bg-gray-100 rounded w-full" />
        </td>
      ))}
    </tr>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Card 1 — Periodo activo
// ─────────────────────────────────────────────────────────────────────────────

function PeriodCard({ configMap }: { configMap: Record<string, string> }) {
  const name = configMap['period_name'] ?? configMap['active_period_name'] ?? null
  const start = configMap['period_start'] ?? configMap['active_period_start'] ?? null
  const end = configMap['period_end'] ?? configMap['active_period_end'] ?? null

  function fmt(d: string | null) {
    if (!d) return '—'
    try {
      return new Date(d + 'T00:00:00').toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return d
    }
  }

  return (
    <div className="bg-white rounded-card border border-surface-border shadow-card p-6">
      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-surface-border">
        <Calendar size={20} className="text-content-secondary" />
        <h2 className="text-lg font-semibold text-content-primary">Periodo activo</h2>
      </div>

      {name ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-badge
                         text-xs font-medium bg-success-light text-success-dark"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              Activo
            </span>
            <p className="text-base font-semibold text-content-primary">{name}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-content-tertiary mb-0.5">Inicio</p>
              <p className="text-sm text-content-primary">{fmt(start)}</p>
            </div>
            <div>
              <p className="text-xs text-content-tertiary mb-0.5">Fin</p>
              <p className="text-sm text-content-primary">{fmt(end)}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center mb-3">
            <Calendar size={20} className="text-content-tertiary" />
          </div>
          <p className="text-sm font-medium text-content-secondary">Sin periodo configurado</p>
          <p className="text-xs text-content-tertiary mt-1">
            No se encontraron claves de periodo en la configuración.
          </p>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Card 2 — Control de acceso a inscripciones
// ─────────────────────────────────────────────────────────────────────────────

function AccessControlCard({
  configMap,
  onSaved,
}: {
  configMap: Record<string, string>
  onSaved: (msg: string) => void
}) {
  const [enabled, setEnabled] = useState(configMap['enrollment_enabled'] !== 'false')
  const [blockDate, setBlockDate] = useState(configMap['block_until_date'] ?? '')
  const [blockMsg, setBlockMsg] = useState(configMap['block_message'] ?? '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      await Promise.all([
        adminUpdateConfig('enrollment_enabled', enabled ? 'true' : 'false'),
        adminUpdateConfig('block_until_date', blockDate),
        adminUpdateConfig('block_message', blockMsg),
      ])
      onSaved('Configuración guardada')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar'
      setSaveError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-card border border-surface-border shadow-card p-6">
      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-surface-border">
        <Settings size={20} className="text-content-secondary" />
        <h2 className="text-lg font-semibold text-content-primary">
          Control de acceso a inscripciones
        </h2>
      </div>

      <div className="space-y-5">
        {/* Toggle */}
        <div
          className={`flex items-center justify-between p-4 rounded-lg border transition-colors duration-200
                      ${enabled ? 'bg-success-light border-success/30' : 'bg-gray-50 border-surface-border'}`}
        >
          <div>
            <p className="text-sm font-medium text-content-primary">Inscripciones habilitadas</p>
            <p className="text-xs text-content-secondary mt-0.5">
              {enabled ? 'Los alumnos pueden inscribirse normalmente.' : 'Los alumnos ven una pantalla de espera.'}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span
              className={`text-xs font-semibold ${enabled ? 'text-success-dark' : 'text-content-tertiary'}`}
            >
              {enabled ? 'SÍ' : 'NO'}
            </span>
            <ToggleSwitch
              checked={enabled}
              onChange={setEnabled}
              label="Habilitar inscripciones"
            />
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-medium text-content-secondary mb-1.5">
            <span className="flex items-center gap-1.5">
              <Calendar size={12} />
              Mostrar a los alumnos que estará disponible el:
            </span>
          </label>
          <input
            type="date"
            value={blockDate}
            onChange={(e) => setBlockDate(e.target.value)}
            className="px-3 py-2 text-sm rounded-input border border-surface-border
                       focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400
                       transition-all duration-150"
          />
        </div>

        {/* Message */}
        <div>
          <label className="block text-xs font-medium text-content-secondary mb-1.5">
            <span className="flex items-center gap-1.5">
              <MessageSquare size={12} />
              Mensaje para los alumnos durante el bloqueo:
            </span>
          </label>
          <textarea
            value={blockMsg}
            onChange={(e) => setBlockMsg(e.target.value)}
            rows={3}
            placeholder="El portal de inscripciones abrirá próximamente..."
            className="w-full px-3 py-2 text-sm rounded-input border border-surface-border
                       focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400
                       transition-all duration-150 resize-none"
          />
          <p className="text-xs text-content-tertiary mt-1">
            Cuando está deshabilitado, los alumnos ven una pantalla de espera con este mensaje.
          </p>
        </div>

        {saveError && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-danger-light border border-danger/20">
            <AlertCircle size={14} className="text-danger flex-shrink-0" />
            <p className="text-xs text-danger-dark">{saveError}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700
                     disabled:bg-primary-300 text-white text-sm font-medium rounded-button
                     transition-colors duration-150"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Guardar cambios
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Card 3 — Programas disponibles
// ─────────────────────────────────────────────────────────────────────────────

type FilterTipo = 'todos' | 'ss' | 'pp'
type FilterEstado = 'todos' | 'disponible' | 'completo'

function normalizeProgram(p: Program) {
  const maxSlots = p.max_slots ?? p.cupos ?? 0
  const usedSlots = p.used_slots ?? (p.cupos !== undefined && p.cupos_disponibles !== undefined
    ? p.cupos - p.cupos_disponibles
    : 0)
  const available = maxSlots - usedSlots
  const career = p.career_name ?? p.career ?? '—'
  const sector = p.sector ?? '—'
  return { ...p, maxSlots, usedSlots, available, career, sector }
}

function ProgramsCard({ onToast }: { onToast: (msg: string, type: 'success' | 'error') => void }) {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loadingPrograms, setLoadingPrograms] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [auditEntry, setAuditEntry] = useState<AuditEntry | null>(null)

  // Filters
  const [filterTipo, setFilterTipo] = useState<FilterTipo>('todos')
  const [filterCareer, setFilterCareer] = useState('todos')
  const [filterSector, setFilterSector] = useState('todos')
  const [filterEstado, setFilterEstado] = useState<FilterEstado>('todos')
  const [search, setSearch] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadPrograms = useCallback(async () => {
    setLoadingPrograms(true)
    try {
      const data = await adminGetPrograms()
      setPrograms(data)
    } catch {
      // silently fail — empty state handles it
    } finally {
      setLoadingPrograms(false)
    }
  }, [])

  const loadAuditLog = useCallback(async () => {
    try {
      const data = await adminGetAuditLog({ action: 'upload_programs_excel', limit: 1 })
      if (data.length > 0) setAuditEntry(data[0])
    } catch {
      // audit log is optional — ignore errors
    }
  }, [])

  useEffect(() => {
    loadPrograms()
    loadAuditLog()
  }, [loadPrograms, loadAuditLog])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setUploading(true)
    setUploadResult(null)
    setUploadError(null)

    try {
      const result: UploadResult = await adminUploadPrograms(file)
      setUploadResult(result)
      onToast(
        `Excel procesado: ${result.total_rows ?? result.processed} filas — ${result.new_programs ?? result.created} nuevos, ${result.updated_programs ?? result.updated} actualizados` +
          (result.errors_count > 0 ? `, ${result.errors_count} errores` : ''),
        'success',
      )
      await loadPrograms()
      await loadAuditLog()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al subir el archivo'
      setUploadError(msg)
      onToast(msg, 'error')
    } finally {
      setUploading(false)
    }
  }

  const normalized = programs.map(normalizeProgram)

  // Derive unique careers from data
  const uniqueCareers = Array.from(new Set(normalized.map((p) => p.career).filter((c) => c !== '—'))).sort()

  // Derive unique sectors from data
  const uniqueSectors = Array.from(new Set(normalized.map((p) => p.sector).filter((s) => s !== '—')))

  // Stats
  const total = normalized.length
  const disponibles = normalized.filter((p) => p.available > 0).length
  const completos = normalized.filter((p) => p.available <= 0).length
  const totalCupos = normalized.reduce((sum, p) => sum + p.available, 0)

  // Filtered list
  const filtered = normalized.filter((p) => {
    if (filterTipo !== 'todos' && p.program_type !== filterTipo) return false
    if (filterCareer !== 'todos' && p.career !== filterCareer) return false
    if (filterSector !== 'todos' && p.sector !== filterSector) return false
    if (filterEstado === 'disponible' && p.available <= 0) return false
    if (filterEstado === 'completo' && p.available > 0) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      if (!p.name.toLowerCase().includes(q) && !p.folio.toLowerCase().includes(q)) return false
    }
    return true
  })

  function fmtDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString('es-MX', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    } catch {
      return iso
    }
  }

  return (
    <div className="bg-white rounded-card border border-surface-border shadow-card p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <FileSpreadsheet size={20} className="text-content-secondary" />
          <h2 className="text-lg font-semibold text-content-primary">Programas disponibles</h2>
        </div>
        <button
          type="button"
          onClick={loadPrograms}
          disabled={loadingPrograms}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-surface-border rounded-button
                     text-xs text-content-secondary hover:bg-surface-hover transition-colors duration-150"
        >
          <RefreshCw size={12} className={loadingPrograms ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Upload section */}
      <div className="flex items-center gap-4 flex-wrap">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700
                     disabled:bg-primary-300 text-white text-sm font-medium rounded-button
                     transition-colors duration-150"
        >
          {uploading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Upload size={14} />
          )}
          {uploading ? 'Subiendo...' : 'Subir Excel de programas'}
        </button>
        <p className="text-xs text-content-tertiary">Formato .xlsx · Se actualizarán los programas existentes por folio</p>
      </div>

      {/* Upload result inline */}
      {uploadResult && (
        <div className="p-4 rounded-lg bg-success-light border border-success/30 space-y-1 animate-fade-in">
          <p className="text-sm font-medium text-success-dark">
            Se procesaron {uploadResult.total_rows ?? uploadResult.processed} filas:{' '}
            {uploadResult.new_programs ?? uploadResult.created} nuevos,{' '}
            {uploadResult.updated_programs ?? uploadResult.updated} actualizados
            {(uploadResult.errors_count ?? 0) > 0 && `, ${uploadResult.errors_count} errores`}
          </p>
          {uploadResult.errors && Array.isArray(uploadResult.errors) && uploadResult.errors.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {uploadResult.errors.map((e, i) => (
                <li key={i} className="text-xs text-danger-dark flex items-start gap-1.5">
                  <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                  {`Fila ${e.row}: ${e.error}`}
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={() => setUploadResult(null)}
            className="text-xs text-success-dark underline mt-1"
          >
            Cerrar
          </button>
        </div>
      )}

      {uploadError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-danger-light border border-danger/20 animate-fade-in">
          <AlertCircle size={14} className="text-danger flex-shrink-0" />
          <p className="text-xs text-danger-dark flex-1">{uploadError}</p>
          <button onClick={() => setUploadError(null)} className="text-danger hover:opacity-70 transition-opacity duration-150">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total programas', value: total, color: 'text-content-primary' },
          { label: 'Disponibles', value: disponibles, color: 'text-success-dark' },
          { label: 'Completos', value: completos, color: 'text-danger-dark' },
          { label: 'Total cupos disponibles', value: totalCupos, color: 'text-primary-700' },
        ].map((s) => (
          <div key={s.label} className="bg-surface rounded-lg border border-surface-border p-4">
            <p className="text-xs text-content-tertiary mb-1">{s.label}</p>
            <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Tipo */}
        <div className="relative">
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value as FilterTipo)}
            className="appearance-none pl-3 pr-8 py-2 text-xs rounded-input border border-surface-border
                       bg-white focus:outline-none focus:ring-2 focus:ring-primary-300
                       text-content-secondary transition-all duration-150"
          >
            <option value="todos">Tipo: Todos</option>
            <option value="ss">SS</option>
            <option value="pp">PP</option>
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-content-tertiary pointer-events-none" />
        </div>

        {/* Carrera */}
        <div className="relative">
          <select
            value={filterCareer}
            onChange={(e) => setFilterCareer(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 text-xs rounded-input border border-surface-border
                       bg-white focus:outline-none focus:ring-2 focus:ring-primary-300
                       text-content-secondary transition-all duration-150 max-w-[200px]"
          >
            <option value="todos">Carrera: Todas</option>
            {uniqueCareers.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-content-tertiary pointer-events-none" />
        </div>

        {/* Sector */}
        <div className="relative">
          <select
            value={filterSector}
            onChange={(e) => setFilterSector(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 text-xs rounded-input border border-surface-border
                       bg-white focus:outline-none focus:ring-2 focus:ring-primary-300
                       text-content-secondary transition-all duration-150"
          >
            <option value="todos">Sector: Todos</option>
            {uniqueSectors.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-content-tertiary pointer-events-none" />
        </div>

        {/* Estado */}
        <div className="relative">
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value as FilterEstado)}
            className="appearance-none pl-3 pr-8 py-2 text-xs rounded-input border border-surface-border
                       bg-white focus:outline-none focus:ring-2 focus:ring-primary-300
                       text-content-secondary transition-all duration-150"
          >
            <option value="todos">Estado: Todos</option>
            <option value="disponible">Disponible</option>
            <option value="completo">Completo</option>
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-content-tertiary pointer-events-none" />
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o folio..."
            className="w-full pl-8 pr-3 py-2 text-xs rounded-input border border-surface-border
                       focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400
                       transition-all duration-150"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-content-tertiary hover:text-content-secondary transition-colors duration-150"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-surface-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-surface border-b border-surface-border">
              {['Folio', 'Programa', 'Tipo', 'Carrera', 'Dependencia', 'Sector', 'Cupo máx.', 'Inscritos', 'Disponibles', 'Estado'].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium text-content-tertiary uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-divider">
            {loadingPrograms ? (
              [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={10}>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center mb-3">
                      <FileSpreadsheet size={20} className="text-content-tertiary" />
                    </div>
                    <p className="text-sm font-medium text-content-secondary">
                      {programs.length === 0 ? 'Sin programas cargados' : 'Sin resultados para los filtros aplicados'}
                    </p>
                    <p className="text-xs text-content-tertiary mt-1">
                      {programs.length === 0
                        ? 'Sube un archivo Excel para importar programas.'
                        : 'Ajusta los filtros para ver más resultados.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="hover:bg-surface-hover transition-colors duration-150">
                  <td className="px-4 py-3 font-mono text-content-primary whitespace-nowrap">{p.folio}</td>
                  <td className="px-4 py-3 text-content-primary max-w-[220px]">
                    <p className="truncate" title={p.name}>{p.name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-badge text-xs font-medium
                                  ${p.program_type === 'pp'
                                    ? 'bg-info-light text-info-dark'
                                    : 'bg-primary-50 text-primary-700'}`}
                    >
                      {p.program_type?.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-content-secondary max-w-[150px]">
                    <p className="truncate" title={p.career}>{p.career}</p>
                  </td>
                  <td className="px-4 py-3 text-content-secondary max-w-[180px]">
                    <p className="truncate" title={p.dependency_name ?? '—'}>{p.dependency_name ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-content-secondary whitespace-nowrap">{p.sector}</td>
                  <td className="px-4 py-3 text-right text-content-primary font-mono">{p.maxSlots}</td>
                  <td className="px-4 py-3 text-right text-content-secondary font-mono">{p.usedSlots}</td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-content-primary">{p.available}</td>
                  <td className="px-4 py-3">
                    {p.available <= 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-badge text-xs font-medium bg-danger-light text-danger-dark">
                        COMPLETO
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-badge text-xs font-medium bg-success-light text-success-dark">
                        Disponible
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Upload history */}
      {auditEntry && (
        <div className="pt-3 border-t border-surface-border">
          <p className="text-xs text-content-tertiary">
            Última carga:{' '}
            <span className="text-content-secondary font-medium">{fmtDate(auditEntry.created_at)}</span>
            {' '}por{' '}
            <span className="text-content-secondary font-medium">{auditEntry.user_name}</span>
            {auditEntry.details_after && (
              <>
                {' '}—{' '}
                {(auditEntry.details_after.created ?? auditEntry.details_after.new_programs ?? 0) + (auditEntry.details_after.updated ?? auditEntry.details_after.updated_programs ?? 0)} programas (
                {auditEntry.details_after.created ?? auditEntry.details_after.new_programs ?? 0} nuevos,{' '}
                {auditEntry.details_after.updated ?? auditEntry.details_after.updated_programs ?? 0} actualizados)
              </>
            )}
          </p>
        </div>
      )}
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export function AdminConfigPage() {
  const [configMap, setConfigMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type })
  }

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const items: ConfigItem[] = await adminGetConfig()

      const map: Record<string, string> = {}
      for (const item of items) map[item.key] = item.value
      setConfigMap(map)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar configuración'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <AdminLayout>
      <AdminPageHeader
        breadcrumb={['Admin', 'Configuración del periodo']}
        title="Configuración del periodo"
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

      {loading ? (
        <div className="space-y-6">
          {/* Skeleton for top two cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-card border border-surface-border shadow-card p-6 animate-pulse"
              >
                <div className="h-4 bg-gray-100 rounded w-1/3 mb-5" />
                <div className="space-y-3">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="h-4 bg-gray-100 rounded" />
                  ))}
                </div>
              </div>
            ))}
          </div>
          {/* Skeleton for programs card */}
          <div className="bg-white rounded-card border border-surface-border shadow-card p-6 animate-pulse">
            <div className="h-4 bg-gray-100 rounded w-1/4 mb-5" />
            <div className="space-y-3">
              {[...Array(5)].map((_, j) => (
                <div key={j} className="h-4 bg-gray-100 rounded" />
              ))}
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-4 rounded-card bg-danger-light border border-danger/20">
          <AlertCircle size={16} className="text-danger flex-shrink-0" />
          <p className="text-sm text-danger-dark flex-1">{error}</p>
          <button
            onClick={load}
            className="text-xs text-danger-dark underline hover:no-underline transition-all duration-150"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* Row: Period + Access control */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PeriodCard configMap={configMap} />
            <AccessControlCard
              configMap={configMap}
              onSaved={(msg) => {
                showToast(msg, 'success')
                load()
              }}
            />
          </div>

          {/* Programs card (full width) */}
          <ErrorBoundary>
            <ProgramsCard onToast={showToast} />
          </ErrorBoundary>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </AdminLayout>
  )
}
