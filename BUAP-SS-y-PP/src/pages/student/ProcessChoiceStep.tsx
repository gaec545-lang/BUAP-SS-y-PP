import { useState } from 'react'
import { Briefcase, Users, ChevronRight } from 'lucide-react'

export function ProcessChoiceStep({ onComplete }: { onComplete: () => void }) {
  const [choice, setChoice] = useState<'ss' | 'pp' | null>(() => {
    return (localStorage.getItem('buap_selected_process') as 'ss' | 'pp') || null
  })

  const handleSelect = (val: 'ss' | 'pp') => {
    setChoice(val)
    localStorage.setItem('buap_selected_process', val)
  }

  return (
    <div className="mt-4 p-5 bg-white border border-gray-200 rounded-xl space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => handleSelect('ss')}
          className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${
            choice === 'ss'
              ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-100'
              : 'border-gray-100 bg-gray-50 hover:border-blue-200 hover:bg-white'
          }`}
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            choice === 'ss' ? 'bg-blue-500 text-white' : 'bg-white text-gray-400'
          }`}>
            <Users size={24} />
          </div>
          <div className="text-center">
            <span className={`block font-bold text-sm ${choice === 'ss' ? 'text-blue-900' : 'text-gray-700'}`}>
              Servicio Social
            </span>
          </div>
        </button>

        <button
          onClick={() => handleSelect('pp')}
          className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${
            choice === 'pp'
              ? 'border-purple-500 bg-purple-50 ring-4 ring-purple-100'
              : 'border-gray-100 bg-gray-50 hover:border-purple-200 hover:bg-white'
          }`}
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            choice === 'pp' ? 'bg-purple-500 text-white' : 'bg-white text-gray-400'
          }`}>
            <Briefcase size={24} />
          </div>
          <div className="text-center">
            <span className={`block font-bold text-sm ${choice === 'pp' ? 'text-purple-900' : 'text-gray-700'}`}>
              Práctica Profesional
            </span>
          </div>
        </button>
      </div>

      <div className="pt-4 flex justify-end">
        <button
          disabled={!choice}
          onClick={onComplete}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-sm ${
            choice 
              ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95' 
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          Confirmar elección y continuar
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}
