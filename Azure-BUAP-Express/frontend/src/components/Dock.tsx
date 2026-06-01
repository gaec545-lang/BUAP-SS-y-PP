import { useState } from 'react'
import { motion } from 'framer-motion'
import { Home, FileText, CheckSquare } from 'lucide-react'
import './Dock.css'

interface DockProps {
  currentTab: 'home' | 'generate' | 'validate'
  onTabChange: (tab: 'home' | 'generate' | 'validate') => void
}

export function Dock({ currentTab, onTabChange }: DockProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const items = [
    { id: 'generate', label: 'Generate Document', icon: FileText, tab: 'generate' as const },
    { id: 'home', label: 'Home', icon: Home, tab: 'home' as const },
    { id: 'validate', label: 'Validator', icon: CheckSquare, tab: 'validate' as const }
  ]

  return (
    <div className="dock-outer z-40 pb-6 pt-4">
      <div className="dock-panel">
        {items.map((item, idx) => {
          const Icon = item.icon
          const isActive = currentTab === item.tab

          let scale = 1.0
          if (hoveredIndex !== null) {
            const dist = Math.abs(idx - hoveredIndex)
            if (dist === 0) scale = 1.3
            else if (dist === 1) scale = 1.15
          }

          return (
            <motion.button
              key={item.id}
              onClick={() => onTabChange(item.tab)}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`dock-item ${isActive ? 'dock-item-active' : ''}`}
              animate={{
                scale: scale,
                y: hoveredIndex === idx ? -10 : 0
              }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 18,
                mass: 0.8
              }}
            >
              <div className="dock-icon">
                <Icon size={24} className={isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
              </div>
              <span className="dock-label">{item.label}</span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
