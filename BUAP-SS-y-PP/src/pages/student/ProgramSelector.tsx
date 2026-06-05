import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  Building2,
  BookOpen,
  Briefcase,
} from 'lucide-react'
import { useStudent } from '../../context/StudentContext'
import { getProgramByFolio, selectProgram } from '../../services/api'
import { BuapLogo } from '../../components/BuapLogo'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ServiceType = 'ss' | 'pp'

interface ProgramResult {
  folio: string
  name: string
  dependency_name: string
  sector?: string
  cupos?: number
  cupos_disponibles?: number
  program_type?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export function ProgramSelector() {
  const { setEnrollmentStatus, enrollmentStatus } = useStudent()
  const navigate = useNavigate()

  // Guard: si el portal está bloqueado, redirigir al inicio
  const isBlocked = enrollmentStatus?.status === 'blocked'
  if (isBlocked) {
    navigate('/student', { replace: true })
    return null
  }

  const [step, setStep] = useState<1 | 2>(1)
  const [serviceType, setServiceType] = useState<ServiceType | null>(null)
  const [folio, setFolio] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [foundProgram, setFoundProgram] = useState<ProgramResult | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!folio.trim()) return
    setSearchLoading(true)
    setSearchError(null)
    setFoundProgram(null)
    try {
      const program: ProgramResult = await getProgramByFolio(folio.trim())
      setFoundProgram(program)
    } catch (err: any) {
      if (err.status === 409) {
        setSearchError('Este programa ya completó su cupo.')
      } else {
        setSearchError(err.message ?? 'Este folio no se encontró. Verifica el número e intenta de nuevo.')
      }
    } finally {
      setSearchLoading(false)
    }
  }

  async function handleConfirm() {
    if (!foundProgram || !serviceType) return
    setConfirmLoading(true)
    setConfirmError(null)
    try {
      const result = await selectProgram(serviceType, foundProgram.folio)
      if (result?.enrollment_status) {
        setEnrollmentStatus(result.enrollment_status)
      }
      setSuccess(true)
      setTimeout(() => navigate('/student'), 1800)
    } catch (err: any) {
      if (err.status === 409) {
        setConfirmError('Este programa ya completó su cupo.')
      } else if (err.message?.toLowerCase().includes('carrera')) {
        setConfirmError('Este programa no está disponible para tu carrera.')
      } else {
        setConfirmError(err.message ?? 'Error al confirmar inscripción.')
      }
    } finally {
      setConfirmLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="bg-white rounded-card shadow-card border border-surface-border p-8 max-w-sm w-full text-center animate-scale-in">
          <div className="w-12 h-12 rounded-full bg-success-light flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={24} className="text-success" />
          </div>
          <h2 className="text-lg font-semibold text-content-primary mb-2">¡Inscripción enviada!</h2>
          <p className="text-sm text-content-secondary">
            Tu solicitud está en revisión. Redirigiendo...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-white border-b border-surface-border">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center gap-4">
          <BuapLogo size={32} />
          <div className="flex-1">
            <p className="text-xs text-content-tertiary">Inscripción</p>
            <h1 className="text-base font-semibold text-content-primary leading-tight">
              Seleccionar programa
            </h1>
          </div>
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

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-8">
          <div className={`flex items-center gap-2 text-sm ${step >= 1 ? 'text-primary-600 font-medium' : 'text-content-tertiary'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
              step >= 1 ? 'bg-primary-500 text-white' : 'bg-surface border border-surface-border text-content-tertiary'
            }`}>1</span>
            Tipo de servicio
          </div>
          <div className="flex-1 h-px bg-surface-divider" />
          <div className={`flex items-center gap-2 text-sm ${step >= 2 ? 'text-primary-600 font-medium' : 'text-content-tertiary'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
              step >= 2 ? 'bg-primary-500 text-white' : 'bg-surface border border-surface-border text-content-tertiary'
            }`}>2</span>
            Buscar programa
          </div>
        </div>

        {/* Step 1: Service type selection */}
        {step === 1 && (
          <div className="animate-fade-in space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-content-primary mb-1">
                ¿Qué tipo de servicio deseas inscribir?
              </h2>
              <p className="text-sm text-content-secondary">
                Selecciona el tipo que corresponde a tu proceso actual.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Servicio Social */}
              <button
                type="button"
                onClick={() => { setServiceType('ss'); setStep(2) }}
                className={`flex flex-col items-start p-6 rounded-card border text-left
                            transition-all duration-150 bg-white shadow-card
                            hover:shadow-card-hover hover:border-primary-300 ${
                  serviceType === 'ss' ? 'border-primary-400 bg-primary-50' : 'border-surface-border'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center mb-4">
                  <BookOpen size={20} className="text-primary-600" />
                </div>
                <h3 className="text-base font-semibold text-content-primary mb-1">
                  Servicio Social
                </h3>
                <p className="text-xs text-content-secondary">
                  Práctica formativa de 480 horas obligatoria para titulación.
                </p>
              </button>

              {/* Práctica Profesional */}
              <button
                type="button"
                onClick={() => { setServiceType('pp'); setStep(2) }}
                className={`flex flex-col items-start p-6 rounded-card border text-left
                            transition-all duration-150 bg-white shadow-card
                            hover:shadow-card-hover hover:border-primary-300 ${
                  serviceType === 'pp' ? 'border-primary-400 bg-primary-50' : 'border-surface-border'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center mb-4">
                  <Briefcase size={20} className="text-primary-600" />
                </div>
                <h3 className="text-base font-semibold text-content-primary mb-1">
                  Práctica Profesional
                </h3>
                <p className="text-xs text-content-secondary">
                  Experiencia profesional supervisada en empresa o institución.
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Folio search */}
        {step === 2 && (
          <div className="animate-fade-in space-y-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => { setStep(1); setFoundProgram(null); setSearchError(null); setFolio('') }}
                className="flex items-center gap-1.5 text-sm text-content-secondary
                           hover:text-content-primary transition-colors duration-150"
              >
                <ArrowLeft size={16} />
                Cambiar tipo
              </button>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-badge
                              bg-primary-50 text-primary-700 text-xs font-medium">
                {serviceType === 'ss' ? 'Servicio Social' : 'Práctica Profesional'}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-content-primary mb-1">
                Busca tu programa por folio
              </h2>
              <p className="text-sm text-content-secondary">
                Ingresa el folio del programa que te proporcionó la coordinación o la empresa.
              </p>
            </div>

            {/* Folio search form */}
            <div className="bg-white rounded-card border border-surface-border shadow-card p-6">
              <form onSubmit={handleSearch} className="flex gap-3">
                <input
                  type="text"
                  value={folio}
                  onChange={(e) => setFolio(e.target.value.toUpperCase())}
                  placeholder="Ej. SS-2024-001"
                  required
                  className="flex-1 px-3 py-2 text-sm rounded-input border border-surface-border
                             font-mono text-content-primary placeholder:text-content-tertiary
                             focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400
                             transition-all duration-150"
                />
                <button
                  type="submit"
                  disabled={searchLoading || !folio.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700
                             disabled:bg-primary-300 text-white text-sm font-medium rounded-button
                             transition-colors duration-150 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {searchLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Search size={14} />
                  )}
                  Buscar
                </button>
              </form>

              {/* Search error */}
              {searchError && (
                <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-danger-light border border-danger/20">
                  <AlertCircle size={14} className="text-danger flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-danger-dark">{searchError}</p>
                </div>
              )}

              {/* Found program */}
              {foundProgram && (
                <div className="mt-4 animate-slide-up">
                  <div className="p-4 rounded-lg border border-success/30 bg-success-light/40">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 size={16} className="text-success flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-content-primary">
                          {foundProgram.folio} — {foundProgram.name}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                          <span className="flex items-center gap-1.5 text-xs text-content-secondary">
                            <Building2 size={12} />
                            {foundProgram.dependency_name}
                          </span>
                          {foundProgram.cupos !== undefined && (
                            <span className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                              <Users size={12} />
                              Cupos: {foundProgram.cupos_disponibles ?? foundProgram.cupos} de {foundProgram.cupos}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {confirmError && (
                    <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-danger-light border border-danger/20">
                      <AlertCircle size={14} className="text-danger flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-danger-dark">{confirmError}</p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={confirmLoading}
                    className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 px-4
                               bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300
                               text-white text-sm font-medium rounded-button
                               transition-colors duration-150 disabled:cursor-not-allowed"
                  >
                    {confirmLoading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Confirmando...
                      </>
                    ) : (
                      'Confirmar inscripción'
                    )}
                  </button>
                  <p className="text-xs text-content-tertiary text-center mt-2">
                    Esta acción enviará tu solicitud de inscripción para revisión.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
