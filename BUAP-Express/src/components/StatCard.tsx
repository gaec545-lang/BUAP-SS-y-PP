import { motion } from 'framer-motion'
import { useCountUp } from '../hooks/useCountUp'

interface StatCardProps {
  label: string
  value: number
  unit?: string
  sublabel?: string
  urgencyColor?: 'default' | 'warning' | 'danger'
  animationDelay?: string
}

export function StatCard({
  label,
  value,
  unit,
  sublabel,
  urgencyColor = 'default',
  animationDelay = '0ms',
}: StatCardProps) {
  const count = useCountUp(value, 600)

  const valueColorClass =
    urgencyColor === 'danger'
      ? 'text-danger'
      : urgencyColor === 'warning'
        ? 'text-warning-dark'
        : 'text-content-primary'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{ animationDelay }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      className="bg-white rounded-card border border-surface-border p-5 shadow-card
                 hover:shadow-card-hover transition-shadow duration-200"
    >
      <p className="text-xs font-medium text-content-tertiary uppercase tracking-wider mb-1">
        {label}
      </p>
      <div className="flex items-baseline gap-1.5">
        <p className={`text-2xl font-semibold ${valueColorClass} animate-count-up`}>
          {count}
        </p>
        {unit && (
          <span className="text-sm text-content-secondary">{unit}</span>
        )}
      </div>
      {sublabel && (
        <p className="text-xs text-content-secondary mt-1">{sublabel}</p>
      )}
    </motion.div>
  )
}
