import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Upload, FileCheck, Loader2, ShieldCheck, CheckSquare, X, AlertCircle, CheckCircle } from 'lucide-react'

import { validateUnifiedDocuments, getMyFiles } from '../../services/api'
import { useStudent } from '../../context/StudentContext'

const requiredDocs = [
  { id: 'cpa', label: 'CPA (Carta de Presentación y Aceptación)' },
  { id: 'confidencialidad', label: 'Carta de Confidencialidad' },
  { id: 'compromiso', label: 'Carta Compromiso (Opcional)' },
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
  
  const [uploads, setUploads] = useState<any[]>([])
  const [folios, setFolios] = useState<string[]>([])
  const [selectedFolio, setSelectedFolio] = useState<string>('')
  const [newFolio, setNewFolio] = useState<string>('')

  useEffect(() => {
    getMyFiles().then(data => {
      setUploads(data || [])
      const uniqueFolios = Array.from(new Set(data.map((u: any) => u.folio).filter(Boolean))) as string[]
      setFolios(uniqueFolios)
      if (uniqueFolios.length > 0) {
        setSelectedFolio(uniqueFolios[0])
      } else {
        setSelectedFolio('new')
      }
    }).catch(console.error)
  }, [])
  
  const handleFileChange = (id: string, file: File | null) => {
    setFiles(prev => ({ ...prev, [id]: file }))
  }

  const allFilesSelected = Boolean(files.cpa && files.confidencialidad && files.kardex && files.imss)

  const { student } = useStudent()

  const handleValidate = async () => {
    if (!allFilesSelected) return
    setLoading(true)
    setResult(null)
    try {
      const activeFolio = selectedFolio === 'new' ? newFolio : selectedFolio
      const res = await validateUnifiedDocuments(files, student?.id, activeFolio)
      setResult(res)
      const data = await getMyFiles()
      setUploads(data || [])
      
      // Update folio list if new folio was created
      const uniqueFolios = Array.from(new Set(data.map((u: any) => u.folio).filter(Boolean))) as string[]
      setFolios(uniqueFolios)
      if (selectedFolio === 'new' && activeFolio) {
        setSelectedFolio(activeFolio)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getDocStatus = (docId: string) => {
    const activeFolio = selectedFolio === 'new' ? newFolio : selectedFolio
    const targetCodes = 
      docId === 'cpa' ? ['cpa_ss', 'cpa_pp', 'cpa'] :
      docId === 'imss' ? ['vigencia_imss', 'imss'] :
      docId === 'confidencialidad' ? ['carta_confidencialidad', 'confidencialidad'] :
      docId === 'compromiso' ? ['carta_compromiso', 'compromiso'] :
      [docId];

    const docUploads = uploads.filter(u => 
      u.folio === activeFolio && 
      targetCodes.includes(u.document_type_code || u.document_type || '')
    )
    if (!docUploads.length) return null
    // Get the most recent one
    return docUploads.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())[0]
  }

  const currentUploads = uploads.filter(u => selectedFolio !== 'new' && u.folio === selectedFolio)

  return (
    <div className="w-full flex flex-col items-center">
      <div className="mb-8 w-full max-w-4xl text-left">
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">Validador Unificado</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Sube tus documentos oficiales en formato PDF para iniciar la validación unificada con inteligencia artificial.
        </p>
      </div>

      <div className="w-full max-w-4xl mb-6 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Folio del Trámite:</label>
        <select 
          value={selectedFolio} 
          onChange={e => setSelectedFolio(e.target.value)}
          className="w-full md:w-1/2 p-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          {folios.map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
          <option value="new">-- Nuevo Folio --</option>
        </select>
        {selectedFolio === 'new' && (
           <input 
             type="text" 
             placeholder="Escribe el nuevo folio..."
             value={newFolio}
             onChange={e => setNewFolio(e.target.value)}
             className="mt-3 w-full md:w-1/2 p-2 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none block"
           />
        )}
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {requiredDocs.map(doc => {
          const file = files[doc.id]
          const docStatus = getDocStatus(doc.id)
          const isApproved = docStatus?.status === 'approved'
          const isRejected = docStatus?.status === 'rejected'

          return (
            <div 
              key={doc.id}
              className={`relative border-2 border-dashed rounded-2xl p-4 transition-all ${
                isApproved ? 'border-green-500 bg-green-50/20 dark:bg-green-950/20' :
                isRejected ? 'border-red-500 bg-red-50/20 dark:bg-red-950/20' :
                file ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20' : 'border-gray-300 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-700 bg-white dark:bg-gray-900'
              }`}
            >
              <input 
                type="file" 
                id={`file-${doc.id}`} 
                accept=".pdf" 
                className="hidden" 
                disabled={isApproved}
                onChange={(e) => handleFileChange(doc.id, e.target.files?.[0] || null)}
              />
              
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    isApproved ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' :
                    isRejected ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400' :
                    file ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                    {isApproved ? <CheckCircle size={24} /> : file ? <FileCheck size={24} /> : <Upload size={24} />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{doc.label}</p>
                    {isApproved ? (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">Aprobado</p>
                    ) : isRejected ? (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">Rechazado</p>
                    ) : file ? (
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 truncate mt-0.5">{file.name}</p>
                    ) : (
                      <p className="text-xs text-gray-400 mt-0.5">Pendiente de subir</p>
                    )}
                  </div>

                  {isApproved ? null : file ? (
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

                {isRejected && docStatus?.rejection_reason && (
                  <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-xs rounded flex gap-2 items-start">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{docStatus.rejection_reason}</span>
                  </div>
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
            Al hacer clic en el botón, el sistema auditará las firmas y sellos de los documentos y los registrará en el expediente.
          </p>
        </div>
        
        <button
          onClick={handleValidate}
          disabled={!allFilesSelected || loading || (selectedFolio === 'new' && !newFolio.trim())}
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
          className="w-full max-w-4xl mt-6 p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-md space-y-4"
        >
          <div className="flex items-start gap-4">
            <FileCheck className="text-green-600 dark:text-green-400 mt-1 shrink-0" size={24} />
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white">Resultado de la Auditoría Automática</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Los documentos han sido analizados por el motor de validación. A continuación se presentan los detalles del expediente por archivo:
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {Object.entries(result).map(([key, run]: [string, any]) => {
              const label = requiredDocs.find(d => d.id === key)?.label || key
              const confidence = run.overall_confidence != null ? Math.round(run.overall_confidence * 100) : null
              const isFail = run.overall_result === 'fail'
              const isWarning = run.overall_result === 'warning'
              const isManual = run.overall_result === 'manual_review'
              
              let resultLabel = 'Paso exitoso'
              let badgeColor = 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300 border-green-200 dark:border-green-900/30'
              
              if (isFail) {
                resultLabel = 'No coincide / Error'
                badgeColor = 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-900/30'
              } else if (isWarning) {
                resultLabel = 'Advertencia / Revisión'
                badgeColor = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300 border-yellow-200 dark:border-yellow-900/30'
              } else if (isManual) {
                resultLabel = 'Revisión manual'
                badgeColor = 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200 dark:border-orange-900/30'
              }
              
              return (
                <div key={key} className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex flex-col gap-2 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{label}</p>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${badgeColor}`}>
                      {resultLabel}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Método: {run.extraction_method || 'N/A'}</span>
                    {confidence != null && (
                      <span className="font-bold flex items-center gap-1">
                        Confianza: 
                        <span className={confidence >= 80 ? 'text-green-600' : confidence >= 50 ? 'text-yellow-600' : 'text-red-600'}>
                          {confidence}%
                        </span>
                      </span>
                    )}
                  </div>
                  
                  {run.checks && run.checks.length > 0 && (
                    <div className="mt-2 space-y-1 border-t border-gray-200/50 dark:border-gray-800 pt-2">
                      {run.checks.map((c: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-[11px] text-gray-400">
                          <span className="truncate">{c.check_name}</span>
                          <span className={c.result === 'pass' ? 'text-green-500' : c.result === 'fail' ? 'text-red-500' : 'text-yellow-500'}>
                            {c.result}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {currentUploads.length > 0 && (
        <div className="w-full max-w-4xl mt-8">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Historial de Documentos ({selectedFolio})</h3>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Documento</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Intento</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Estado</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Confianza</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Revisión Manual</th>
                  <th className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Logs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {currentUploads.map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{u.document_type_name || u.document_type_code || 'Documento'}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{u.attempt_number}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        u.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        u.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}>
                        {u.status === 'approved' ? 'Aprobado' : u.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.confidence_score != null ? (
                         <span className={`${u.confidence_score >= 80 ? 'text-green-600 font-bold' : u.confidence_score >= 50 ? 'text-yellow-600 font-bold' : 'text-red-600 font-bold'}`}>
                           {u.confidence_score}%
                         </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {u.manual_review ? 'Sí' : 'No'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-[200px] truncate" title={u.logs}>
                      {u.logs || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
