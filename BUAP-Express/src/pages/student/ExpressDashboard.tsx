import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  User,
  LogOut,
  X,
  Search,
  ShieldAlert,
  Download
} from 'lucide-react'
import { useStudent } from '../../context/StudentContext'
import { BuapLogo } from '../../components/BuapLogo'
import { PoweredBy } from '../../components/PoweredBy'
import { generateDocument, getProgramByFolio } from '../../services/api'

export function ExpressDashboard() {
  const { student, logout } = useStudent()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<'cpa' | 'confidencialidad' | 'folio' | 'compromiso' | null>(null)

  // Forms State
  const [folioInput, setFolioInput] = useState('')
  const [addressedTo, setAddressedTo] = useState('')
  const [serviceType, setServiceType] = useState<'SS' | 'PP'>('SS')
  const [phone, setPhone] = useState('')
  const [period, setPeriod] = useState('')
  const [yearDigit, setYearDigit] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Folio Search State
  const [searchResult, setSearchResult] = useState<any>(null)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const handleGenerateCPA = async () => {
    if (!folioInput.trim()) {
      setError('El folio es requerido para el CPA.')
      return
    }
    setLoading(true)
    setError('')
    try {
      // Use 'cpa_ss' or 'cpa_pp' to help the backend decide the template
      const typeCode = serviceType === 'SS' ? 'cpa_ss' : 'cpa_pp'
      await generateDocument(
        typeCode, 
        'express_generation', 
        1, 
        addressedTo.trim() || undefined, 
        folioInput.trim()
      )
    } catch (err: any) {
      setError(err.message || 'Error al generar el CPA.')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateConfidencialidad = async () => {
    setLoading(true)
    setError('')
    try {
      await generateDocument('carta_confidencialidad', 'express_generation', 1, '', folioInput.trim() || undefined)
    } catch (err: any) {
      setError(err.message || 'Error al generar Carta de Confidencialidad.')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateCompromiso = async () => {
    if (!phone.trim() || !period.trim() || !yearDigit.trim()) {
      setError('Todos los campos son obligatorios para la Carta Compromiso.')
      return
    }
    setLoading(true)
    setError('')
    try {
      // Pass extra fields as query params (assumed supported by generateDocument)
      await generateDocument(
        'carta_compromiso', 
        'express_generation', 
        1, 
        '', 
        undefined, 
        phone.trim(), 
        period.trim(), 
        yearDigit.trim()
      )
    } catch (err: any) {
      setError(err.message || 'Error al generar Carta Compromiso.')
    } finally {
      setLoading(false)
    }
  }

  const handleSearchFolio = async () => {
    if (!folioInput.trim()) return
    setLoading(true)
    setError('')
    setSearchResult(null)
    try {
      const res = await getProgramByFolio(folioInput)
      setSearchResult(res)
    } catch (err: any) {
      setError(err.message || 'Folio no encontrado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-4">
          <BuapLogo className="h-10 w-auto" />
          <div className="hidden sm:block border-l border-gray-200 h-8 mx-2"></div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-gray-800 leading-tight">Portal de Trámites y Folios SS y PP</h1>
            <p className="text-xs text-gray-500">Gestión Express de Alumnos</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end mr-2">
            <span className="text-sm font-semibold text-gray-800">{student?.first_name}</span>
            <span className="text-xs text-gray-500">{student?.matricula}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="w-10 h-10 rounded-full bg-gray-50 text-gray-600 flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-10 flex flex-col">
        {/* Welcome */}
        <div className="mb-10 text-center animate-fade-in">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Hola, {student?.first_name}</h2>
          <p className="text-gray-600 text-lg">
            Generación de documentos y consulta de programas
          </p>
        </div>

        {/* Action Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full animate-fade-in">
          
          {/* CPA Block */}
          <button 
            onClick={() => { setActiveTab('cpa'); setError(''); setFolioInput(''); setAddressedTo(''); setServiceType('SS'); }}
            className={`text-left bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group ${activeTab === 'cpa' ? 'ring-2 ring-blue-500' : ''}`}
          >
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
              <FileText size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Generar CPA</h3>
            <p className="text-xs text-gray-500 leading-relaxed">Carta de Presentación y Aceptación.</p>
          </button>

          {/* Confidencialidad Block */}
          <button 
            onClick={() => { setActiveTab('confidencialidad'); setError(''); setFolioInput(''); }}
            className={`text-left bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-purple-300 transition-all group ${activeTab === 'confidencialidad' ? 'ring-2 ring-purple-500' : ''}`}
          >
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:bg-purple-100 transition-colors">
              <ShieldAlert size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Carta de Confidencialidad</h3>
            <p className="text-xs text-gray-500 leading-relaxed">Protección de datos institucionales.</p>
          </button>

          {/* Compromiso Block */}
          <button 
            onClick={() => { setActiveTab('compromiso'); setError(''); setPhone(''); setPeriod(''); setYearDigit(''); }}
            className={`text-left bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-orange-300 transition-all group ${activeTab === 'compromiso' ? 'ring-2 ring-orange-500' : ''}`}
          >
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4 group-hover:bg-orange-100 transition-colors">
              <FileText size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Carta Compromiso</h3>
            <p className="text-xs text-gray-500 leading-relaxed">Responsabilidades del estudiante.</p>
          </button>

          {/* Folio Search Block */}
          <button 
            onClick={() => { setActiveTab('folio'); setError(''); setFolioInput(''); setSearchResult(null); }}
            className={`lg:col-span-3 text-left bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-green-300 transition-all group flex items-center justify-between ${activeTab === 'folio' ? 'ring-2 ring-green-500' : ''}`}
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center mb-4 group-hover:bg-green-100 transition-colors">
                <Search size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-1">Consultar Folio</h3>
              <p className="text-sm text-gray-500">Verifica cupos y detalles de un programa.</p>
            </div>
          </button>
        </div>

        {/* Expanded Form Area */}
        <AnimatePresence mode="wait">
          {activeTab && (
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-8 bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden"
            >
              <button 
                onClick={() => setActiveTab(null)} 
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>

              {activeTab === 'cpa' && (
                <div className="max-w-md mx-auto">
                  <h4 className="text-2xl font-bold text-gray-800 mb-6 text-center">Generar CPA</h4>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-2 rounded-xl border border-gray-100">
                      <button
                        onClick={() => setServiceType('SS')}
                        className={`py-2 rounded-lg font-bold transition-all ${serviceType === 'SS' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                      >
                        Servicio Social
                      </button>
                      <button
                        onClick={() => setServiceType('PP')}
                        className={`py-2 rounded-lg font-bold transition-all ${serviceType === 'PP' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                      >
                        Práctica Prof.
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Folio del Programa *</label>
                      <input 
                        type="text" 
                        value={folioInput}
                        onChange={e => setFolioInput(e.target.value)}
                        placeholder="Ej. SS-24-001"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Dirigido a (Nombre) *</label>
                      <input 
                        type="text" 
                        value={addressedTo}
                        onChange={e => setAddressedTo(e.target.value)}
                        placeholder="Ej. Lic. Juan Pérez López"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">Escribe el nombre de la persona a quien va dirigido el nombramiento.</p>
                    </div>

                    {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

                    <button 
                      onClick={handleGenerateCPA}
                      disabled={loading}
                      className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 mt-4"
                    >
                      {loading ? 'Generando...' : <><Download size={20} /> Generar Documento</>}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'confidencialidad' && (
                <div className="max-w-md mx-auto">
                  <h4 className="text-2xl font-bold text-gray-800 mb-6 text-center">Carta de Confidencialidad</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Folio del Programa (Opcional)</label>
                      <input 
                        type="text" 
                        value={folioInput}
                        onChange={e => setFolioInput(e.target.value)}
                        placeholder="Ej. SS-24-001"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>

                    {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

                    <button 
                      onClick={handleGenerateConfidencialidad}
                      disabled={loading}
                      className="w-full flex justify-center items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 mt-4"
                    >
                      {loading ? 'Generando...' : <><Download size={20} /> Generar Carta</>}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'compromiso' && (
                <div className="max-w-md mx-auto">
                  <h4 className="text-2xl font-bold text-gray-800 mb-6 text-center">Carta Compromiso</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Número de Teléfono *</label>
                      <input 
                        type="tel" 
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="2221234567"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Periodo *</label>
                        <select 
                          value={period}
                          onChange={e => setPeriod(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
                        >
                          <option value="">Selecciona...</option>
                          <option value="PRIMAVERA">PRIMAVERA</option>
                          <option value="VERANO">VERANO</option>
                          <option value="OTOÑO">OTOÑO</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Año *</label>
                        <input 
                          type="text" 
                          value={yearDigit}
                          onChange={e => setYearDigit(e.target.value)}
                          placeholder="Ej. 2026"
                          maxLength={4}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 outline-none text-center"
                        />
                      </div>
                    </div>

                    {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

                    <button 
                      onClick={handleGenerateCompromiso}
                      disabled={loading}
                      className="w-full flex justify-center items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 mt-4"
                    >
                      {loading ? 'Generando...' : <><Download size={20} /> Generar Carta Compromiso</>}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'folio' && (
                <div className="max-w-xl mx-auto">
                  <h4 className="text-2xl font-bold text-gray-800 mb-6 text-center">Consultar Folio</h4>
                  
                  <div className="flex gap-2 mb-6">
                    <input 
                      type="text" 
                      value={folioInput}
                      onChange={e => setFolioInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearchFolio()}
                      placeholder="Ej. SS-24-001"
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 outline-none"
                    />
                    <button 
                      onClick={handleSearchFolio}
                      disabled={loading}
                      className="px-6 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 flex justify-center items-center"
                    >
                      {loading ? '...' : <Search size={20} />}
                    </button>
                  </div>

                  {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm mb-4 text-center">{error}</div>}

                  {searchResult && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 animate-fade-in">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="inline-block px-2.5 py-1 bg-green-100 text-green-800 text-xs font-bold rounded mb-2">
                            {searchResult.program_type === 'servicio_social' ? 'Servicio Social' : 'Práctica Profesional'}
                          </span>
                          <h5 className="text-lg font-bold text-gray-800">{searchResult.name}</h5>
                          <p className="text-sm text-gray-600">{searchResult.dependency_name}</p>
                        </div>
                        <span className="text-sm font-mono text-gray-500 bg-gray-200 px-2 py-1 rounded">
                          {searchResult.folio}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                        <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm text-center">
                          <p className="text-xs text-gray-500 font-semibold uppercase">Cupo Total</p>
                          <p className="text-xl font-bold text-gray-800">{searchResult.availability?.max_slots ?? searchResult.max_slots}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm text-center">
                          <p className="text-xs text-gray-500 font-semibold uppercase">Lugares Disponibles</p>
                          <p className={`text-xl font-bold ${searchResult.availability?.available_slots === 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {searchResult.availability?.available_slots ?? '?'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-auto border-t border-gray-200 bg-white py-6">
        <div className="max-w-4xl mx-auto px-6 text-center text-sm text-gray-500">
          Plataforma Express - Coordinación de Prácticas Profesionales y Servicio Social
        </div>
      </footer>
      <PoweredBy />
    </div>
  )
}
