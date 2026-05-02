import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Inline variant — no dismiss, embedded within a card
// ─────────────────────────────────────────────────────────────────────────────

export function ScannerWarningInline() {
  return (
    <div
      className="flex items-start gap-3 bg-amber-50 border border-amber-200/60
                 rounded-lg px-4 py-3 mt-3"
    >
      <AlertTriangle
        size={16}
        className="text-amber-600 flex-shrink-0 mt-0.5"
      />
      <div>
        <p className="text-xs font-medium text-amber-800">
          Requiere escaneo
        </p>
        <p className="text-xs text-amber-700 mt-0.5">
          Este documento debe ser escaneado con resolución mínima de 300 dpi
          y entregado en formato PDF. Usa firma en tinta azul y sello original.
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Banner variant — dismissible, top of page
// ─────────────────────────────────────────────────────────────────────────────

interface ScannerWarningBannerProps {
  message?: string
}

export function ScannerWarningBanner({
  message = 'Algunos documentos en tu proceso requieren ser escaneados y entregados en físico con firma original y sello.',
}: ScannerWarningBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' as const }}
          className="overflow-hidden"
        >
          <div
            className="flex items-center justify-between gap-4
                       bg-amber-50 border-b border-amber-200/60 px-8 py-3"
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
              <p className="text-xs text-amber-800">
                <span className="font-medium">Atención:</span> {message}
              </p>
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="flex-shrink-0 p-1 rounded text-amber-600
                         hover:bg-amber-100 transition-colors duration-150"
              aria-label="Cerrar aviso"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
