import type { DocumentLibraryEntry } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// Document library — all possible documents across all processes
// ─────────────────────────────────────────────────────────────────────────────
export const DOCUMENT_LIBRARY: DocumentLibraryEntry[] = [
  // ── SS Nueva ──────────────────────────────────────────────────────────────
  {
    id: 'DOC-SS-001',
    name: 'Solicitud de Inicio de Servicio Social',
    description: 'Formato oficial de solicitud para iniciar el trámite de Servicio Social ante la CPPC.',
    processTypes: ['ss_nueva'],
    stepOrder: 1,
    requiresScan: false,
    templateDescription: 'Incluye datos del alumno, matrícula, carrera, semestre, promedio y dependencia elegida.',
  },
  {
    id: 'DOC-SS-002',
    name: 'Carta de Presentación — SS',
    description: 'Carta oficial de la BUAP que presenta al alumno ante la dependencia receptora.',
    processTypes: ['ss_nueva', 'ss_recurso'],
    stepOrder: 4,
    requiresScan: false,
    templateDescription: 'Carta membretada con logo BUAP. Incluye nombre del alumno, matrícula, carrera y dependencia.',
  },
  {
    id: 'DOC-SS-003',
    name: 'Primer Reporte Bimestral — SS',
    description: 'Reporte de actividades realizadas durante los primeros dos meses del Servicio Social.',
    processTypes: ['ss_nueva'],
    stepOrder: 9,
    requiresScan: false,
    templateDescription: 'Formato tabular con actividades, horas acumuladas, aprendizajes y firma del responsable en dependencia.',
  },
  {
    id: 'DOC-SS-004',
    name: 'Segundo Reporte Bimestral — SS',
    description: 'Reporte de actividades del tercer y cuarto mes del Servicio Social.',
    processTypes: ['ss_nueva'],
    stepOrder: 10,
    requiresScan: false,
    templateDescription: 'Mismo formato que el primer reporte. Acumulado de horas debe mostrar avance.',
  },
  {
    id: 'DOC-SS-005',
    name: 'Tercer Reporte Bimestral — SS',
    description: 'Reporte de actividades del quinto y sexto mes. Al entregarlo el alumno debe haber completado 480 horas.',
    processTypes: ['ss_nueva'],
    stepOrder: 11,
    requiresScan: false,
    templateDescription: 'Incluye total de horas acumuladas (mínimo 480). Debe venir firmado por el responsable de la dependencia.',
  },
  {
    id: 'DOC-SS-006',
    name: 'Solicitud de Liberación de SS',
    description: 'Formato para solicitar formalmente la liberación del Servicio Social.',
    processTypes: ['ss_nueva', 'ss_recurso'],
    stepOrder: 12,
    requiresScan: false,
    templateDescription: 'Incluye folio de registro DGSS, fechas de inicio y término, total de horas.',
  },
  {
    id: 'DOC-SS-007',
    name: 'Carta de Liberación de SS',
    description: 'Documento oficial que certifica la liberación del Servicio Social.',
    processTypes: ['ss_nueva', 'ss_recurso'],
    stepOrder: 16,
    requiresScan: false,
    templateDescription: 'Carta membretada BUAP con folio DGSS, nombre del alumno, periodo y firma del coordinador.',
  },

  // ── SS Recurso ────────────────────────────────────────────────────────────
  {
    id: 'DOC-SSR-001',
    name: 'Solicitud de Recurso Académico — SS',
    description: 'Formato especial para solicitar el Servicio Social bajo modalidad de recurso académico.',
    processTypes: ['ss_recurso'],
    stepOrder: 1,
    requiresScan: false,
    templateDescription: 'Incluye motivo del recurso, historial académico previo y firma de la División Académica.',
  },
  {
    id: 'DOC-SSR-002',
    name: 'Carta de Liberación — SS Recurso',
    description: 'Carta de liberación para modalidad recurso académico.',
    processTypes: ['ss_recurso'],
    stepOrder: 14,
    requiresScan: false,
    templateDescription: 'Misma estructura que la carta regular, con indicación de modalidad recurso.',
  },

  // ── PP Nueva ──────────────────────────────────────────────────────────────
  {
    id: 'DOC-PP-001',
    name: 'Solicitud de Inicio — PP',
    description: 'Formato de solicitud para iniciar el trámite de Práctica Profesional.',
    processTypes: ['pp_nueva'],
    stepOrder: 1,
    requiresScan: false,
    templateDescription: 'Incluye datos del alumno, empresa elegida, área de práctica y periodo estimado.',
  },
  {
    id: 'DOC-PP-002',
    name: 'Carta de Presentación — PP',
    description: 'Carta oficial de la BUAP para presentar al alumno ante la empresa.',
    processTypes: ['pp_nueva', 'pp_recurso'],
    stepOrder: 3,
    requiresScan: false,
    templateDescription: 'Carta membretada con datos del alumno, carrera y empresa destino.',
  },
  {
    id: 'DOC-PP-003',
    name: 'Plan de Trabajo — PP',
    description: 'Documento que describe las actividades, objetivos y entregables de la Práctica Profesional.',
    processTypes: ['pp_nueva'],
    stepOrder: 7,
    requiresScan: false,
    templateDescription: 'Formato estructurado con objetivos, actividades semanales, indicadores y cronograma.',
  },
  {
    id: 'DOC-PP-004',
    name: 'Reporte Parcial — PP',
    description: 'Reporte de avance al cumplir el 50% de las horas de Práctica Profesional.',
    processTypes: ['pp_nueva'],
    stepOrder: 10,
    requiresScan: false,
    templateDescription: 'Avance de objetivos, actividades realizadas, horas acumuladas y firma del asesor externo.',
  },
  {
    id: 'DOC-PP-005',
    name: 'Reporte Final — PP',
    description: 'Reporte completo de la Práctica Profesional con resultados y conclusiones.',
    processTypes: ['pp_nueva'],
    stepOrder: 11,
    requiresScan: false,
    templateDescription: 'Incluye resumen ejecutivo, actividades completas, competencias desarrolladas y evaluación del asesor externo.',
  },
  {
    id: 'DOC-PP-006',
    name: 'Carta de Liberación — PP',
    description: 'Documento oficial que certifica la liberación de la Práctica Profesional.',
    processTypes: ['pp_nueva', 'pp_recurso'],
    stepOrder: 15,
    requiresScan: false,
    templateDescription: 'Carta membretada BUAP con datos del alumno, empresa, periodo y firma del coordinador.',
  },

  // ── PP Recurso ────────────────────────────────────────────────────────────
  {
    id: 'DOC-PPR-001',
    name: 'Solicitud de Recurso Académico — PP',
    description: 'Formato para solicitar la PP bajo modalidad de recurso académico.',
    processTypes: ['pp_recurso'],
    stepOrder: 1,
    requiresScan: false,
    templateDescription: 'Incluye motivo del recurso y firma de autorización de la División Académica.',
  },

  // ── Exenciones ────────────────────────────────────────────────────────────
  {
    id: 'DOC-EXS-001',
    name: 'Solicitud de Exención — SS',
    description: 'Formato para solicitar la exención del Servicio Social por actividades equivalentes.',
    processTypes: ['ss_exencion'],
    stepOrder: 1,
    requiresScan: false,
    templateDescription: 'Incluye descripción de actividades equivalentes, fechas, institución y documentos probatorios.',
  },
  {
    id: 'DOC-EXS-002',
    name: 'Carta de Exención — SS',
    description: 'Documento oficial que certifica la exención del Servicio Social.',
    processTypes: ['ss_exencion'],
    stepOrder: 7,
    requiresScan: false,
    templateDescription: 'Carta membretada con fundamento legal de la exención y firma del coordinador.',
  },
  {
    id: 'DOC-EXP-001',
    name: 'Solicitud de Exención — PP',
    description: 'Formato para solicitar la exención de la Práctica Profesional por experiencia laboral.',
    processTypes: ['pp_exencion'],
    stepOrder: 1,
    requiresScan: false,
    templateDescription: 'Incluye descripción de experiencia laboral, empleador, periodo y documentos laborales.',
  },
  {
    id: 'DOC-EXP-002',
    name: 'Carta de Exención — PP',
    description: 'Documento oficial que certifica la exención de la Práctica Profesional.',
    processTypes: ['pp_exencion'],
    stepOrder: 6,
    requiresScan: false,
    templateDescription: 'Carta membretada con fundamento legal, empresa equivalente y firma del coordinador.',
  },
]

export function getDocumentsForProcess(processType: string): DocumentLibraryEntry[] {
  return DOCUMENT_LIBRARY.filter((d) => d.processTypes.includes(processType as never))
}

export function getDocumentById(id: string): DocumentLibraryEntry | undefined {
  return DOCUMENT_LIBRARY.find((d) => d.id === id)
}
