import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import { BuapLogo } from '../components/BuapLogo'
import { registerStudent, setToken } from '../services/api'
import { useStudent } from '../context/StudentContext'
import { PoweredBy } from '../components/PoweredBy'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const CAREERS = [
  { code: 'LAE', name: 'Lic. en Administración de Empresas' },
  { code: 'LAT', name: 'Lic. en Administración Turística' },
  { code: 'APG', name: 'Lic. en Administración Pública y Gestión' },
  { code: 'LCI', name: 'Lic. en Comercio Internacional' },
  { code: 'ACP', name: 'Lic. en Administración Pública y Ciencias Políticas' },
  { code: 'LNI', name: 'Lic. en Negocios Internacionales' },
  { code: 'LGA', name: 'Lic. en Gastronomía' },
]

const MODALITIES = [
  { code: 'escolarizado', name: 'Escolarizado', desc: 'Clases presenciales' },
  { code: 'semi_escolarizado', name: 'Semi-escolarizado', desc: 'Clases mixtas' },
  { code: 'distancia', name: 'Distancia', desc: 'Clases en línea' },
]

const INPUT_CLASS =
  'w-full px-3 py-2 text-sm rounded-input border border-surface-border ' +
  'text-content-primary placeholder:text-content-tertiary ' +
  'focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 ' +
  'transition-all duration-150'

const LABEL_CLASS = 'block text-xs font-medium text-content-secondary mb-1.5'

