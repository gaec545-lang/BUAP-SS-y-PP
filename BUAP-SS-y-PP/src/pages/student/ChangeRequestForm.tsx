import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  FileText,
  Search,
} from 'lucide-react'
import { useStudent } from '../../context/StudentContext'
import { submitChangeRequest, getAvailablePrograms } from '../../services/api'
import { BuapLogo } from '../../components/BuapLogo'
import { ResourceWarning } from '../../components/ResourceWarning'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MIN_JUSTIFICATION = 50

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export function ChangeRequestForm() {
  const { type } = useParams<{ type: 'cambio' | 'baja' }>()
  const { enrollmentStatus } = useStudent()
  const navigate = useNavigate()

  const isBaja = type === 'baja'
  const isCambio = type === 'cambio'

  const [newFolio, setNewFolio] = useState('')
  const [newProgram, setNewProgram] = useState<any>(null)
  const [folioSearching, setFolioSearching] = useState(false)
  const [folioError, setFolioError] = useState<string | null>(null)

  const [justification, setJustification] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const justLen = justification.trim().length
  const justValid = justLen >= MIN_JUSTIFICATION
  const canSubmit =
    justValid &&
    (!isCambio || newProgram !== null) &&
    !loading

  async function handleSearchFolio(e: React.FormEvent) {
    e.preventDefault()
    if (!newFolio.trim()) return
    setFolioSearching(true)
    setFolioError(null)
    setNewProgram(null)
    try {
      const programs = await getAvailablePrograms(
        enrollmentStatus?.program?.program_type ?? 'ss',
      )
      const found = programs.find(
        (p: any) => p.folio.toUpperCase() === newFolio.trim().toUpperCase(),
      )
      if (!found) {
        setFolioError('Este folio no se encontró.')
      } else {
        setNewProgram(found)
      }
    } catch (err: any) {
      setFolioError(err.message ?? 'Error al buscar el programa')
    } finally {
      setFolioSearching(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError(null)
    try {
      await submitChangeRequest({
        request_type: type!,
        justification: justification.trim(),
        new_program_folio: isCambio ? newFolio.trim() : undefined,
      })
      setSuccess(true)
      setTimeout(() => navigate('/student'), 2000)
    } catch (err: any) {
      setError(err.message ?? 'Error al enviar la solicitud')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="bg-white rounded-card shadow-card border border-surface-border p-8 max-w-sm w-full text-center animate-scale-in">
          <div className="w-12 h-12 rounded-full bg-success-light flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={24} className="text-success" />
          </div>
          <h2 className="text-lg font-semibold text-content-primary mb-2">
            Solicitud enviada
          </h2>
          <p className="text-sm text-content-secondary">
            Tu solicitud está en revisión. Redirigiendo a tu panel...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-white border-b border-surface-border">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center gap-4">
          <BuapLogo size={32} />
          <div className="flex-1">
            <p className="text-xs text-content-tertiary">Solicitud</p>
            <h1 className="text-base font-semibold text-content-primary leading-tight">
              {isBaja ? 'Baja de programa' : 'Cambio de programa'}
            </h1>
          </div>
          <button
            onClick={() => navigate('/student')}
            className="flex items-center gap-1.5 text-sm text-content-secondary
                       hover:text-content-primary transition-colors duration-150"
          >
            <ArrowLeft size={16} />
            Cancelar
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Current program card */}
        {enrollmentStatus?.program && (
          <div className="bg-white rounded-card border border-surface-border shadow-card p-5">
            <p className="text-xs font-medium text-content-tertiary uppercase tracking-wider mb-3">
              Programa actual
            </p>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center flex-shrink-0">
                <FileText size={16} className="text-content-secondary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-content-primary">
                  {enrollmentStatus.program.name}
                </p>
                <p className="text-xs text-content-secondary mt-0.5">
                  {enrollmentStatus.program.dependency_name}
                </p>
                <p className="text-xs font-mono text-content-tertiary mt-1">
                  {enrollmentStatus.program.folio}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Resource warning for baja */}
        {isBaja && <ResourceWarning />}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* New folio (only for cambio) */}
          {isCambio && (
            <div className="bg-white rounded-card border border-surface-border shadow-card p-5">
              <p className="text-sm font-semibold text-content-primary mb-4">
                Nuevo programa
              </p>
              <div>
                <label className="block text-xs font-medium text-content-secondary mb-1.5">
                  Folio del nuevo programa
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFolio}
                    onChange={(e) => {
                      setNewFolio(e.target.value.toUpperCase())
                      setNewProgram(null)
                      setFolioError(null)
                    }}
                    placeholder="Ej. SS-2024-002"
                    required={isCambio}
                    className="flex-1 px-3 py-2 text-sm rounded-input border border-surface-border
                               font-mono text-content-primary placeholder:text-content-tertiary
                               focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400
                               transition-all duration-150"
                  />
                  <button
                    type="button"
                    onClick={handleSearchFolio}
                    disabled={folioSearching || !newFolio.trim()}
                    className="flex items-center gap-1.5 px-3 py-2 border border-surface-border
                               rounded-button text-sm text-content-secondary hover:bg-surface-hover
                               disabled:opacity-50 transition-colors duration-150"
                  >
                    {folioSearching ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Search size={14} />
                    )}
                    Verificar
                  </button>
                </div>
                {folioError && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-danger">
                    <AlertCircle size={12} />
                    {folioError}
                  </div>
                )}
                {newProgram && (
                  <div className="mt-3 p-3 rounded-lg bg-success-light/40 border border-success/30">
                    <div className="flex items-center gap-1.5 mb-1">
                      <CheckCircle2 size={12} className="text-success" />
                      <span className="text-xs font-medium text-success-dark">Programa encontrado</span>
                    </div>
                    <p className="text-sm font-medium text-content-primary">{newProgram.name}</p>
                    <p className="text-xs text-content-secondary">{newProgram.dependency_name}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Justification */}
          <div className="bg-white rounded-card border border-surface-border shadow-card p-5">
            <p className="text-sm font-semibold text-content-primary mb-4">
              Justificación
            </p>
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1.5">
                Explica el motivo de tu solicitud
              </label>
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Describe detalladamente la razón por la que solicitas el cambio..."
                required
                rows={5}
                className="w-full px-3 py-2 text-sm rounded-input border border-surface-border
                           text-content-primary placeholder:text-content-tertiary
                           focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400
                           transition-all duration-150 resize-none"
              />
              <div className="flex items-center justify-between mt-1">
                <span className={`text-xs ${justLen < MIN_JUSTIFICATION ? 'text-content-tertiary' : 'text-success'}`}>
                  {justLen < MIN_JUSTIFICATION
                    ? `Mínimo ${MIN_JUSTIFICATION} caracteres (faltan ${MIN_JUSTIFICATION - justLen})`
                    : 'Longitud suficiente'}
                </span>
                <span className="text-xs text-content-tertiary">{justLen} caracteres</span>
              </div>
            </div>
          </div>

          {/* Confirmation note */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-warning-light border border-warning/30">
            <AlertTriangle size={14} className="text-warning-dark flex-shrink-0 mt-0.5" />
            <p className="text-xs text-warning-dark">
              {isBaja
                ? 'Al solicitar la baja, tu proceso de servicio/práctica quedará suspendido hasta que la coordinación apruebe la solicitud.'
                : 'El cambio de programa requiere aprobación de la coordinación. Tu proceso continuará con el programa actual hasta que sea aprobado.'}
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-danger-light border border-danger/20">
              <AlertCircle size={14} className="text-danger flex-shrink-0 mt-0.5" />
              <p className="text-xs text-danger-dark">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 text-white
                        text-sm font-medium rounded-button transition-colors duration-150
                        disabled:cursor-not-allowed ${
              isBaja
                ? 'bg-danger hover:bg-danger-dark disabled:opacity-50'
                : 'bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300'
            }`}
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Enviando...
              </>
            ) : isBaja ? (
              'Solicitar baja'
            ) : (
              'Solicitar cambio'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
