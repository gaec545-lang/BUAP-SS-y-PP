import { useState, useEffect } from 'react'
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { getUploadBlobUrl, adminApproveUpload, adminRejectUpload } from '../services/api'

export interface UploadData {
  upload_id: number;
  filename?: string;
  folio?: string;
  confidence_score?: number;
  validation_observations?: string;
  reason?: string;
  [key: string]: unknown;
}

export function DocumentReviewModal({
  upload,
  onClose,
  onRefresh,
}: {
  upload: UploadData
  onClose: () => void
  onRefresh: () => void
}) {
  const [tab, setTab] = useState<'preview' | 'validate'>('validate')
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loadingFile, setLoadingFile] = useState(false)
  const [errorFile, setErrorFile] = useState<string | null>(null)

  // Zoom & Rotation for preview
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)

  // Validation
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchFile() {
      if (!upload?.upload_id) return
      setLoadingFile(true)
      try {
        const url = await getUploadBlobUrl(upload.upload_id)
        setBlobUrl(url)
      } catch (err) {
        const error = err as Error;
        setErrorFile(error.message ?? 'Error al cargar el documento')
      } finally {
        setLoadingFile(false)
      }
    }
    fetchFile()
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [upload])

  async function handleApprove() {
    setActionLoading(true)
    setActionError(null)
    try {
      await adminApproveUpload(upload.upload_id)
      onRefresh()
      onClose()
    } catch (err) {
      const error = err as Error;
      setActionError(error.message ?? 'Error al aprobar')
      setActionLoading(false)
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) return
    setActionLoading(true)
    setActionError(null)
    try {
      await adminRejectUpload(upload.upload_id, rejectReason)
      onRefresh()
      onClose()
    } catch (err) {
      const error = err as Error;
      setActionError(error.message ?? 'Error al rechazar')
      setActionLoading(false)
    }
  }

  const isImage = upload?.filename?.toLowerCase().match(/\.(jpg|jpeg|png)$/)

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-card shadow-modal border border-surface-border w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-fade-in">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-border bg-surface flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-content-primary">
              Revisión de Documento
            </h2>
            <p className="text-sm text-content-secondary">
              {upload.filename ?? 'Documento'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-content-tertiary hover:text-content-primary rounded-full hover:bg-surface-hover transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 py-2 border-b border-surface-border bg-surface/50 flex-shrink-0">
          <div className="flex gap-1 bg-surface-divider rounded-lg p-1 w-max">
            <button
              onClick={() => setTab('validate')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                tab === 'validate' ? 'bg-white shadow-sm text-primary-700' : 'text-content-secondary hover:text-content-primary'
              }`}
            >
              Validación
            </button>
            <button
              onClick={() => setTab('preview')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                tab === 'preview' ? 'bg-white shadow-sm text-primary-700' : 'text-content-secondary hover:text-content-primary'
              }`}
            >
              Previsualización
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-surface-hover flex flex-col relative">
          
          {tab === 'validate' && (
            <div className="p-6 max-w-2xl mx-auto w-full space-y-6">
              <div className="bg-white p-5 rounded-card shadow-sm border border-surface-border">
                <h3 className="text-sm font-semibold text-content-primary mb-4 border-b pb-2">
                  Detalles del Archivo
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-content-secondary">Folio / Matrícula</span>
                    <span className="text-sm font-mono text-content-primary">
                      {upload.folio ?? 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-content-secondary">Confianza OCR</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${
                        (upload.confidence_score ?? 0) >= 80 ? 'text-success-dark' : 'text-warning-dark'
                      }`}>
                        {upload.confidence_score != null ? `${upload.confidence_score.toFixed(1)}%` : 'N/A'}
                      </span>
                    </div>
                  </div>
                  
                  {upload.validation_observations && (
                    <div className="mt-4 pt-4 border-t border-surface-border">
                      <span className="text-sm text-content-secondary block mb-2">Observaciones del Validador:</span>
                      <div className="bg-surface p-3 rounded text-sm text-content-primary whitespace-pre-wrap">
                        {upload.validation_observations}
                      </div>
                    </div>
                  )}

                  {upload.reason && (
                    <div className="mt-4 pt-4 border-t border-surface-border">
                      <span className="text-sm text-content-secondary block mb-2">Rechazo previo:</span>
                      <div className="bg-danger-light p-3 rounded text-sm text-danger-dark whitespace-pre-wrap">
                        {upload.reason}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white p-5 rounded-card shadow-sm border border-surface-border space-y-4">
                <h3 className="text-sm font-semibold text-content-primary mb-2">
                  Resolución
                </h3>
                
                {actionError && (
                  <div className="p-3 bg-danger-light text-danger-dark rounded text-sm flex gap-2 items-center">
                    <AlertCircle size={16} /> {actionError}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-success hover:bg-success-dark text-white rounded-button font-medium transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Aprobar Documento
                  </button>
                  
                  {!showRejectInput ? (
                    <button
                      onClick={() => setShowRejectInput(true)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-danger-light text-danger-dark hover:bg-danger/20 border border-danger/30 rounded-button font-medium transition-colors"
                    >
                      <XCircle size={16} />
                      Rechazar Documento
                    </button>
                  ) : (
                    <div className="flex-1 flex flex-col gap-2">
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Motivo del rechazo..."
                        className="w-full p-2 border border-surface-border rounded-input text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary-300"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowRejectInput(false)}
                          className="flex-1 py-1.5 bg-surface text-content-secondary rounded-button text-sm hover:bg-surface-hover"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleReject}
                          disabled={actionLoading || !rejectReason.trim()}
                          className="flex-1 py-1.5 bg-danger text-white rounded-button text-sm hover:bg-danger-dark disabled:opacity-50"
                        >
                          {actionLoading ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Confirmar Rechazo'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'preview' && (
            <div className="flex-1 flex flex-col h-full bg-[#323639]">
              {/* Toolbar */}
              <div className="flex items-center justify-center gap-4 p-2 bg-[#202124] text-white">
                <button onClick={() => setZoom(z => Math.max(0.2, z - 0.2))} className="p-1.5 hover:bg-white/10 rounded" title="Reducir">
                  <ZoomOut size={18} />
                </button>
                <span className="text-sm min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="p-1.5 hover:bg-white/10 rounded" title="Aumentar">
                  <ZoomIn size={18} />
                </button>
                <div className="w-px h-4 bg-white/20 mx-2" />
                <button onClick={() => setRotation(r => r - 90)} className="p-1.5 hover:bg-white/10 rounded" title="Rotar Izquierda">
                  <RotateCcw size={18} />
                </button>
                <button onClick={() => setRotation(r => r + 90)} className="p-1.5 hover:bg-white/10 rounded" title="Rotar Derecha">
                  <RotateCw size={18} />
                </button>
              </div>
              
              {/* Viewer Area */}
              <div className="flex-1 overflow-auto flex items-center justify-center p-4">
                {loadingFile ? (
                  <Loader2 size={32} className="animate-spin text-white" />
                ) : errorFile ? (
                  <div className="text-danger-light text-center">
                    <AlertCircle size={24} className="mx-auto mb-2" />
                    <p>{errorFile}</p>
                  </div>
                ) : blobUrl ? (
                  <div 
                    className="transition-transform duration-200 origin-center flex items-center justify-center min-h-full"
                    style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
                  >
                    {isImage ? (
                      <img src={blobUrl} alt="Preview" className="max-w-full max-h-[80vh] object-contain shadow-2xl bg-white" />
                    ) : (
                      <iframe src={`${blobUrl}#toolbar=0`} className="w-[800px] h-[1000px] max-w-[90vw] bg-white shadow-2xl rounded" />
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
