import { useState, useEffect } from 'react'
import { getInterests, updateInterest, submitUpload, type InterestAPI } from '../../services/api'
import { CheckCircle2, FileUp, AlertCircle } from 'lucide-react'

// Map of document codes to nice labels for Step 9
const DOC_LABELS: Record<string, string> = {
  cpa_signed: 'CPA Firmada y Sellada',
  carta_confidencialidad_signed: 'Carta de Confidencialidad',
  kardex_simple: 'Kárdex Simple actualizado',
  vigencia_imss: 'Vigencia de Derechos IMSS',
}

export function MultiDocsUploadStep({ 
  processCode, 
  stepNumber, 
  requiredDocs,
  uploadStatuses, 
  onUploadStateChange, 
  onComplete 
}: { 
  processCode: string
  stepNumber: number
  requiredDocs: string[]
  uploadStatuses: any[]
  onUploadStateChange: () => void
  onComplete: () => void
}) {
  const [interests, setInterests] = useState<InterestAPI[]>([])
  const [selectedFolioId, setSelectedFolioId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  
  const [files, setFiles] = useState<Record<string, File | null>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)

  useEffect(() => {
    getInterests().then(res => {
      // Show accepted + any already selected
      const valid = res.filter(i => i.status === 'accepted' || i.status === 'selected')
      setInterests(valid)
      
      const preSelected = valid.find(i => i.status === 'selected')
      if (preSelected) setSelectedFolioId(String(preSelected.id))
      
      setLoading(false)
    })
  }, [])

  const handleSelectFolio = async (idStr: string) => {
    setSelectedFolioId(idStr)
    const nid = parseInt(idStr, 10)
    if (!isNaN(nid)) {
      for (const i of interests) {
         if (i.status === 'selected' && i.id !== nid) {
            await updateInterest(i.id, 'accepted')
         }
      }
      await updateInterest(nid, 'selected')
    }
  }

  const handleFileChange = (docCode: string, file: File | null) => {
    setFiles(prev => ({ ...prev, [docCode]: file }))
    setGlobalError(null)
  }

  const docsState = requiredDocs.map(docCode => {
    const stat = uploadStatuses.find(u => u.document_type_code === docCode && u.process_code === processCode)
    const isSubmitted = stat && (stat.current_status === 'pending_review' || stat.current_status === 'approved')
    const hasLocalFile = !!files[docCode]
    return { docCode, isSubmitted, hasLocalFile, stat }
  })

  // Has EVERY single doc been loaded locally or already exists in DB?
  const isReadyToBatchSubmit = docsState.every(d => d.isSubmitted || d.hasLocalFile) 
                               && docsState.some(d => d.hasLocalFile)

  // Are all documents actively present in the DB successfully? 
  const allSubmittedOrApproved = requiredDocs.every(docCode => {
    const s = uploadStatuses.find(u => u.document_type_code === docCode && u.process_code === processCode)
    return s && (s.current_status === 'pending_review' || s.current_status === 'approved')
  })

  // Are ALL 4 mathematically approved by the Admin?
  const allApproved = requiredDocs.every(docCode => {
    const s = uploadStatuses.find(u => u.document_type_code === docCode && u.process_code === processCode)
    return s && s.current_status === 'approved'
  })

  const handleBatchSubmit = async () => {
    if (!selectedFolioId) {
      setGlobalError('Debes seleccionar un programa final antes de subir los documentos.')
      return
    }
    
    setIsSubmitting(true)
    setGlobalError(null)

    try {
      for (const docCode of requiredDocs) {
        const fileToSubmit = files[docCode]
        if (fileToSubmit) {
          await submitUpload(fileToSubmit, docCode, processCode, stepNumber)
        }
      }
      setFiles({}) // Clear local selections
      onUploadStateChange() // Refresh DB state in Parent
    } catch (err: any) {
      setGlobalError(err.message || 'Ocurrió un error al subir los archivos en bloque.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return <p className="text-sm mt-4 text-gray-500">Cargando folios elegibles...</p>

  return (
    <div className="mt-4 bg-white border border-gray-200 rounded-xl p-5 space-y-6">
      
      {/* 1. Folio Dropdown */}
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
        <label className="block text-sm font-bold text-blue-900 mb-2">Selecciona el folio final donde realizarás tu proceso:</label>
        <select 
           value={selectedFolioId} 
           onChange={e => handleSelectFolio(e.target.value)}
           className="w-full border border-blue-200 rounded-lg p-2.5 text-sm bg-white text-gray-800"
        >
          <option value="">-- Elige un folio aceptado --</option>
          {interests.map(i => (
             <option key={i.id} value={i.id}>{i.folio} - {i.dependency_name}</option>
          ))}
        </select>
        {!selectedFolioId && <p className="text-xs text-blue-700 mt-2">Debes seleccionar un programa para poder completar tu inscripción.</p>}
      </div>

      {/* 2. Upload Grid or Review Lock Banner */}
      <div className="space-y-4">
        {allSubmittedOrApproved && !allApproved ? (
           <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center shadow-sm">
             <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-200 shadow-sm">
               <FileUp size={32} className="text-yellow-600" />
             </div>
             <h3 className="text-xl font-extrabold text-yellow-900 mb-2">Documentos en Revisión</h3>
             <p className="text-sm text-yellow-800 leading-relaxed max-w-md mx-auto">
               Has cargado exitosamente los 4 documentos obligatorios. La coordinación validará la autenticidad de tu expediente en breve. 
               <br/><br/>
               <span className="font-bold">Nota:</span> Ya no puedes volver a subir documentos. Si alguno es rechazado, se te habilitará la opción para corregirlo.
             </p>
           </div>
        ) : (
          <>
            <h4 className="text-sm font-bold text-gray-800">Carga de Documentos Obligatorios</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {docsState.map(({ docCode, isSubmitted, stat, hasLocalFile }) => {
                 return (
                   <div key={docCode} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                      <h5 className="text-sm font-bold text-gray-800 mb-2">{DOC_LABELS[docCode] || docCode}</h5>
                      {stat?.current_status === 'pending_review' && (
                         <p className="text-sm text-yellow-700 font-bold bg-yellow-100 p-1.5 px-3 rounded-md w-max border border-yellow-200 shadow-sm">En revisión</p>
                      )}
                      {stat?.current_status === 'approved' && (
                         <p className="text-sm text-green-700 font-bold bg-green-100 p-1.5 px-3 rounded-md w-max border border-green-200 shadow-sm">Aprobado</p>
                      )}
                      {stat?.current_status === 'rejected' && (
                         <p className="text-sm text-red-600 font-medium mb-3">Rechazado: {stat.rejection_reason || 'Revisa tu documento y sube otro.'}</p>
                      )}
                      
                      {/* Allow selecting file only if not already cleanly in DB */}
                      {(!isSubmitted || stat?.current_status === 'rejected') && (
                         <div className="mt-2">
                            <input 
                              type="file" 
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={e => handleFileChange(docCode, e.target.files?.[0] || null)}
                              className="block w-full text-xs text-slate-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-xs file:font-semibold
                                file:bg-blue-50 file:text-blue-700
                                hover:file:bg-blue-100 cursor-pointer"
                            />
                            {hasLocalFile && <p className="mt-2 flex items-center gap-1 leading-none text-xs text-green-700 font-bold"><CheckCircle2 size={14}/> Archivo asignado localmente</p>}
                         </div>
                      )}
                   </div>
                 )
              })}
            </div>
          </>
        )}
      </div>

      {globalError && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 rounded-lg">
          <AlertCircle size={16} />
          <p>{globalError}</p>
        </div>
      )}

      {/* 3. Continue buttons */}
      <div className="pt-4 flex justify-end gap-3 flex-wrap">
         
         {!allSubmittedOrApproved && (
           <button 
             disabled={isSubmitting || !isReadyToBatchSubmit || !selectedFolioId}
             onClick={handleBatchSubmit} 
             className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-sm ${(isReadyToBatchSubmit && selectedFolioId && !isSubmitting) ? 'bg-primary-600 text-white hover:bg-primary-700 hover:scale-[1.02]' : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'}`}
           >
              {isSubmitting ? 'Subiendo archivos...' : 'Subir los documentos obligatorios'} <FileUp size={18} />
           </button>
         )}

         {allApproved && (
           <button 
             disabled={!selectedFolioId}
             onClick={onComplete} 
             className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-sm ${selectedFolioId ? 'bg-green-600 text-white hover:bg-green-700 hover:scale-[1.02]' : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'}`}
           >
              ¡Todos aprobados! Completar Inscripción Final <CheckCircle2 size={18} />
           </button>
         )}

      </div>
    </div>
  )
}
