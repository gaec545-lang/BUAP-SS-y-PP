// @ts-nocheck
import type { Student, StudentProcess, ProcessStep } from '../types'
import { SS_NUEVA, PP_NUEVA, SS_RECURSO, PP_EXENCION } from './processes'

// ─────────────────────────────────────────────────────────────────────────────
// Helper: clone a process definition's steps and assign statuses for a student
// ─────────────────────────────────────────────────────────────────────────────
function buildSteps(
  processSteps: ProcessStep[],
  currentStepOrder: number,
  completedDates: Record<number, string> = {},
  completedDocs: Record<number, { downloadUrl: string; generatedAt: string }> = {},
): ProcessStep[] {
  return processSteps.map((s) => {
    const isCompleted = s.order < currentStepOrder
    const isCurrent   = s.order === currentStepOrder

    const status = isCompleted ? 'completed' : isCurrent ? 'current' : 'pending'

    const documents = s.documents.map((doc) => {
      if (isCompleted && completedDocs[s.order]) {
        return {
          ...doc,
          status: 'delivered' as const,
          downloadUrl: completedDocs[s.order].downloadUrl,
          generatedAt: completedDocs[s.order].generatedAt,
        }
      }
      if (isCurrent) {
        return { ...doc, status: 'ready' as const }
      }
      return { ...doc, status: 'pending' as const }
    })

    return {
      ...s,
      id: `${s.id}`,
      status,
      completedDate: isCompleted ? (completedDates[s.order] ?? '2026-01-15') : undefined,
      documents,
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Student 1 — Ana Sofía Reyes Morales
// SS Nueva — en el paso 9 (primer reporte bimestral, llevan 4 meses)
// ─────────────────────────────────────────────────────────────────────────────
const anaSofiaProcess: StudentProcess = {
  instanceId: 'proc-001',
  processType: 'ss_nueva',
  currentStepOrder: 9,
  startedAt: '2025-09-01',
  estimatedEndDate: '2026-03-01',
  steps: buildSteps(
    SS_NUEVA.steps,
    9,
    {
      1: '2025-09-05',
      2: '2025-09-10',
      3: '2025-09-12',
      4: '2025-09-15',
      5: '2025-09-20',
      6: '2025-09-22',
      7: '2025-09-25',
      8: '2025-10-01',
    },
    {
      4: { downloadUrl: '/mock/carta-presentacion-001.pdf', generatedAt: '2025-09-15' },
    },
  ),
}

export const STUDENT_ANA_SOFIA: Student = {
  id: 'stu-001',
  matricula: '202112345',
  name: 'Ana Sofía',
  lastName: 'Reyes Morales',
  email: 'ana.reyes@alumno.buap.mx',
  major: 'Licenciatura en Administración de Empresas',
  semester: 9,
  gpa: 8.7,
  dependencia: 'Secretaría de Finanzas y Administración del Estado de Puebla',
  internalAdvisor: 'Dr. Roberto Sánchez Ortiz',
  activeProcess: anaSofiaProcess,
}

// ─────────────────────────────────────────────────────────────────────────────
// Student 2 — Carlos Eduardo Hernández López
// PP Nueva — en el paso 4 (convenio con empresa)
// ─────────────────────────────────────────────────────────────────────────────
const carlosProcess: StudentProcess = {
  instanceId: 'proc-002',
  processType: 'pp_nueva',
  currentStepOrder: 4,
  startedAt: '2026-01-15',
  estimatedEndDate: '2026-07-15',
  steps: buildSteps(
    PP_NUEVA.steps,
    4,
    {
      1: '2026-01-18',
      2: '2026-01-22',
      3: '2026-01-25',
    },
    {
      3: { downloadUrl: '/mock/carta-presentacion-002.pdf', generatedAt: '2026-01-25' },
    },
  ),
}

export const STUDENT_CARLOS: Student = {
  id: 'stu-002',
  matricula: '202067890',
  name: 'Carlos Eduardo',
  lastName: 'Hernández López',
  email: 'carlos.hernandez@alumno.buap.mx',
  major: 'Licenciatura en Contaduría Pública',
  semester: 10,
  gpa: 9.1,
  dependencia: 'Deloitte México — Oficina Puebla',
  internalAdvisor: 'Mtra. Patricia Flores Vega',
  activeProcess: carlosProcess,
}

// ─────────────────────────────────────────────────────────────────────────────
// Student 3 — María Fernanda Torres Guzmán
// SS Recurso — en el paso 3 (revisión CPPC), proceso recién comenzado
// ─────────────────────────────────────────────────────────────────────────────
const mariaFernandaProcess: StudentProcess = {
  instanceId: 'proc-003',
  processType: 'ss_recurso',
  currentStepOrder: 3,
  startedAt: '2026-02-10',
  estimatedEndDate: '2026-08-10',
  steps: buildSteps(
    SS_RECURSO.steps,
    3,
    {
      1: '2026-02-12',
      2: '2026-02-18',
    },
    {
      1: { downloadUrl: '/mock/solicitud-recurso-003.pdf', generatedAt: '2026-02-12' },
    },
  ),
}

export const STUDENT_MARIA_FERNANDA: Student = {
  id: 'stu-003',
  matricula: '202134567',
  name: 'María Fernanda',
  lastName: 'Torres Guzmán',
  email: 'maria.torres@alumno.buap.mx',
  major: 'Licenciatura en Administración de Empresas',
  semester: 10,
  gpa: 7.8,
  dependencia: null,
  internalAdvisor: null,
  activeProcess: mariaFernandaProcess,
}

// ─────────────────────────────────────────────────────────────────────────────
// Student 4 — Jorge Alejandro Méndez Castillo
// PP Exención — en el paso 5 (esperando resolución), casi al final
// ─────────────────────────────────────────────────────────────────────────────
const jorgeProcess: StudentProcess = {
  instanceId: 'proc-004',
  processType: 'pp_exencion',
  currentStepOrder: 5,
  startedAt: '2026-01-05',
  estimatedEndDate: '2026-04-01',
  steps: buildSteps(
    PP_EXENCION.steps,
    5,
    {
      1: '2026-01-08',
      2: '2026-01-10',
      3: '2026-01-22',
      4: '2026-02-05',
    },
    {
      1: { downloadUrl: '/mock/solicitud-exencion-004.pdf', generatedAt: '2026-01-08' },
    },
  ),
}

export const STUDENT_JORGE: Student = {
  id: 'stu-004',
  matricula: '201998765',
  name: 'Jorge Alejandro',
  lastName: 'Méndez Castillo',
  email: 'jorge.mendez@alumno.buap.mx',
  major: 'Licenciatura en Administración de Empresas',
  semester: 11,
  gpa: 8.3,
  dependencia: 'BBVA México — Gerencia Regional Puebla',
  internalAdvisor: 'Dr. Héctor Vázquez Ríos',
  activeProcess: jorgeProcess,
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported list
// ─────────────────────────────────────────────────────────────────────────────
export const STUDENTS: Student[] = [
  STUDENT_ANA_SOFIA,
  STUDENT_CARLOS,
  STUDENT_MARIA_FERNANDA,
  STUDENT_JORGE,
]

export function getStudentById(id: string): Student | undefined {
  return STUDENTS.find((s) => s.id === id)
}
