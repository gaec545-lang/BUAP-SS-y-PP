// ─────────────────────────────────────────────────────────────────────────────
// Actor types
// ─────────────────────────────────────────────────────────────────────────────

export type Actor = 'Alumno' | 'CPPC' | 'Dependencia' | 'División'

// ─────────────────────────────────────────────────────────────────────────────
// Step status
// ─────────────────────────────────────────────────────────────────────────────

export type StepStatus = 'completed' | 'current' | 'pending'

// ─────────────────────────────────────────────────────────────────────────────
// Document status
// ─────────────────────────────────────────────────────────────────────────────

export type DocumentStatus = 'pending' | 'ready' | 'generated' | 'delivered'

// ─────────────────────────────────────────────────────────────────────────────
// Process types (the 6 tramite types in the system)
// ─────────────────────────────────────────────────────────────────────────────

export type ProcessType =
  | 'ss_nueva'
  | 'ss_recurso'
  | 'pp_nueva'
  | 'pp_recurso'
  | 'ss_exencion'
  | 'pp_exencion'

export type ProcessCategory = 'Servicio Social' | 'Práctica Profesional'

// ─────────────────────────────────────────────────────────────────────────────
// Document definition (attached to a process step)
// ─────────────────────────────────────────────────────────────────────────────

export interface StepDocument {
  id: string
  name: string
  description: string
  requiresScan: boolean
  /** URL or generated blob – null until generated */
  downloadUrl: string | null
  generatedAt: string | null
  status: DocumentStatus
}

// ─────────────────────────────────────────────────────────────────────────────
// Process step
// ─────────────────────────────────────────────────────────────────────────────

export interface ProcessStep {
  id: string
  order: number
  shortLabel: string
  title: string
  description: string
  actor: Actor
  status: StepStatus
  completedDate?: string
  /** What the alumno must do right now (shown only for current step) */
  action?: string
  documents: StepDocument[]
  requiresScan: boolean
  notes?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Process definition (template – one per process type)
// ─────────────────────────────────────────────────────────────────────────────

export interface ProcessDefinition {
  type: ProcessType
  category: ProcessCategory
  name: string
  shortName: string
  description: string
  /** Whether completing this process generates a "recurso académico" */
  generatesResource: boolean
  totalSteps: number
  steps: ProcessStep[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Student enrollment in a process (instance)
// ─────────────────────────────────────────────────────────────────────────────

export interface StudentProcess {
  /** Unique instance id */
  instanceId: string
  processType: ProcessType
  currentStepOrder: number
  startedAt: string
  estimatedEndDate: string | null
  steps: ProcessStep[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Student
// ─────────────────────────────────────────────────────────────────────────────

export interface Student {
  id: string
  /** Matrícula BUAP */
  matricula: string
  name: string
  lastName: string
  email: string
  /** Carrera/Licenciatura */
  major: string
  semester: number
  /** Promedio general */
  gpa: number
  /** Nombre de la dependencia donde realiza SS/PP */
  dependencia: string | null
  /** Nombre del asesor interno */
  internalAdvisor: string | null
  activeProcess: StudentProcess | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Deadline
// ─────────────────────────────────────────────────────────────────────────────

export type DeadlineUrgency = 'critical' | 'warning' | 'approaching' | 'safe'

export interface Deadline {
  id: string
  title: string
  description: string
  date: string              // ISO date string
  relatedProcessTypes: ProcessType[]
  /** Shown to which student ids (empty = all) */
  studentIds: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Document library entry (standalone documents outside steps)
// ─────────────────────────────────────────────────────────────────────────────

export interface DocumentLibraryEntry {
  id: string
  name: string
  description: string
  processTypes: ProcessType[]
  /** Step order where this document is relevant */
  stepOrder: number
  requiresScan: boolean
  templateDescription: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth / session
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthSession {
  student: Student
  loginAt: string
}

// ─────────────────────────────────────────────────────────────────────────────
// UI helpers
// ─────────────────────────────────────────────────────────────────────────────

export type NavItem = {
  id: string
  label: string
  icon: string
  path: string
}
