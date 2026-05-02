import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Loader2, Check } from 'lucide-react'

type ButtonState = 'idle' | 'generating' | 'done'

interface GeneratePDFButtonProps {
  onGenerate: () => Promise<void>
  label?: string
}

export function GeneratePDFButton({
  onGenerate,
  label = 'Generar PDF',
}: GeneratePDFButtonProps) {
  const [state, setState] = useState<ButtonState>('idle')

  async function handleClick() {
    if (state !== 'idle') return
    setState('generating')
    try {
      await onGenerate()
      setState('done')
      setTimeout(() => setState('idle'), 2000)
    } catch {
      setState('idle')
    }
  }

  const variants = {
    idle: {
      initial: { opacity: 0, y: 4 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -4 },
    },
    generating: {
      initial: { opacity: 0, y: 4 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -4 },
    },
    done: {
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.9 },
    },
  }

  const currentVariant = variants[state]

  return (
    <button
      onClick={handleClick}
      disabled={state !== 'idle'}
      className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-button
                  text-sm font-medium transition-colors duration-150 overflow-hidden
                  ${
                    state === 'done'
                      ? 'bg-success text-white cursor-default'
                      : state === 'generating'
                        ? 'bg-primary-200 text-primary-800 cursor-wait'
                        : 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800'
                  }`}
    >
      <AnimatePresence mode="wait">
        {state === 'idle' && (
          <motion.span
            key="idle"
            className="flex items-center gap-2"
            initial={currentVariant.initial}
            animate={currentVariant.animate}
            exit={currentVariant.exit}
            transition={{ duration: 0.15, ease: 'easeOut' as const }}
          >
            <Download size={16} />
            {label}
          </motion.span>
        )}
        {state === 'generating' && (
          <motion.span
            key="generating"
            className="flex items-center gap-2"
            initial={variants.generating.initial}
            animate={variants.generating.animate}
            exit={variants.generating.exit}
            transition={{ duration: 0.15, ease: 'easeOut' as const }}
          >
            <Loader2 size={16} className="animate-spin" />
            Generando...
          </motion.span>
        )}
        {state === 'done' && (
          <motion.span
            key="done"
            className="flex items-center gap-2"
            initial={variants.done.initial}
            animate={variants.done.animate}
            exit={variants.done.exit}
            transition={{ duration: 0.2, ease: 'easeOut' as const }}
          >
            <Check size={16} />
            Descargado
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}
