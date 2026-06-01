import { useState } from 'react'
import { motion } from 'framer-motion'
import { Upload, FileCheck, Loader2, ShieldCheck, CheckSquare, X } from 'lucide-react'

import { validateUnifiedDocuments } from '../../services/api'
import { useStudent } from '../../context/StudentContext'

const requiredDocs = [
  { id: 'cpa', label: 'CPA (Carta de Presentación y Aceptación)' },
  { id: 'confidencialidad', label: 'Carta de Confidencialidad' },
  { id: 'compromiso', label: 'Carta Compromiso' },
  { id: 'kardex', label: 'Kárdex Actualizado' },
  { id: 'imss', label: 'Vigencia de Derechos IMSS' }
]

export function ValidatorView() {
  const [files, setFiles] = useState<Record<string, File | null>>({
    cpa: null,
    confidencialidad: null,
    compromiso: null,
    kardex: null,
    imss: null
  })
  
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  
  const handleFileChange = (id: string, file: File | null) => {
    setFiles(prev => ({ ...prev, [id]: file }))
  }

  const allFilesSelected = Object.values(files).every(f => f !== null)

  const { student } = useStudent()

  const handleValidate = async () => {
    if (!allFilesSelected) return
    setLoading(true)
    setResult(null)
    try {
      const res = await validateUnifiedDocuments(files, student?.id)
      setResult(res)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full flex flex-col items-center">
      <div className="mb-8 w-full max-w-4xl text-left">
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">Validador Unificado</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Sube tus 5 documentos oficiales en formato PDF para iniciar la validación unificada con inteligencia artificial.
        </p>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {requiredDocs.map(doc => {
          const file = files[doc.id]
          return (
            <div 
              key={doc.id}
              className={`relative border-2 border-dashed rounded-2xl p-4 transition-all ${
                file ? 'border-green-500 bg-green-50/20 dark:bg-green-950/20' : 'border-gray-300 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-700 bg-white dark:bg-gray-900'
              }`}
            >
              <input 
                type="file" 
                id={`file-${doc.id}`} 
                accept=".pdf" 
                className="hidden" 
                onChange={(e) => handleFileChange(doc.id, e.target.files?.[0] || null)}
              />
              
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${file ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                  {file ? <FileCheck size={24} /> : <Upload size={24} />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{doc.label}</p>
                  {file ? (
                    <p className="text-xs text-green-600 dark:text-green-400 truncate mt-0.5">{file.name}</p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-0.5">Pendiente de subir</p>
                  )}
                </div>

                {file ? (
                  <button 
                    onClick={() => handleFileChange(doc.id, null)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    title="Eliminar"
                  >
                    <X size={18} />
                  </button>
                ) : (
                  <label 
                    htmlFor={`file-${doc.id}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    Examinar
                  </label>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h4 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <ShieldCheck className="text-indigo-500" />
            Auditoría Automática
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
            Al hacer clic en el botón, el sistema auditará las firmas y sellos de los 5 documentos en un solo paso.
          </p>
        </div>
        
        <button
          onClick={handleValidate}
          disabled={!allFilesSelected || loading}
          className="w-full sm:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader2 className="animate-spin" size={18} /> Procesando...</>
          ) : (
            <><CheckSquare size={18} /> Auditar Documentos</>
          )}
        </button>
      </div>

      {result && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-4xl mt-6 p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/40 rounded-2xl flex items-start gap-4"
        >
          <FileCheck className="text-green-600 dark:text-green-400 mt-1 shrink-0" size={24} />
          <div>
            <h4 className="font-bold text-green-800 dark:text-green-300">Validación completada</h4>
            <p className="text-sm text-green-700 dark:text-green-400 mt-1">
              Todos los documentos han sido analizados y verificados correctamente. El expediente ha sido actualizado.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  )
}