// ─────────────────────────────────────────────────────────────────────────────
// Section heading
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-semibold text-content-primary">{title}</h2>
      {subtitle && <p className="text-xs text-content-secondary mt-0.5">{subtitle}</p>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export function RegisterPage() {
  const { setStudent } = useStudent()
  const navigate = useNavigate()

  const [emailUser, setEmailUser] = useState('')
  const [emailDomain, setEmailDomain] = useState('@alumno.buap.mx')
  const [firstName, setFirstName] = useState('')
  const [lastNamePaterno, setLastNamePaterno] = useState('')
  const [lastNameMaterno, setLastNameMaterno] = useState('')
  const [matricula, setMatricula] = useState('')
  const [careerCode, setCareerCode] = useState('')
  const [modalityCode, setModalityCode] = useState('')
  const [studyPlan, setStudyPlan] = useState<'semestral' | 'cuatrimestral'>('semestral')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const matriculaValid = /^\d{9}$/.test(matricula)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!matriculaValid) {
      setError('La matrícula debe tener exactamente 9 dígitos.')
      return
    }
    if (!careerCode) {
      setError('Selecciona tu carrera.')
      return
    }
    if (!modalityCode) {
      setError('Selecciona tu modalidad.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await registerStudent({
        email_user: emailUser.trim(),
        email_domain: emailDomain,
        first_name: firstName.trim(),
        last_name_paterno: lastNamePaterno.trim(),
        last_name_materno: lastNameMaterno.trim(),
        matricula: matricula.trim(),
        career_code: careerCode,
        modality_code: modalityCode,
        study_plan: studyPlan,
      })
      setToken(data.token)
      setStudent(data.student)
      setSuccess(true)
      setTimeout(() => navigate('/student'), 1500)
    } catch (err: any) {
      setError(err.message ?? 'Error al crear la cuenta')
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
          <h2 className="text-lg font-semibold text-content-primary mb-2">¡Cuenta creada!</h2>
          <p className="text-sm text-content-secondary">Redirigiendo a tu panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center py-8 px-4">
      {/* Background pattern */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #E9ECEF 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative w-full max-w-lg z-10 animate-fade-in">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-content-secondary hover:text-content-primary
                       transition-colors duration-150"
          >
            <ArrowLeft size={16} />
            Regresar
          </Link>
          <div className="flex-1" />
          <BuapLogo size={36} />
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-content-primary">Crear mi cuenta</h1>
          <p className="text-sm text-content-secondary mt-1">
            Completa los siguientes datos para registrarte en el sistema SS/PP.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── Section 1: Credencial de acceso ── */}
          <div className="bg-white rounded-card border border-surface-border p-6 shadow-card">
            <SectionHeading
              title="Credencial de acceso"
              subtitle="Ingresa tu matrícula y selecciona el dominio de tu correo institucional BUAP"
            />
            <div className="space-y-4">
              <div>
                <label className={LABEL_CLASS}>Matrícula</label>
                <input
                  type="text"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  placeholder="201912345"
                  required
                  maxLength={9}
                  className={`${INPUT_CLASS} font-mono ${
                    matricula && !matriculaValid ? 'border-danger focus:ring-danger/30' : ''
                  }`}
                />
                {matricula && !matriculaValid && (
                  <p className="text-xs text-danger mt-1">Debe tener exactamente 9 dígitos.</p>
                )}
                {matriculaValid && (
                  <p className="text-xs text-success mt-1">Formato correcto.</p>
                )}
              </div>

              <div>
                <label className={LABEL_CLASS}>Correo institucional</label>
                <div
                  className="flex items-stretch border border-surface-border rounded-input overflow-hidden
                             focus-within:ring-2 focus-within:ring-primary-300 focus-within:border-primary-400
                             transition-all duration-150"
                >
                  <input
                    type="text"
                    value={emailUser}
                    onChange={(e) => setEmailUser(e.target.value)}
                    placeholder="usuario"
                    required
                    autoComplete="username"
                    className="flex-1 px-3 py-2 text-sm text-content-primary placeholder:text-content-tertiary
                               bg-white focus:outline-none"
                  />
                  <select
                    value={emailDomain}
                    onChange={(e) => setEmailDomain(e.target.value)}
                    className="bg-surface border-l border-surface-border px-2 text-sm text-content-secondary 
                               focus:outline-none focus:bg-white transition-colors cursor-pointer"
                  >
                    <option value="@alumno.buap.mx">@alumno.buap.mx</option>
                    <option value="@alm.buap.mx">@alm.buap.mx</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 2: Datos personales ── */}
          <div className="bg-white rounded-card border border-surface-border p-6 shadow-card">
            <SectionHeading title="Datos personales" />
            <div className="space-y-4">
              <div>
                <label className={LABEL_CLASS}>Nombre(s)</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="María"
                  required
                  className={INPUT_CLASS}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLASS}>Apellido paterno</label>
                  <input
                    type="text"
                    value={lastNamePaterno}
                    onChange={(e) => setLastNamePaterno(e.target.value)}
                    placeholder="García"
                    required
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Apellido materno</label>
                  <input
                    type="text"
                    value={lastNameMaterno}
                    onChange={(e) => setLastNameMaterno(e.target.value)}
                    placeholder="López"
                    required
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
              <div>
                <label className={LABEL_CLASS}>Carrera</label>
                <select
                  value={careerCode}
                  onChange={(e) => setCareerCode(e.target.value)}
                  required
                  className={INPUT_CLASS}
                >
                  <option value="">Selecciona tu carrera...</option>
                  {CAREERS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── Section 3: Modalidad ── */}
          <div className="bg-white rounded-card border border-surface-border p-6 shadow-card">
            <SectionHeading
              title="Modalidad de estudio"
              subtitle="Selecciona la modalidad en que cursas tu carrera"
            />
            <div className="grid grid-cols-3 gap-3">
              {MODALITIES.map((m) => (
                <button
                  key={m.code}
                  type="button"
                  onClick={() => setModalityCode(m.code)}
                  className={`flex flex-col items-start p-4 rounded-card border text-left
                              transition-all duration-150 ${
                    modalityCode === m.code
                      ? 'border-primary-400 bg-primary-50 ring-2 ring-primary-200'
                      : 'border-surface-border bg-white hover:border-primary-200 hover:bg-primary-50/40'
                  }`}
                >
                  <span
                    className={`text-sm font-medium mb-0.5 ${
                      modalityCode === m.code ? 'text-primary-700' : 'text-content-primary'
                    }`}
                  >
                    {m.name}
                  </span>
                  <span className="text-xs text-content-secondary">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Section 4: Plan de estudios ── */}
          <div className="bg-white rounded-card border border-surface-border p-6 shadow-card">
            <SectionHeading
              title="Plan de estudios"
              subtitle="Indica el plan de estudios correspondiente a tu ingreso"
            />
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setStudyPlan('semestral')}
                className={`flex-1 py-3 px-4 rounded-card border font-medium transition-all duration-150 ${
                  studyPlan === 'semestral'
                    ? 'border-primary-400 bg-primary-50 text-primary-700 ring-2 ring-primary-200'
                    : 'border-surface-border bg-white text-content-secondary hover:border-primary-200'
                }`}
              >
                Semestral
              </button>
              <button
                type="button"
                onClick={() => setStudyPlan('cuatrimestral')}
                className={`flex-1 py-3 px-4 rounded-card border font-medium transition-all duration-150 ${
                  studyPlan === 'cuatrimestral'
                    ? 'border-primary-400 bg-primary-50 text-primary-700 ring-2 ring-primary-200'
                    : 'border-surface-border bg-white text-content-secondary hover:border-primary-200'
                }`}
              >
                Cuatrimestral
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-danger-light border border-danger/20">
              <AlertCircle size={14} className="text-danger flex-shrink-0 mt-0.5" />
              <p className="text-xs text-danger-dark">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4
                       bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300
                       text-white text-sm font-medium rounded-button
                       transition-colors duration-150 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Creando cuenta...
              </>
            ) : (
              'Crear mi cuenta'
            )}
          </button>

          <p className="text-xs text-center text-content-secondary pb-4">
            ¿Ya tienes cuenta?{' '}
            <Link to="/" className="text-primary-600 hover:underline font-medium">
              Inicia sesión
            </Link>
          </p>
        </form>
        <PoweredBy />
      </div>
    </div>
  )
}
