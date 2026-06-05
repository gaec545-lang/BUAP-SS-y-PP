import { useState, useEffect } from 'react'
import { getInterests, updateInterest, type InterestAPI } from '../../services/api'
import { CheckCircle2, ChevronRight, AlertTriangle } from 'lucide-react'

export function FolioAppointmentStep({ onComplete }: { onComplete: () => void }) {
  const [interests, setInterests] = useState<InterestAPI[]>([])
  const [loading, setLoading] = useState(true)

  const loadInterests = async () => {
    try {
      const ints = await getInterests()
      setInterests(ints)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInterests()
  }, [])

  const handleToggle = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'accepted' ? 'interested' : 'accepted'
    await updateInterest(id, newStatus)
    await loadInterests()
  }

  const hasAccepted = interests.some(i => i.status === 'accepted')

  return (
    <div className="mt-4 p-5 bg-white border border-gray-200 rounded-xl space-y-6">

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <CheckCircle2 className="text-blue-600 flex-shrink-0" size={20} />
        <p className="text-sm text-blue-800">
          Marca las dependencias que aceptaron tu cita para poder generar tu oficio de comisión en el siguiente paso.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Cargando folios...</p>
      ) : interests.length > 0 ? (
        <div className="space-y-4">
          {interests.map(i => {
            const isAccepted = i.status === 'accepted' || i.status === 'selected'
            return (
              <div key={i.id} className={`p-4 rounded-xl border transition-all ${isAccepted ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-white border-gray-200 hover:border-blue-300'}`}>
                <div className="flex items-start gap-4">
                  <input 
                    type="checkbox" 
                    checked={isAccepted}
                    onChange={() => handleToggle(i.id, i.status)}
                    className="mt-1 w-5 h-5 text-green-600 rounded focus:ring-green-500 cursor-pointer"
                  />
                  <div className="flex-1">
                    <h4 className={`font-bold text-sm ${isAccepted ? 'text-green-900' : 'text-gray-800'}`}>
                      {i.folio} — {i.program_name}
                    </h4>
                    <p className={`text-xs mt-0.5 ${isAccepted ? 'text-green-700' : 'text-gray-500'}`}>
                      {i.dependency_name}
                    </p>

                  </div>
                </div>
              </div>
            )
          })}

          <div className="pt-4 flex justify-end">
            <button
               disabled={!hasAccepted}
               onClick={onComplete}
               className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${hasAccepted ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
            >
              Continuar al Paso 6 <ChevronRight size={18} />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 border-2 border-dashed border-gray-200 rounded-lg text-center text-gray-500 text-sm">
          No tienes folios en tu carrito. Regresa al paso anterior.
        </div>
      )}
    </div>
  )
}
