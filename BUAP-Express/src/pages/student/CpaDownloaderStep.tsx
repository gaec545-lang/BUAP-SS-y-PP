import { useState, useEffect } from 'react'
import { getInterests, generateDocument, updateInterest, type InterestAPI } from '../../services/api'
import { FileText, Download, ChevronRight } from 'lucide-react'

export function CpaDownloaderStep({ processCode, stepNumber, onComplete }: { processCode: string, stepNumber: number, onComplete: () => void }) {
  const [interests, setInterests] = useState<InterestAPI[]>([])
  const [loading, setLoading] = useState(true)
  const [addresses, setAddresses] = useState<Record<number, string>>({})
  const [downloading, setDownloading] = useState<Record<number, boolean>>({})

  useEffect(() => {
    getInterests().then(res => {
      // Only show accepted or selected interests
      const filtered = res.filter(i => i.status === 'accepted' || i.status === 'selected')
      setInterests(filtered)
      
      // Initialize addresses from backend data
      const initialAddresses: Record<number, string> = {}
      filtered.forEach(i => {
        initialAddresses[i.id] = i.addressed_to || ''
      })
      setAddresses(initialAddresses)
      
      setLoading(false)
    })
  }, [])

  const handleDownload = async (i: InterestAPI) => {
    const address = addresses[i.id] || ''
    setDownloading(prev => ({ ...prev, [i.id]: true }))
    try {
      await generateDocument('cpa', processCode, stepNumber, address, i.folio)
    } catch(err) {
      alert('Error: No se pudo generar el documento')
    } finally {
      setDownloading(prev => ({ ...prev, [i.id]: false }))
    }
  }

  if (loading) return <p className="text-sm mt-4">Cargando dependencias aceptadas...</p>

  if (interests.length === 0) {
    return (
      <div className="mt-4 p-4 border-2 border-dashed border-red-200 bg-red-50 rounded-lg text-center text-red-600 text-sm font-medium">
        No tienes folios marcados como aceptados. Por favor, regresa al paso 5 y confirma al menos una cita.
      </div>
    )
  }

  return (
    <div className="mt-4 bg-white border border-gray-200 rounded-xl p-5 space-y-6">
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-gray-800">Tus Dependencias Confirmadas</h4>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
          <FileText className="text-amber-600 flex-shrink-0" size={20} />
          <p className="text-sm text-amber-800">
            Para cada dependencia, indica el nombre y cargo de la persona que firmará la carta (ej. Dr. Juan Pérez - Director General). Si lo dejas en blanco responderá "A quien corresponda".
          </p>
        </div>
        
        {interests.map(i => (
          <div key={i.id} className="bg-gray-50 border border-gray-200 p-4 rounded-xl flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
             <div className="flex-1 w-full">
               <span className="font-bold text-sm text-gray-800 block mb-1">{i.folio} - {i.dependency_name}</span>
               <input 
                  type="text" 
                  value={addresses[i.id] || ''}
                  onChange={e => setAddresses(prev => ({...prev, [i.id]: e.target.value}))}
                  onBlur={e => updateInterest(i.id, undefined, e.target.value)}
                  placeholder="Nombre y cargo a quien se dirige"
                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:ring-1 focus:ring-blue-500"
               />
            </div>
            <button 
               onClick={() => handleDownload(i)}
               disabled={downloading[i.id]}
               className="flex-shrink-0 flex items-center gap-2 bg-white border border-gray-300 shadow-sm text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition min-w-[120px] justify-center"
            >
               {downloading[i.id] ? 'Generando...' : <><Download size={16}/> Descargar CPA</>}
            </button>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-gray-100 flex justify-end">
         <button onClick={onComplete} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm bg-blue-600 text-white hover:bg-blue-700">
            Avanzar al siguiente paso <ChevronRight size={18} />
         </button>
      </div>
    </div>
  )
}
