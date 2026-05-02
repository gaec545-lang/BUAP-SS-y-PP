import { differenceInDays, parseISO, format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Deadline, DeadlineUrgency } from '../types'

interface DeadlineCardProps {
  deadline: Deadline
  today?: Date
}

function getUrgency(daysRemaining: number): DeadlineUrgency {
  if (daysRemaining <= 3) return 'critical'
  if (daysRemaining <= 7) return 'warning'
  if (daysRemaining <= 14) return 'approaching'
  return 'safe'
}

const URGENCY_CONFIG: Record<
  DeadlineUrgency,
  {
    pillBg: string
    pillText: string
    dotColor: string
    dotAnimate: boolean
    dateBg: string
    dateText: string
    label: string
  }
> = {
  critical: {
    pillBg: 'bg-danger-light',
    pillText: 'text-danger-dark',
    dotColor: 'bg-danger',
    dotAnimate: true,
    dateBg: 'bg-danger-light',
    dateText: 'text-danger-dark',
    label: 'Urgente',
  },
  warning: {
    pillBg: 'bg-warning-light',
    pillText: 'text-warning-dark',
    dotColor: 'bg-warning',
    dotAnimate: false,
    dateBg: 'bg-warning-light',
    dateText: 'text-warning-dark',
    label: 'Próximo',
  },
  approaching: {
    pillBg: 'bg-info-light',
    pillText: 'text-info-dark',
    dotColor: 'bg-info',
    dotAnimate: false,
    dateBg: 'bg-info-light',
    dateText: 'text-info-dark',
    label: 'En camino',
  },
  safe: {
    pillBg: 'bg-gray-100',
    pillText: 'text-gray-500',
    dotColor: 'bg-gray-300',
    dotAnimate: false,
    dateBg: 'bg-gray-100',
    dateText: 'text-gray-600',
    label: 'Con tiempo',
  },
}

export function DeadlineCard({ deadline, today = new Date() }: DeadlineCardProps) {
  const deadlineDate = parseISO(deadline.date)
  const daysRemaining = differenceInDays(deadlineDate, today)
  const urgency = getUrgency(Math.max(daysRemaining, 0))
  const cfg = URGENCY_CONFIG[urgency]

  const dayNum = format(deadlineDate, 'd', { locale: es })
  const monthAbbr = format(deadlineDate, 'MMM', { locale: es })

  return (
    <div
      className="bg-white rounded-card border border-surface-border shadow-card
                 hover:shadow-card-hover transition-shadow duration-200
                 flex items-start gap-4 p-5"
    >
      {/* Date badge */}
      <div
        className={`flex-shrink-0 w-14 rounded-lg ${cfg.dateBg} flex flex-col
                    items-center justify-center py-2`}
      >
        <span className={`text-xl font-semibold ${cfg.dateText} leading-none`}>
          {dayNum}
        </span>
        <span className={`text-xs font-medium ${cfg.dateText} uppercase mt-0.5`}>
          {monthAbbr}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-content-primary leading-snug">
            {deadline.title}
          </p>
          <span
            className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1
                        rounded-badge text-xs font-medium ${cfg.pillBg} ${cfg.pillText}`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor} ${cfg.dotAnimate ? 'animate-pulse' : ''}`}
            />
            {cfg.label}
          </span>
        </div>
        <p className="text-xs text-content-secondary mt-1 leading-relaxed">
          {deadline.description}
        </p>
        <p className="text-xs text-content-tertiary mt-2">
          {daysRemaining <= 0
            ? 'Vence hoy'
            : daysRemaining === 1
              ? 'Mañana'
              : `En ${daysRemaining} días`}
          {' · '}
          {format(deadlineDate, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}
        </p>
      </div>
    </div>
  )
}
