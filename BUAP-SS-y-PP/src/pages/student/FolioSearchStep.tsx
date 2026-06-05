import { useState, useEffect } from 'react'
import { Search, Plus, Trash2, CheckCircle2 } from 'lucide-react'
import { getProgramByFolio, addInterest, getInterests, removeInterest, type InterestAPI } from '../../services/api'

export function FolioSearchStep({ onComplete }: { onComplete: () => void }) {
  const [folio, setFolio] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResult, setSearchResult] = useState<any>(null)
  const [error, setError] = useState('')
  
  const [interests, setInterests] = useState<InterestAPI[]>([])
  const [loadingInterests, setLoadingInterests] = useState(true)

  const loadInterests = async () => {
    try {
      const ints = await getInterests()
      setInterests(ints)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingInterests(false)
    }
  }

  useEffect(() => {
    loadInterests()
  }, [])

  const handleSearch = async () => {
    if (!folio.trim()) return
    setSearching(true)
    setError('')
    setSearchResult(null)
    try {
      const res = await getProgramByFolio(folio)
      setSearchResult(res)
    } catch (err: unknown) {
       setSearchResult(null)
       if(err instanceof Error) setError(err.message)
       else setError('No encontrado')
    } finally {
      setSearching(false)
    }
  }

  const handleSave = async (f: string) => {
    try {
      await addInterest(f)
      setSearchResult(null)
      setFolio('')
      await loadInterests()
    } catch(err: any) {
      setError(err.message || 'Error guardando folio')
    }
  }

  const handleRemove = async (id: number) => {
    await removeInterest(id)
    await loadInterests()
  }

  return (
    <div className="mt-4 p-5 bg-white border border-gray-200 rounded-xl space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700">Buscar programa por Folio</label>
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            placeholder="Ej. SS-24-001"
            value={folio}
            onChange={(e) => setFolio(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button 
            disabled={searching}
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
             {searching ? '...' : <Search size={18} />}
          </button>
        </div>
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
      </div>

      {searchResult && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex justify-between items-center">
          <div>
            <h4 className="font-bold text-blue-900">{searchResult.name}</h4>
            <p className="text-sm text-blue-700">{searchResult.dependency_name}</p>
          </div>
          <button onClick={() => handleSave(searchResult.folio)} className="flex items-center gap-1 bg-white border border-blue-300 text-blue-700 px-3 py-1.5 rounded-md hover:bg-blue-100 text-sm font-medium transition">
            <Plus size={16} /> Agregar
          </button>
        </div>
      )}

      {loadingInterests ? (
         <p className="text-sm text-gray-400">Cargando carrito de intereses...</p>
      ) : interests.length > 0 ? (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-gray-800">Tus Opciones (Carrito de Folios):</h4>
          {interests.map(i => (
             <div key={i.id} className="flex justify-between items-center bg-gray-50 border border-gray-200 rounded-lg p-3">
               <div className="flex flex-col">
                  <span className="font-bold text-sm text-gray-800">{i.folio} — {i.program_name}</span>
                  <span className="text-xs text-blue-600 font-medium">Interesados: {i.interested_count} / Cupo total: {i.max_slots}</span>
               </div>
               <button onClick={() => handleRemove(i.id)} className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50">
                 <Trash2 size={16} />
               </button>
             </div>
          ))}
          <div className="pt-4 flex justify-end">
            <button
               onClick={onComplete}
               className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-xl hover:bg-green-700 text-sm font-bold transition-all shadow-sm"
            >
              Confirmar selección y continuar <CheckCircle2 size={18} />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 border-2 border-dashed border-gray-200 rounded-lg text-center text-gray-500 text-sm">
          Aún no has agregado folios. Busca programas de tu interés para agregarlos.
        </div>
      )}
    </div>
  )
}
