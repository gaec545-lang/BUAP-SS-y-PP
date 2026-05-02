import { AlertOctagon } from 'lucide-react'

export function ResourceWarning() {
  return (
    <div
      className="flex items-start gap-3 bg-danger-light border border-danger/20
                 rounded-card px-5 py-4 mt-6"
    >
      <AlertOctagon size={20} className="text-danger flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-danger-dark">
          Este proceso genera un recurso académico
        </p>
        <p className="text-xs text-danger-dark/80 mt-1 leading-relaxed">
          Al completar este trámite bajo la modalidad de recurso académico, se
          registrará una calificación no acreditada en tu kárdex. Esta
          calificación aparecerá en tu historial académico permanentemente.
          Consulta con tu asesor interno o con la CPPC si tienes dudas antes
          de continuar.
        </p>
      </div>
    </div>
  )
}
