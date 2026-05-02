import type { Actor } from '../types'

interface ActorBadgeProps {
  actor: Actor
  size?: 'sm' | 'xs'
}

const ACTOR_STYLES: Record<Actor, { bg: string; text: string }> = {
  Alumno:     { bg: 'bg-blue-50',   text: 'text-blue-600'   },
  CPPC:       { bg: 'bg-amber-50',  text: 'text-amber-700'  },
  Dependencia:{ bg: 'bg-purple-50', text: 'text-purple-600' },
  División:   { bg: 'bg-green-50',  text: 'text-green-700'  },
}

export function ActorBadge({ actor, size = 'sm' }: ActorBadgeProps) {
  const styles = ACTOR_STYLES[actor]
  const sizeClass = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'

  return (
    <span
      className={`inline-flex items-center rounded-badge font-medium ${sizeClass} ${styles.bg} ${styles.text}`}
    >
      {actor}
    </span>
  )
}
