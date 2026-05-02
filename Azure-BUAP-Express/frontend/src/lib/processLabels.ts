import type { ProcessType } from '../types'

const PROCESS_LABELS: Record<ProcessType, { name: string; category: string; color: string }> = {
  ss_nueva:    { name: 'Servicio Social',               category: 'Primera vez',      color: 'text-primary-700 bg-primary-50' },
  ss_recurso:  { name: 'Servicio Social',               category: 'Recurso académico', color: 'text-warning-dark bg-warning-light' },
  pp_nueva:    { name: 'Práctica Profesional',          category: 'Primera vez',      color: 'text-primary-700 bg-primary-50' },
  pp_recurso:  { name: 'Práctica Profesional',          category: 'Recurso académico', color: 'text-warning-dark bg-warning-light' },
  ss_exencion: { name: 'Servicio Social',               category: 'Exención',         color: 'text-info-dark bg-info-light' },
  pp_exencion: { name: 'Práctica Profesional',          category: 'Exención',         color: 'text-info-dark bg-info-light' },
}

export function getProcessLabel(type: ProcessType) {
  return PROCESS_LABELS[type]
}

export function getProcessFullName(type: ProcessType): string {
  const { name, category } = PROCESS_LABELS[type]
  return `${name} — ${category}`
}

export function getTotalSteps(type: ProcessType): number {
  const map: Record<ProcessType, number> = {
    ss_nueva:    17,
    ss_recurso:  14,
    pp_nueva:    15,
    pp_recurso:  12,
    ss_exencion:  8,
    pp_exencion:  7,
  }
  return map[type]
}
