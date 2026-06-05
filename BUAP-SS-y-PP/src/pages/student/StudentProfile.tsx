import { useNavigate } from 'react-router-dom'
import { ArrowLeft, User, BookOpen, Building2, GraduationCap, Lock } from 'lucide-react'
import { useStudent } from '../../context/StudentContext'
import { BuapLogo } from '../../components/BuapLogo'
import { PoweredBy } from '../../components/PoweredBy'

// ─────────────────────────────────────────────────────────────────────────────
// Field row
// ─────────────────────────────────────────────────────────────────────────────

function ProfileField({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs font-medium text-content-tertiary">{label}</p>
      <p className={`text-sm text-content-primary ${mono ? 'font-mono' : ''}`}>
        {value || <span className="text-content-tertiary italic">Sin información</span>}
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export function StudentProfile() {
  const { student, enrollmentStatus } = useStudent()
  const navigate = useNavigate()

  const modalityNames: Record<string, string> = {
    escolarizado: 'Escolarizado',
    semi_escolarizado: 'Semi-escolarizado',
    distancia: 'Distancia',
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-white border-b border-surface-border">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center gap-4">
          <BuapLogo size={32} />
          <div className="flex-1">
            <p className="text-xs text-content-tertiary">Alumno</p>
            <h1 className="text-base font-semibold text-content-primary leading-tight">Mi perfil</h1>
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

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-5 animate-fade-in">
        {/* Personal data card */}
        <div className="bg-white rounded-card border border-surface-border shadow-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center">
              <User size={20} className="text-primary-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-content-primary">Datos personales</h2>
              <p className="text-xs text-content-secondary">Información de tu cuenta institucional</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <ProfileField label="Nombre completo" value={student?.full_name} />
            <ProfileField label="Matrícula" value={student?.matricula} mono />
            <ProfileField label="Correo institucional" value={student?.email} />
            <ProfileField
              label="Carrera"
              value={student?.career ? `${student.career.code} — ${student.career.name}` : undefined}
            />
            <ProfileField
              label="Modalidad"
              value={
                student?.modality
                  ? modalityNames[student.modality.code] ?? student.modality.name
                  : undefined
              }
            />
            <ProfileField
              label="Plan de estudios"
              value={student?.study_plan ? student.study_plan.charAt(0).toUpperCase() + student.study_plan.slice(1) : undefined}
            />
          </div>
        </div>

        {/* Service data card */}
        {enrollmentStatus?.program ? (
          <div className="bg-white rounded-card border border-surface-border shadow-card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-success-light flex items-center justify-center">
                <BookOpen size={20} className="text-success" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-content-primary">Servicio / Práctica</h2>
                <p className="text-xs text-content-secondary">Programa en el que estás inscrito</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div className="col-span-2">
                <ProfileField label="Nombre del programa" value={enrollmentStatus.program.name} />
              </div>
              <ProfileField label="Folio" value={enrollmentStatus.program.folio} mono />
              <ProfileField label="Tipo" value={
                enrollmentStatus.program.program_type === 'ss'
                  ? 'Servicio Social'
                  : enrollmentStatus.program.program_type === 'pp'
                  ? 'Práctica Profesional'
                  : enrollmentStatus.program.program_type
              } />
              <div className="col-span-2">
                <ProfileField label="Dependencia / Empresa" value={enrollmentStatus.program.dependency_name} />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-card border border-surface-border shadow-card p-6">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center mb-3">
                <Building2 size={20} className="text-content-tertiary" />
              </div>
              <p className="text-sm font-medium text-content-primary mb-1">Sin programa activo</p>
              <p className="text-xs text-content-secondary">
                Aún no estás inscrito a ningún programa de servicio social o práctica profesional.
              </p>
              {enrollmentStatus?.config?.enrollment_enabled === 'false' ? (
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-badge
                                bg-warning-light border border-warning/30">
                  <Lock size={13} className="text-warning-dark flex-shrink-0" />
                  <span className="text-xs font-medium text-warning-dark">
                    Inscripción no disponible por ahora
                  </span>
                </div>
              ) : (
                <button
                  onClick={() => navigate('/student/enroll')}
                  className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm
                             font-medium rounded-button transition-colors duration-150"
                >
                  Iniciar inscripción
                </button>
              )}
            </div>
          </div>
        )}

        {/* Status card */}
        <div className="bg-white rounded-card border border-surface-border shadow-card p-5">
          <div className="flex items-center gap-3">
            <GraduationCap size={18} className="text-content-secondary" />
            <div>
              <p className="text-xs text-content-tertiary">Estado del portal</p>
              <p className="text-sm text-content-secondary">
                {enrollmentStatus?.config?.enrollment_enabled === 'false'
                  ? 'Portal bloqueado — inscripción no disponible actualmente'
                  : 'Portal abierto — puedes gestionar tu inscripción'}
              </p>
            </div>
          </div>
        </div>
      </div>
      <PoweredBy />
    </div>
  )
}
