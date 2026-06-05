import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  GraduationCap,
  Lock,
  User,
  LogOut,
  X,
  AlertTriangle,
} from 'lucide-react'
import { useStudent } from '../../context/StudentContext'
import { getProcesses, getEnrollmentStatus, type ProcessAPI, type EnrollmentStatusAPI } from '../../services/api'
import { BuapLogo } from '../../components/BuapLogo'
import { ProcessPanel } from './ProcessPanel'
import { PoweredBy } from '../../components/PoweredBy'

// ─────────────────────────────────────────────────────────────────────────────
// Blocked state Component
// ─────────────────────────────────────────────────────────────────────────────

function BlockedState({ config }: { config: EnrollmentStatusAPI['config'] }) {
  return (
    <div className="max-w-md mx-auto text-center py-16 px-6 animate-fade-in">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10">
        <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-5 border border-gray-100">
          <Lock size={28} className="text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Periodo de inscripción no habilitado
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          {config.block_message ||
            'El portal de inscripción no está disponible en este momento. Por favor, revisa las fechas del periodo actual.'}
        </p>
        {config.block_until_date && (
          <p className="text-sm text-gray-500 mb-3">
            Disponible a partir del:{' '}
            <span className="font-medium text-gray-800">
              {new Date(config.block_until_date).toLocaleDateString('es-MX', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </p>
        )}
        <p className="text-xs text-gray-400 mt-4">
          Conserva el folio del programa al que deseas ingresar
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Modales de Texto Informativo
// ─────────────────────────────────────────────────────────────────────────────

function InfoModal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-800 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────────────────────────

export function StudentDashboard() {
  const { student, logout } = useStudent()
  const navigate = useNavigate()

  const [enrollStatus, setEnrollStatus] = useState<EnrollmentStatusAPI | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [processes, setProcesses] = useState<ProcessAPI[]>([])
  const [loading, setLoading] = useState(true)

  const [activeBlock, setActiveBlock] = useState<'inscripcion' | 'acreditacion' | null>(null)

  const isEnrolled = processes.some(p => 
    (p.code === 'inscripcion' || p.code === 'ss_inscripcion' || p.code === 'pp_inscripcion') && 
    p.status === 'completed'
  )
  
  const [showProfile, setShowProfile] = useState(false)
  const [showCambio, setShowCambio] = useState(false)
  const [showBaja, setShowBaja] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        const [st, procs] = await Promise.all([
          getEnrollmentStatus(),
          getProcesses()
        ])
        setEnrollStatus(st)
        setProcesses(procs)
      } catch (err: any) {
        console.error('Error loading dashboard data:', err)
        // If it's a 401, api.ts handles the redirect, but for other errors:
        if (err.status !== 401) {
          // Just reset loading
        }
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-800"></div>
      </div>
    )
  }

  // Final fallback if data failed to load and didn't redirect
  if (!enrollStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-sm">
          <AlertTriangle className="text-amber-500 mx-auto mb-4" size={48} />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Error de conexión</h2>
          <p className="text-gray-600 mb-6">No pudimos cargar tu información. Por favor, intenta de nuevo.</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-blue-800 text-white rounded-xl font-bold hover:bg-blue-900 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  const isBlocked = enrollStatus?.config?.enrollment_enabled !== 'true'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* 1. Header del alumno */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-4">
          <BuapLogo className="h-10 w-auto" />
          <div className="hidden sm:block border-l border-gray-200 h-8 mx-2"></div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-gray-800 leading-tight">Coordinación de SS y PP</h1>
            <p className="text-xs text-gray-500">Facultad de Administración</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end mr-2">
            <span className="text-sm font-semibold text-gray-800">{student?.first_name} {(student as any)?.last_name_paterno}</span>
            <span className="text-xs text-gray-500">{student?.matricula}</span>
          </div>
          <button 
            onClick={() => setShowProfile(true)}
            className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center hover:bg-blue-100 transition-colors"
            title="Ver Perfil"
          >
            <User size={20} />
          </button>
          <button 
            onClick={() => {
              logout()
              navigate('/')
            }}
            className="w-10 h-10 rounded-full bg-gray-50 text-gray-600 flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col">
        
        {/* 2. Saludo + Contexto */}
        <div className="mb-10 text-center sm:text-left animate-fade-in">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Hola, {student?.first_name}</h2>
          <p className="text-gray-600 text-lg">
            {student?.career?.name} <span className="mx-2 text-gray-300">•</span> Modalidad {student?.modality?.name}
          </p>
          <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
            Verano 2026
          </div>
        </div>

        {/* 3. Bloques Principales / Pantalla de Bloqueo */}
        {isBlocked ? (
          <BlockedState config={enrollStatus!.config} />
        ) : (
          <div className="flex flex-col gap-6 w-full animate-fade-in">
            {/* INSCRIBIRSE BLOCK */}
            <motion.div 
              layout
              className={`w-full transition-all duration-300 \${activeBlock === 'acreditacion' ? 'opacity-40 scale-[0.98]' : ''}`}
            >
              <button 
                onClick={() => setActiveBlock(activeBlock === 'inscripcion' ? null : 'inscripcion')}
                className={`w-full text-left bg-blue-50 border-blue-200 border-2 rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-md hover:border-blue-300 hover:scale-[1.01] transition-all duration-200 relative overflow-hidden group \${activeBlock === 'inscripcion' ? 'ring-4 ring-blue-400 ring-opacity-50' : ''}`}
              >
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                    <FileText size={32} className="text-blue-700" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-blue-900 tracking-tight">INSCRIPCIÓN A SS/PP</h3>
                    <p className="text-blue-600 font-medium mt-1">Ingresa para realizar tu registro e inscripcion oficial.</p>
                  </div>
                </div>
                <div className="mt-6 w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full w-1/3" />
                </div>
              </button>

              {/* TIMELINE DESPLEGABLE */}
              <AnimatePresence>
                {activeBlock === 'inscripcion' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8">
                      <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
                        <div>
                          <h4 className="text-xl font-bold text-gray-800">Proceso de Inscripción</h4>
                          <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded mt-2 inline-block">10 Pasos</span>
                        </div>
                        <button onClick={() => setActiveBlock(null)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors">
                          <X size={20} />
                        </button>
                      </div>
                      
                      {/* PROCESS PANEL IS MOUNTED HERE */}
                      <ProcessPanel processCode="inscripcion" onClose={() => setActiveBlock(null)} />
                      
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* ACREDITACION BLOCK */}
            <motion.div 
              layout
              className={`w-full transition-all duration-300 \${activeBlock === 'inscripcion' ? 'opacity-40 scale-[0.98]' : ''}`}
            >
              <button 
                onClick={() => isEnrolled && setActiveBlock(activeBlock === 'acreditacion' ? null : 'acreditacion')}
                disabled={!isEnrolled}
                className={`w-full text-left bg-green-50 border-green-200 border-2 rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-md hover:border-green-300 transition-all duration-200 relative overflow-hidden group ${activeBlock === 'acreditacion' ? 'ring-4 ring-green-400 ring-opacity-50' : ''} ${!isEnrolled ? 'opacity-60 grayscale-[50%] cursor-not-allowed' : 'hover:scale-[1.01]'}`}
              >
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center flex-shrink-0 group-hover:bg-green-200 transition-colors">
                    <GraduationCap size={32} className="text-green-700" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-green-900 tracking-tight">
                      {isEnrolled ? 'ACREDITACIÓN DE SS/PP' : 'ACREDITACIÓN (BLOQUEADA)'}
                    </h3>
                    <p className="text-green-600 font-medium mt-1">
                      {isEnrolled ? 'Libera y finaliza tu programa activo.' : 'Debes terminar tu inscripción primero.'}
                    </p>
                  </div>
                </div>
                <div className="mt-6 w-full h-2 bg-green-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-600 rounded-full w-0" />
                </div>
              </button>

              {/* TIMELINE DESPLEGABLE */}
              <AnimatePresence>
                {activeBlock === 'acreditacion' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8">
                      <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
                        <div>
                          <h4 className="text-xl font-bold text-gray-800">Proceso de Acreditación</h4>
                          <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded mt-2 inline-block">4 Pasos</span>
                        </div>
                        <button onClick={() => setActiveBlock(null)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors">
                          <X size={20} />
                        </button>
                      </div>
                      
                      <ProcessPanel processCode="acreditacion" onClose={() => setActiveBlock(null)} />
                      
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            
            {/* Opciones Secundarias */}
            <div className="mt-8 flex items-center justify-center gap-3 text-sm font-medium text-gray-500">
              <button onClick={() => setShowCambio(true)} className="hover:text-blue-600 transition-colors underline underline-offset-4 decoration-transparent hover:decoration-blue-600">
                Cambio de programa
              </button>
              <span>&middot;</span>
              <button onClick={() => setShowBaja(true)} className="hover:text-blue-600 transition-colors underline underline-offset-4 decoration-transparent hover:decoration-blue-600">
                Baja de programa
              </button>
            </div>
            
          </div>
        )}
      </main>

      {/* 4. Footer & Horarios de atención */}
      <footer className="mt-auto border-t border-gray-200 bg-white py-8">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-gray-600">
          <div>
            <h4 className="font-bold text-gray-800 mb-3 uppercase tracking-wide text-xs">Horarios de atención</h4>
            <p className="font-medium text-gray-700">Edificio ADM1, cubículo 132</p>
            <p>Lunes a viernes de 9:30 am - 5:00 pm</p>
          </div>
          <div>
            <h4 className="font-bold text-gray-800 mb-3 uppercase tracking-wide text-xs">Contacto</h4>
            <p>
              Correo:{' '}
              <a href="mailto:ssypp.fadmon@correo.buap.mx" className="text-blue-600 font-medium hover:underline">
                ssypp.fadmon@correo.buap.mx
              </a>
            </p>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AnimatePresence>
        {showProfile && (
          <InfoModal title="Perfil del Alumno" onClose={() => setShowProfile(false)}>
            <div className="space-y-4">
              <div>
                <span className="block text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">Nombre Completo</span>
                <span className="text-gray-800 font-medium">{student?.full_name}</span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">Matrícula</span>
                <span className="text-gray-800 font-medium">{student?.matricula}</span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">Correo Institucional</span>
                <span className="text-gray-800 font-medium">{student?.email}</span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">Carrera</span>
                <span className="text-gray-800 font-medium">{student?.career?.name}</span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">Modalidad</span>
                <span className="text-gray-800 font-medium">{student?.modality?.name}</span>
              </div>
              
              {enrollStatus?.program && (
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                    <FileText size={16}/> Inscripción Activa
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[10px] uppercase text-gray-400">Folio</span>
                      <span className="text-sm font-semibold">{enrollStatus.program.folio}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase text-gray-400">Servicio</span>
                      <span className="text-sm font-semibold">{enrollStatus.program.program_type === 'servicio_social' ? 'Servicio Social' : 'Práctica Profesional'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="block text-[10px] uppercase text-gray-400">Dependencia</span>
                      <span className="text-sm font-semibold">{enrollStatus.program.dependency_name}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </InfoModal>
        )}

        {showCambio && (
          <InfoModal title="Cambio de programa" onClose={() => setShowCambio(false)}>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              Para solicitar un cambio de programa, acude personalmente a la Coordinación de Prácticas Profesionales y Servicio Social con los siguientes documentos:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-700 mb-5 space-y-1.5 pl-1 decoration-clone">
              <li>Credencial de estudiante vigente</li>
              <li>Historial académico actualizado</li>
              <li>Folio del nuevo programa al que deseas cambiar</li>
              <li>Carta de aceptación del nuevo programa (si aplica)</li>
            </ul>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-50 border border-orange-200">
              <AlertTriangle size={18} className="text-orange-600 flex-shrink-0" />
              <p className="text-xs text-orange-800 font-medium leading-relaxed">
                Advertencia: El cambio puede generar recurso académico si carece de validación temporal. Acude con tiempo.
              </p>
            </div>
          </InfoModal>
        )}

        {showBaja && (
          <InfoModal title="Baja de programa" onClose={() => setShowBaja(false)}>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              Para darte de baja de tu programa actual, debes presentar un oficio formal impreso y firmado en las oficinas de la coordinación.
            </p>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg mb-4">
              <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">El oficio debe incluir:</h5>
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                <li>Motivo de la baja detallado</li>
                <li>Firma tuya y del titular de la dependencia</li>
                <li>Fecha de solicitud</li>
              </ul>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertTriangle size={18} className="text-red-600 flex-shrink-0" />
              <p className="text-xs text-red-800 font-medium leading-relaxed">
                Peligro: Una baja definitiva anula las horas acumuladas y requiere que inicies el proceso desde cero el siguiente periodo.
              </p>
            </div>
          </InfoModal>
        )}
      </AnimatePresence>
      <PoweredBy />
    </div>
  )
}
