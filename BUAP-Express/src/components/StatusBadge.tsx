import type { DocumentStatus } from '../types'

interface StatusBadgeProps {
  status: DocumentStatus
}

const STATUS_CONFIG: Record<
  DocumentStatus,
  { label: string; bg: string; text: string; dotColor: string; animate: boolean }
> = {
  pending: {
    label: 'Pendiente',
    bg: 'bg-gray-100',
    text: 'text-gray-500',
    dotColor: 'bg-gray-300',
    animate: false,
  },
  ready: {
    label: 'Listo para generar',
    bg: 'bg-info-light',
    text: 'text-info-dark',
    dotColor: 'bg-info',
    animate: true,
  },
  generated: {
    label: 'Generado',
    bg: 'bg-success-light',
    text: 'text-success-dark',
    dotColor: 'bg-success',
    animate: false,
  },
  delivered: {
    label: 'Entregado',
    bg: 'bg-primary-50',
    text: 'text-primary-700',
    dotColor: 'bg-primary-500',
    animate: false,
  },
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status]

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-badge
                  text-xs font-medium ${cfg.bg} ${cfg.text}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor} ${cfg.animate ? 'animate-pulse-soft' : ''}`}
      />
      {cfg.label}
    </span>
  )
}
