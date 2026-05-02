import { useState, useRef } from 'react'
import { CheckCircle, FileText, Upload, AlertCircle } from 'lucide-react'
import { submitUpload } from '../services/api'

interface UploadDocumentProps {
  documentTypeCode: string
  documentTypeName?: string
  processCode: string
  stepNumber: number
  onUploadSuccess?: () => void
}

export function UploadDocument({
  documentTypeCode,
  documentTypeName,
  processCode,
  stepNumber,
  onUploadSuccess,
}: UploadDocumentProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext ?? '')) {
      setError('Solo se permiten archivos PDF, JPG o PNG')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo no puede exceder 10MB')
      return
    }
    setSelectedFile(file)
    setError(null)
    setSuccess(false)
  }

  async function handleSubmit() {
    if (!selectedFile) return
    setUploading(true)
    setError(null)
    try {
      await submitUpload(selectedFile, documentTypeCode, processCode, stepNumber)
      setSuccess(true)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      onUploadSuccess?.()
    } catch (err: any) {
      setError(err.message ?? 'Error al subir el archivo')
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) {
      const fakeEvent = { target: { files: [file] } } as any
      handleFileSelect(fakeEvent)
    }
  }

  if (success) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-success-light rounded-lg border border-success/20">
        <CheckCircle size={14} className="text-success flex-shrink-0" />
        <p className="text-xs text-success-dark font-medium">
          En revisión
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {documentTypeName && (
        <p className="text-xs font-medium text-content-secondary">{documentTypeName}</p>
      )}

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-surface-divider rounded-lg p-4 text-center cursor-pointer
                   hover:border-primary-300 hover:bg-primary-50 transition-colors duration-150"
      >
        {selectedFile ? (
          <div className="flex items-center justify-center gap-2">
            <FileText size={16} className="text-primary-600" />
            <span className="text-sm text-content-primary font-medium">{selectedFile.name}</span>
            <span className="text-xs text-content-tertiary">
              ({(selectedFile.size / 1024).toFixed(0)} KB)
            </span>
          </div>
        ) : (
          <div>
            <Upload size={20} className="mx-auto text-content-tertiary mb-1.5" />
            <p className="text-sm text-content-secondary">
              Arrastra tu archivo aquí o{' '}
              <span className="text-primary-600 font-medium">selecciona</span>
            </p>
            <p className="text-xs text-content-tertiary mt-1">PDF, JPG o PNG · máx 10MB</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 p-2.5 bg-danger-light rounded-lg border border-danger/20">
          <AlertCircle size={12} className="text-danger flex-shrink-0 mt-0.5" />
          <p className="text-xs text-danger-dark">{error}</p>
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!selectedFile || uploading}
        className="w-full flex items-center justify-center gap-2 py-2 px-4
                   bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300
                   text-white text-sm font-medium rounded-button
                   transition-colors duration-150 disabled:cursor-not-allowed"
      >
        {uploading ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Subiendo...
          </>
        ) : (
          <>
            <Upload size={14} />
            Subir documento
          </>
        )}
      </button>
    </div>
  )
}
