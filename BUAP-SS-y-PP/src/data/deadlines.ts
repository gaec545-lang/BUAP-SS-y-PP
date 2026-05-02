import type { Deadline } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// Deadlines — relative to "today" = 2026-03-20 (see CLAUDE.md)
// ─────────────────────────────────────────────────────────────────────────────
export const DEADLINES: Deadline[] = [
  {
    id: 'dl-001',
    title: 'Entrega Primer Reporte Bimestral',
    description: 'Fecha límite para subir el Primer Reporte Bimestral al portal de la CPPC.',
    date: '2026-03-22',   // 2 días — critical
    relatedProcessTypes: ['ss_nueva', 'ss_recurso'],
    studentIds: ['stu-001'],
  },
  {
    id: 'dl-002',
    title: 'Cierre de convenios con empresas — PP Primavera 2026',
    description: 'Último día para que las empresas entreguen convenios firmados ante la CPPC.',
    date: '2026-03-25',   // 5 días — warning
    relatedProcessTypes: ['pp_nueva', 'pp_recurso'],
    studentIds: ['stu-002'],
  },
  {
    id: 'dl-003',
    title: 'Resolución de solicitudes de exención en trámite',
    description: 'La CPPC emitirá las resoluciones de exención pendientes en esta fecha.',
    date: '2026-03-27',   // 7 días — warning
    relatedProcessTypes: ['ss_exencion', 'pp_exencion'],
    studentIds: ['stu-003', 'stu-004'],
  },
  {
    id: 'dl-004',
    title: 'Período de registro SS/PP — Verano 2026',
    description: 'Apertura del período de registro para nuevos trámites de SS y PP en el ciclo Verano 2026.',
    date: '2026-04-07',   // 18 días — approaching
    relatedProcessTypes: ['ss_nueva', 'pp_nueva', 'ss_recurso', 'pp_recurso'],
    studentIds: [],        // aplica a todos
  },
  {
    id: 'dl-005',
    title: 'Entrega de Reportes Bimestrales — Segundo Bimestre',
    description: 'Fecha límite para la entrega del Segundo Reporte Bimestral de SS.',
    date: '2026-05-01',   // +40 días — safe
    relatedProcessTypes: ['ss_nueva', 'ss_recurso'],
    studentIds: [],
  },
  {
    id: 'dl-006',
    title: 'Cierre de expedientes — Generación 2022',
    description: 'Los alumnos de generación 2022 deben haber liberado SS/PP antes de esta fecha para titulación en tiempo.',
    date: '2026-06-15',   // +87 días — safe
    relatedProcessTypes: ['ss_nueva', 'ss_recurso', 'pp_nueva', 'pp_recurso', 'ss_exencion', 'pp_exencion'],
    studentIds: [],
  },
  {
    id: 'dl-007',
    title: 'Auditoría DGSS — Expedientes activos',
    description: 'La DGSS realizará auditoría de expedientes activos. Todos los documentos deben estar digitalizados.',
    date: '2026-03-21',   // mañana — critical
    relatedProcessTypes: ['ss_nueva', 'ss_recurso'],
    studentIds: ['stu-001', 'stu-003'],
  },
]

export function getDeadlinesForStudent(studentId: string): Deadline[] {
  return DEADLINES.filter(
    (d) => d.studentIds.length === 0 || d.studentIds.includes(studentId),
  ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}
