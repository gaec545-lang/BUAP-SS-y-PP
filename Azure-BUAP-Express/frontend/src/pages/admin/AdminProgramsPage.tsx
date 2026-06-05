import { useState, useEffect } from 'react'
import {
   Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2,
   Search, Filter, Building2, Users, BookOpen, ChevronDown, ChevronUp, Briefcase, FileText
 } from 'lucide-react'

import { AdminLayout, AdminPageHeader } from './AdminLayout'
import { adminUploadPrograms, adminUploadProgramsPdf, adminGetPrograms, adminGetProgramStats, adminGetCareers } from '../../services/api'


export function AdminProgramsPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)

  const [pdfFiles, setPdfFiles] = useState<File[]>([])
  const [pdfUploading, setPdfUploading] = useState(false)
  const [pdfUploadResult, setPdfUploadResult] = useState<any>(null)
  const [pdfUploadError, setPdfUploadError] = useState<string | null>(null)
  const [showPdfUpload, setShowPdfUpload] = useState(false)


  const [programs, setPrograms] = useState<any[]>([])
  const [careers, setCareers] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [careerFilter, setCareerFilter] = useState('all')
  const [responsibleFilter, setResponsibleFilter] = useState('all')

  // Column Resizing
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({
    folio: 100,
    name: 350,
    career: 120,
    responsible: 200,
    slots: 120,
    status: 120
  })

  const handleResize = (column: string, startX: number, startWidth: number) => {
    const onMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(80, startWidth + (e.clientX - startX))
      setColumnWidths(prev => ({ ...prev, [column]: newWidth }))
    }
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = 'default'
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    document.body.style.cursor = 'col-resize'
  }

  const loadData = async (cFilter?: string, tFilter?: string) => {
    setLoading(true)
    setError(null)
    try {
      const params: any = {}
      const activeCFilter = cFilter ?? careerFilter
      const activeTFilter = tFilter ?? typeFilter

      if (activeCFilter !== 'all') params.career_code = activeCFilter
      if (activeTFilter !== 'all') params.program_type = activeTFilter

      const [progsRes, statsRes, careersRes] = await Promise.all([
        adminGetPrograms(params),
        adminGetProgramStats(),
        adminGetCareers()
      ])
      setPrograms(progsRes)
      setStats(statsRes)
      setCareers(careersRes)
    } catch (err: any) {
      setError(err.message ?? 'Error al cargar los programas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCareerFilterChange = (code: string) => {
    setCareerFilter(code)
    loadData(code, typeFilter)
  }

  const handleTypeFilterChange = (type: string) => {
    setTypeFilter(type)
    loadData(careerFilter, type)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
      setUploadResult(null)
      setUploadError(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setUploadError(null)
    setUploadResult(null)

    try {
      const res = await adminUploadPrograms(file)
      setUploadResult(res)
      setFile(null)
      // Reload data to reflect new programs
      loadData()
    } catch (err: any) {
      setUploadError(err.message ?? 'Error al subir el archivo.')
    } finally {
      setUploading(false)
    }
  }

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setPdfFiles(Array.from(e.target.files))
      setPdfUploadResult(null)
      setPdfUploadError(null)
    }
  }

  const handlePdfUpload = async () => {
    if (pdfFiles.length === 0) return

    setPdfUploading(true)
    setPdfUploadError(null)
    setPdfUploadResult(null)

    try {
      const res = await adminUploadProgramsPdf(pdfFiles)
      setPdfUploadResult(res)
      setPdfFiles([])
      loadData()
    } catch (err: any) {
      setPdfUploadError(err.message ?? 'Error al subir los PDFs.')
    } finally {
      setPdfUploading(false)
    }
  }


  const filteredPrograms = programs.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
           p.folio.toLowerCase().includes(search.toLowerCase()) ||
           (p.dependency_name && p.dependency_name.toLowerCase().includes(search.toLowerCase())) ||
           (p.responsible_name && p.responsible_name.toLowerCase().includes(search.toLowerCase()))
    
    const matchesResp = responsibleFilter === 'all' || 
                       (responsibleFilter === 'registered' && (p.responsible_name && p.responsible_name.trim() !== "")) ||
                       (responsibleFilter === 'pending' && (!p.responsible_name || p.responsible_name.trim() === ""))

    return matchesSearch && matchesResp
  })

  const totalWidth = Object.values(columnWidths).reduce((a, b) => a + b, 0)

  return (
    <AdminLayout>
      <AdminPageHeader
        breadcrumb={['Admin', 'Programas']}
        title="Gestión de Programas"
        subtitle="Visualiza y actualiza el catálogo de programas de Servicio Social y Práctica Profesional."
      />

      <div className="space-y-6 animate-fade-in">
        
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-card border border-surface-border p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center">
                <BookOpen size={20} className="text-primary-600" />
              </div>
              <div>
                <p className="text-xs text-content-tertiary">Total Programas</p>
                <p className="text-lg font-bold text-content-primary">{stats.total}</p>
              </div>
            </div>
            <div className="bg-white rounded-card border border-surface-border p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-info-light flex items-center justify-center">
                <Users size={20} className="text-info-dark" />
              </div>
              <div>
                <p className="text-xs text-content-tertiary">Servicio Social</p>
                <p className="text-lg font-bold text-content-primary">{stats.servicio_social}</p>
              </div>
            </div>
            <div className="bg-white rounded-card border border-surface-border p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-success-light flex items-center justify-center">
                <Briefcase size={20} className="text-success-dark" />
              </div>
              <div>
                <p className="text-xs text-content-tertiary">Práctica Profesional</p>
                <p className="text-lg font-bold text-content-primary">{stats.practica_profesional}</p>
              </div>
            </div>
            <div className="bg-white rounded-card border border-surface-border p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-warning-light flex items-center justify-center">
                <AlertCircle size={20} className="text-warning-dark" />
              </div>
              <div>
                <p className="text-xs text-content-tertiary">Programas Llenos</p>
                <p className="text-lg font-bold text-content-primary">{stats.full}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white rounded-card border border-surface-border p-4 shadow-sm">
          <div className="flex flex-wrap flex-1 gap-4 w-full">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary" />
              <input
                type="text"
                placeholder="Buscar por nombre, folio o dependencia..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-input border border-surface-border focus:outline-none focus:ring-2 focus:ring-primary-300 transition-all"
              />
            </div>
            
            {/* Career Filter */}
            <div className="relative w-full sm:w-48">
              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary" />
              <select
                value={careerFilter}
                onChange={(e) => handleCareerFilterChange(e.target.value)}
                className="w-full pl-8 pr-8 py-2 text-sm rounded-input border border-surface-border focus:outline-none focus:ring-2 focus:ring-primary-300 appearance-none bg-white"
              >
                <option value="all">Todas las carreras</option>
                {careers.map(c => (
                  <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-content-tertiary">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {/* Type Filter */}
            <div className="relative w-full sm:w-48">
              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary" />
              <select
                value={typeFilter}
                onChange={(e) => handleTypeFilterChange(e.target.value)}
                className="w-full pl-8 pr-8 py-2 text-sm rounded-input border border-surface-border focus:outline-none focus:ring-2 focus:ring-primary-300 appearance-none bg-white"
              >
                <option value="all">Todos los tipos</option>
                <option value="servicio_social">Servicio Social</option>
                <option value="practica_profesional">Práctica Profesional</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-content-tertiary">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {/* Responsible Filter */}
            <div className="relative w-full sm:w-48">
              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary" />
              <select
                value={responsibleFilter}
                onChange={(e) => setResponsibleFilter(e.target.value)}
                className="w-full pl-8 pr-8 py-2 text-sm rounded-input border border-surface-border focus:outline-none focus:ring-2 focus:ring-primary-300 appearance-none bg-white font-medium"
              >
                <option value="all">Todos (Resp.)</option>
                <option value="registered">Con Responsable</option>
                <option value="pending">Pendientes</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-content-tertiary">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-2 px-4 py-2 bg-surface text-content-primary hover:bg-surface-hover text-sm font-medium rounded-button border border-surface-border transition-colors duration-150 w-full sm:w-auto"
          >
            <Upload size={16} className="text-primary-600" />
            {showUpload ? 'Ocultar carga' : 'Subir Excel'}
            {showUpload ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
              <button
            onClick={() => setShowPdfUpload(!showPdfUpload)}
            className="flex items-center gap-2 px-4 py-2 bg-surface text-content-primary hover:bg-surface-hover text-sm font-medium rounded-button border border-surface-border transition-colors duration-150 w-full sm:w-auto"
          >
            <Upload size={16} className="text-primary-600" />
            {showPdfUpload ? 'Ocultar PDF' : 'Subir PDF (Responsables)'}
            {showPdfUpload ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>


        {/* Upload Section (Toggleable) */}
        {showUpload && (
          <div className="bg-white rounded-card border border-surface-border shadow-card p-6 max-w-3xl animate-slide-up">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                <FileSpreadsheet size={24} className="text-primary-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold text-content-primary mb-1">Carga de archivo Excel</h2>
                <p className="text-sm text-content-secondary mb-4">
                  Selecciona el archivo proporcionado por la coordinación con los folios aceptados.
                </p>

                <div className="border-2 border-dashed border-surface-border rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-surface transition-colors duration-150">
                  <input
                    type="file"
                    id="file-upload"
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                    <Upload size={24} className="text-content-tertiary mb-2" />
                    <span className="text-sm font-medium text-primary-600 hover:text-primary-700">
                      Haz clic para seleccionar un archivo
                    </span>
                    <span className="text-xs text-content-tertiary mt-1">
                      XLSX, XLS o CSV
                    </span>
                  </label>
                  
                  {file && (
                    <div className="mt-4 px-3 py-1.5 bg-primary-50 text-primary-700 text-xs font-medium rounded-badge inline-flex items-center gap-2">
                      <FileSpreadsheet size={14} />
                      {file.name}
                    </div>
                  )}
                </div>

                {uploadError && (
                  <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-danger-light border border-danger/20">
                    <AlertCircle size={16} className="text-danger flex-shrink-0" />
                    <p className="text-sm text-danger-dark">{uploadError}</p>
                  </div>
                )}

                {uploadResult && (
                  <div className="mt-4 flex flex-col gap-2 p-4 rounded-lg bg-success-light border border-success/20">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-success" />
                      <p className="text-sm font-semibold text-success-dark">
                        Archivo procesado correctamente
                      </p>
                    </div>
                    <ul className="text-xs text-success-dark ml-6 space-y-1 list-disc">
                      <li>Filas procesadas: {uploadResult.processed}</li>
                      <li>Programas nuevos: {uploadResult.created}</li>
                      <li>Programas actualizados: {uploadResult.updated}</li>
                    </ul>
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 text-white text-sm font-medium rounded-button transition-colors duration-150"
                  >
                    {uploading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Upload size={16} />
                        Subir programas
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PDF Upload Section (Toggleable) */}
        {showPdfUpload && (
          <div className="bg-white rounded-card border border-surface-border shadow-card p-6 max-w-3xl animate-slide-up">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                <Upload size={24} className="text-primary-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold text-content-primary mb-1">Carga de PDF (Responsables)</h2>
                <p className="text-sm text-content-secondary mb-4">
                  Sube el PDF de la coordinación que contiene los Nombres y Cargos de los responsables por cada folio.
                </p>

                <div className="border-2 border-dashed border-primary-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-primary-50 transition-colors duration-150 bg-gray-50/50">
                  <input
                    type="file"
                    id="pdf-upload"
                    accept=".pdf"
                    multiple
                    className="hidden"
                    onChange={handlePdfFileChange}
                  />
                  {pdfFiles.length === 0 ? (
                    <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mb-4 text-primary-600">
                        <Upload size={32} />
                      </div>
                      <span className="text-base font-bold text-primary-700 hover:text-primary-800">
                        Haz clic para seleccionar uno o varios PDFs
                      </span>
                      <span className="text-sm text-content-tertiary mt-2">
                        El archivo debe contener folios, nombres y cargos.
                      </span>
                    </label>
                  ) : (
                    <div className="flex flex-col items-center animate-bounce-in w-full max-h-48 overflow-y-auto px-4">
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3 text-green-600">
                        <FileText size={24} />
                      </div>
                      <span className="text-sm font-bold text-gray-800 mb-2">
                        {pdfFiles.length === 1 ? '1 archivo seleccionado' : `${pdfFiles.length} archivos seleccionados`}
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                        {pdfFiles.map((f, i) => (
                          <div key={i} className="text-[10px] bg-white border border-gray-200 rounded p-1 truncate flex items-center gap-1">
                            <FileText size={10} className="text-gray-400" />
                            {f.name}
                          </div>
                        ))}
                      </div>
                      <button 
                        onClick={() => setPdfFiles([])}
                        className="mt-3 text-xs text-danger hover:underline font-medium"
                      >
                        Limpiar selección
                      </button>
                    </div>
                  )}
                </div>


                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-gray-100 pt-6">
                  <div className="flex-1 w-full">
                    {pdfUploading && (
                      <div className="flex flex-col gap-2.5 p-4 rounded-xl bg-primary-50 border border-primary-100 animate-pulse w-full">
                        <div className="flex items-center gap-3">
                          <Loader2 size={18} className="text-primary-600 animate-spin flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs font-bold text-primary-850">Procesando y parseando PDFs...</p>
                            <p className="text-[10px] text-primary-600">Extrayendo folios, nombres y cargos de responsables en segundo plano.</p>
                          </div>
                        </div>
                        <div className="h-1.5 w-full bg-primary-200/50 rounded-full overflow-hidden">
                          <div className="h-full bg-primary-600 rounded-full animate-pulse" style={{ width: '70%' }} />
                        </div>
                      </div>
                    )}
                    {pdfUploadError && (
                      <div className="flex items-start gap-3 p-4 rounded-xl bg-danger-light border border-danger/20 animate-shake">
                        <AlertCircle size={20} className="text-danger flex-shrink-0" />
                        <p className="text-sm text-danger-dark font-semibold leading-snug">{pdfUploadError}</p>
                      </div>
                    )}
                    {pdfUploadResult && (
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-success-light border border-success/20 animate-fade-in">
                        <CheckCircle2 size={20} className="text-success flex-shrink-0" />
                        <p className="text-sm font-bold text-success-dark">
                          ¡Éxito! Se actualizaron {pdfUploadResult.updated_count} programas.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={handlePdfUpload}
                    disabled={pdfFiles.length === 0 || pdfUploading}
                    className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 text-white text-sm font-medium rounded-lg shadow-md transition-all transform hover:scale-102 active:scale-98 whitespace-nowrap"
                  >
                    {pdfUploading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Upload size={16} />
                        Actualizar Responsables
                      </>
                    )}
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}


        {/* Table */}
        <div className="bg-white rounded-card border border-surface-border shadow-card overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-content-tertiary">
              <Loader2 size={32} className="animate-spin mb-4 text-primary-500" />
              <p className="text-sm">Cargando programas...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20">
              <AlertCircle size={32} className="text-danger mb-4" />
              <p className="text-sm text-danger-dark">{error}</p>
            </div>
          ) : filteredPrograms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mb-4">
                <Search size={24} className="text-content-tertiary" />
              </div>
              <h3 className="text-base font-semibold text-content-primary mb-1">
                No hay resultados
              </h3>
              <p className="text-sm text-content-secondary max-w-sm">
                No se encontraron programas que coincidan con tu búsqueda o filtros.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border-t border-surface-border max-h-[700px] overflow-y-auto">
              <table 
                className="text-left text-sm"
                style={{ width: '100%', minWidth: totalWidth, tableLayout: 'fixed' }}
              >
                <thead className="bg-surface text-content-secondary border-b border-surface-border select-none sticky top-0 z-20 shadow-sm">
                  <tr className="bg-surface">
                    <th 
                      className="px-6 py-3 font-medium relative select-none bg-surface"
                      style={{ width: columnWidths.folio, minWidth: columnWidths.folio }}
                    >
                      <div className="flex items-center">Folio</div>
                      <div 
                        onMouseDown={(e) => handleResize('folio', e.clientX, columnWidths.folio)}
                        className="absolute right-0 top-0 bottom-0 w-4 cursor-col-resize group flex justify-center items-center z-10"
                        title="Arrastra para ajustar"
                      >
                        <div className="w-[2px] h-4 bg-transparent group-hover:bg-primary-300 transition-colors" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 font-medium relative select-none bg-surface"
                      style={{ width: columnWidths.name, minWidth: columnWidths.name }}
                    >
                      <div className="flex items-center">Programa</div>
                      <div 
                        onMouseDown={(e) => handleResize('name', e.clientX, columnWidths.name)}
                        className="absolute right-0 top-0 bottom-0 w-4 cursor-col-resize group flex justify-center items-center z-10"
                        title="Arrastra para ajustar"
                      >
                        <div className="w-[2px] h-4 bg-transparent group-hover:bg-primary-300 transition-colors" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 font-medium relative select-none bg-surface"
                      style={{ width: columnWidths.career, minWidth: columnWidths.career }}
                    >
                      <div className="flex items-center">Carrera</div>
                      <div 
                        onMouseDown={(e) => handleResize('career', e.clientX, columnWidths.career)}
                        className="absolute right-0 top-0 bottom-0 w-4 cursor-col-resize group flex justify-center items-center z-10"
                        title="Arrastra para ajustar"
                      >
                        <div className="w-[2px] h-4 bg-transparent group-hover:bg-primary-300 transition-colors" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 font-medium relative select-none bg-surface"
                      style={{ width: columnWidths.responsible, minWidth: columnWidths.responsible }}
                    >
                      <div className="flex items-center">Responsable</div>
                      <div 
                        onMouseDown={(e) => handleResize('responsible', e.clientX, columnWidths.responsible)}
                        className="absolute right-0 top-0 bottom-0 w-4 cursor-col-resize group flex justify-center items-center z-10"
                        title="Arrastra para ajustar"
                      >
                        <div className="w-[2px] h-4 bg-transparent group-hover:bg-primary-300 transition-colors" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 font-medium relative select-none bg-surface"
                      style={{ width: columnWidths.slots, minWidth: columnWidths.slots }}
                    >
                      <div className="flex items-center">Cupo</div>
                      <div 
                        onMouseDown={(e) => handleResize('slots', e.clientX, columnWidths.slots)}
                        className="absolute right-0 top-0 bottom-0 w-4 cursor-col-resize group flex justify-center items-center z-10"
                        title="Arrastra para ajustar"
                      >
                        <div className="w-[2px] h-4 bg-transparent group-hover:bg-primary-300 transition-colors" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 font-medium relative select-none bg-surface"
                      style={{ width: columnWidths.status, minWidth: columnWidths.status }}
                    >
                      <div className="flex items-center">Estado</div>
                      <div 
                        onMouseDown={(e) => handleResize('status', e.clientX, columnWidths.status)}
                        className="absolute right-0 top-0 bottom-0 w-4 cursor-col-resize group flex justify-center items-center z-10"
                        title="Arrastra para ajustar"
                      >
                        <div className="w-[2px] h-4 bg-transparent group-hover:bg-primary-300 transition-colors" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {filteredPrograms.map((p) => {
                    const isFull = p.is_full || p.used_slots >= p.max_slots
                    const utilization = p.max_slots > 0 ? (p.used_slots / p.max_slots) * 100 : 0
                    
                    return (
                      <tr key={p.id} className="hover:bg-surface-hover transition-colors duration-150">
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs font-medium text-primary-700 bg-primary-50 px-2 py-1 rounded-md border border-primary-100">
                            {p.folio}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-content-primary line-clamp-1" title={p.name}>
                              {p.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                                p.program_type === 'servicio_social' ? 'bg-info-light text-info-dark' : 'bg-success-light text-success-dark'
                              }`}>
                                {p.program_type === 'servicio_social' ? 'SS' : 'PP'}
                              </span>
                              <span className="text-xs text-content-tertiary flex items-center gap-1 line-clamp-1" title={p.dependency_name}>
                                <Building2 size={12} />
                                {p.dependency_name}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {p.career ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-surface rounded text-xs text-content-secondary font-medium border border-surface-border" title={p.career.name}>
                              {p.career.code}
                            </span>
                          ) : (
                            <span className="text-xs text-content-tertiary italic">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {p.responsible_name ? (
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-content-primary line-clamp-1">{p.responsible_name}</span>
                              <span className="text-[10px] text-content-tertiary line-clamp-1">{p.responsible_position}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-danger-dark font-medium bg-danger-light px-1.5 py-0.5 rounded">Pendiente</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5 w-24">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-content-primary">{p.used_slots}</span>
                              <span className="text-content-tertiary">/ {p.max_slots}</span>
                            </div>
                            <div className="h-1.5 w-full bg-surface-border rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  isFull ? 'bg-danger' : 
                                  utilization > 80 ? 'bg-warning' : 'bg-success'
                                }`}
                                style={{ width: `${Math.min(utilization, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {isFull ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-badge text-xs font-medium bg-danger-light text-danger-dark border border-danger/20">
                              <AlertCircle size={12} />
                              Lleno
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-badge text-xs font-medium bg-success-light text-success-dark border border-success/20">
                              <CheckCircle2 size={12} />
                              Disponible
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
