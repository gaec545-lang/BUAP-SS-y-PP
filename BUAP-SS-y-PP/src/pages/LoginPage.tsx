import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { GraduationCap, Shield, AlertCircle, Loader2, UserPlus } from 'lucide-react'
import { useStudent } from '../context/StudentContext'
import { BuapLogo } from '../components/BuapLogo'
import { loginStudent, loginAdmin, setToken } from '../services/api'
import { PoweredBy } from '../components/PoweredBy'

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export function LoginPage() {
  const { setStudent, setAdmin, setEnrollmentStatus } = useStudent()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<'alumno' | 'admin'>('alumno')

  // Alumno state
  const [emailUser, setEmailUser] = useState('')
  const [emailDomain, setEmailDomain] = useState('@alumno.buap.mx')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  // Admin state
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState<string | null>(null)

  async function handleStudentLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!emailUser.trim()) return
    setEmailLoading(true)
    setEmailError(null)
    try {
      const fullEmail = `${emailUser.trim()}${emailDomain}`
      const data = await loginStudent(fullEmail)
      setToken(data.token)
      setStudent(data.student)
      navigate('/student')
    } catch (err: any) {
      setEmailError(err.message ?? 'Error al iniciar sesión')
    } finally {
      setEmailLoading(false)
    }
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password.trim()) return
    setAdminLoading(true)
    setAdminError(null)
    try {
      const data = await loginAdmin(username.trim(), password)
      setToken(data.token)
      setAdmin(data.admin)
      navigate('/admin')
    } catch (err: any) {
      setAdminError(err.message ?? 'Credenciales incorrectas')
    } finally {
      setAdminLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
      {/* Background pattern */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #E9ECEF 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative w-full max-w-md z-10 animate-fade-in">
        {/* Logo + headings */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <BuapLogo size={64} />
          </div>
          <h1 className="text-2xl font-semibold text-content-primary tracking-tight">
            Sistema de Gestión SS/PP
          </h1>
          <p className="text-sm text-content-secondary mt-1.5">
            Facultad de Administración · BUAP
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-card shadow-card border border-surface-border p-6">
          {/* Security note */}
          <div className="flex items-center gap-2 mb-5 pb-4 border-b border-surface-border">
            <Shield size={14} className="text-primary-600 flex-shrink-0" />
            <p className="text-xs text-content-secondary">
              Acceso mediante cuenta institucional BUAP
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-5 bg-surface rounded-lg p-1">
            <button
              onClick={() => { setActiveTab('alumno'); setEmailError(null) }}
              className={`flex-1 py-1.5 px-3 text-sm rounded-md transition-all duration-150 ${
                activeTab === 'alumno'
                  ? 'bg-white text-content-primary font-medium shadow-sm'
                  : 'text-content-secondary hover:text-content-primary'
              }`}
            >
              Alumno
            </button>
            <button
              onClick={() => { setActiveTab('admin'); setAdminError(null) }}
              className={`flex-1 py-1.5 px-3 text-sm rounded-md transition-all duration-150 ${
                activeTab === 'admin'
                  ? 'bg-white text-content-primary font-medium shadow-sm'
                  : 'text-content-secondary hover:text-content-primary'
              }`}
            >
              Administración
            </button>
          </div>

          {/* Tab: Alumno */}
          {activeTab === 'alumno' && (
            <form onSubmit={handleStudentLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-content-secondary mb-1.5">
                  Usuario institucional
                </label>
                {/* Email input with fixed suffix */}
                <div className="flex items-stretch border border-surface-border rounded-input overflow-hidden
                               focus-within:ring-2 focus-within:ring-primary-300 focus-within:border-primary-400
                               transition-all duration-150">
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

              {emailError && (
                <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-danger-light border border-danger/20">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={14} className="text-danger flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-danger-dark">{emailError}</p>
                  </div>
                  {(emailError.toLowerCase().includes('no registrado') ||
                    emailError.toLowerCase().includes('not found') ||
                    emailError.toLowerCase().includes('no encontrado')) && (
                    <p className="text-xs text-danger-dark pl-5">
                      ¿Primera vez?{' '}
                      <Link to="/register" className="underline font-medium hover:opacity-80">
                        Regístrate aquí
                      </Link>
                    </p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={emailLoading || !emailUser.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4
                           bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300
                           text-white text-sm font-medium rounded-button
                           transition-colors duration-150 disabled:cursor-not-allowed"
              >
                {emailLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Iniciar sesión'
                )}
              </button>

              <div className="flex items-center gap-3 pt-1">
                <div className="flex-1 h-px bg-surface-divider" />
                <span className="text-xs text-content-tertiary flex-shrink-0">o</span>
                <div className="flex-1 h-px bg-surface-divider" />
              </div>

              <Link
                to="/register"
                className="w-full flex items-center justify-center gap-2 py-2 px-4
                           border border-primary-200 text-primary-600 hover:bg-primary-50
                           text-sm font-medium rounded-button transition-colors duration-150"
              >
                <UserPlus size={14} />
                ¿Primera vez? Regístrate aquí
              </Link>
            </form>
          )}

          {/* Tab: Administración */}
          {activeTab === 'admin' && (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-content-secondary mb-1.5">
                  Usuario
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="coordinador"
                  required
                  autoComplete="username"
                  className="w-full px-3 py-2 text-sm rounded-input border border-surface-border
                             text-content-primary placeholder:text-content-tertiary
                             focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400
                             transition-all duration-150"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-content-secondary mb-1.5">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full px-3 py-2 text-sm rounded-input border border-surface-border
                             text-content-primary placeholder:text-content-tertiary
                             focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400
                             transition-all duration-150"
                />
              </div>

              {adminError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-danger-light border border-danger/20">
                  <AlertCircle size={14} className="text-danger flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-danger-dark">{adminError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={adminLoading || !username.trim() || !password.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4
                           bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300
                           text-white text-sm font-medium rounded-button
                           transition-colors duration-150 disabled:cursor-not-allowed"
              >
                {adminLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Iniciar sesión'
                )}
              </button>
            </form>
          )}
        </div>

        <PoweredBy />
      </div>
    </div>
  )
}
