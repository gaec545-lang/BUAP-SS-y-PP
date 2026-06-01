import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  LogOut,
  X,
  Search,
  ShieldAlert,
  Download,
  ShieldCheck
} from 'lucide-react'
import { useStudent } from '../../context/StudentContext'
import { BuapLogo } from '../../components/BuapLogo'
import { PoweredBy } from '../../components/PoweredBy'
import { SplitText } from '../../components/SplitText'
import { Dock } from '../../components/Dock'
import { ThemeToggle } from '../../components/ThemeToggle'
import { ValidatorView } from './ValidatorView'
import { generateDocument, getProgramByFolio } from '../../services/api'

export function ExpressDashboard() {
  const { student, logout } = useStudent()
  const navigate = useNavigate()

  const [currentTab, setCurrentTab] = useState<'home' | 'generate' | 'validate'>('home')
  const [activeTab, setActiveTab] = useState<'cpa' | 'confidencialidad' | 'folio' | 'compromiso' | null>(null)

  // Forms State (Generate)
  const [folioInput, setFolioInput] = useState('')
  const [addressedTo, setAddressedTo] = useState('')
  const [serviceType, setServiceType] = useState<'SS' | 'PP'>('SS')
  const [phone, setPhone] = useState('')
  const [period, setPeriod] = useState('')
  const [yearDigit, setYearDigit] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchResult, setSearchResult] = useState<any>(null)


  const handleLogout = () => {
    logout()
    navigate('/')
  }

  // Document Generation Handlers
  const handleGenerateCPA = async () => {
    if (!folioInput.trim()) {
      setError('El folio es requerido para el CPA.')
      return
    }
    setLoading(true)
    setError('')
    try {
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
      await generateDocument(
        'carta_compromiso',
        'express_generation',
        1,
        '',
        folioInput.trim() || undefined,
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
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 flex flex-col font-sans transition-colors duration-300">

      {/* Header */}
      <header className="border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md transition-colors shadow-sm">
        <div className="flex items-center gap-4">
          <BuapLogo className="h-10 w-auto" />
          <div className="hidden sm:block border-l border-gray-200 dark:border-gray-800 h-8 mx-2"></div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-tight">Portal de Trámites y Folios SS y PP</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Gestión Express de Alumnos</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end mr-2">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{student?.full_name}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{student?.matricula}</span>
          </div>

          {/* Dark Mode Switcher */}
          <ThemeToggle />

          <button 
            onClick={handleLogout}
            className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-all border border-gray-100 dark:border-gray-850"
            title="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-12 flex flex-col justify-start">
        
        <AnimatePresence mode="wait">
          
          {/* TAB 1: HOME (Welcome View) */}
          {currentTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col items-center justify-center text-center my-6"
            >
              {/* Animated Welcome Title */}
              <div className="mb-2 bg-white px-8 py-4 rounded-3xl shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
                <SplitText 
                  text={`Hola, bienvenido ${student?.first_name || ''}`} 
                  className="text-4xl sm:text-5xl font-extrabold tracking-tight text-black dark:text-white"
                />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-lg sm:text-xl font-medium mb-12 animate-fade-in">
                Escoge la opción que corresponde.
              </p>

              {/* Glassmorphic Cards Container */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl px-2">
                
                {/* Generar Documentos Card */}
                <motion.div
                  whileHover={{ scale: 1.03, y: -4 }}
                  onClick={() => setCurrentTab('generate')}
                  className="relative group cursor-pointer bg-white/40 dark:bg-[#1a1721]/30 backdrop-blur-xl border border-gray-250/20 dark:border-white/5 rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:border-blue-400/40 dark:hover:border-indigo-500/40 transition-all duration-300 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform">
                    <FileText size={28} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Generar Documentos
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    Crea tus cartas de presentación, asignación y confidencialidad en PDF de forma instantánea ingresando tus folios.
                  </p>
                </motion.div>

                {/* Validar Documentos Card */}
                <motion.div
                  whileHover={{ scale: 1.03, y: -4 }}
                  onClick={() => setCurrentTab('validate')}
                  className="relative group cursor-pointer bg-white/40 dark:bg-[#1a1721]/30 backdrop-blur-xl border border-gray-250/20 dark:border-white/5 rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:border-purple-400/40 dark:hover:border-purple-500/40 transition-all duration-300 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform">
                    <ShieldCheck size={28} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    Validar Documentos
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    Audita tus archivos PDF firmados y sellados con Inteligencia Artificial. Verificamos firmas autógrafas y datos al instante.
                  </p>
                </motion.div>
                
              </div>
            </motion.div>
          )}

          {/* TAB 2: GENERATE (Document Generation Forms) */}
          {currentTab === 'generate' && (
            <motion.div
              key="generate"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full flex flex-col"
            >
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">Generación de Documentos</h2>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Completa los campos para expedir tus formatos en PDF.</p>
                </div>
                <button 
                  onClick={() => setCurrentTab('home')}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition-all"
                >
                  Volver al inicio
                </button>
              </div>

              {/* Action grid (CPA, Confidencialidad, Compromiso, Consulta Folio) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mb-8">
                <button 
                  onClick={() => { setActiveTab('cpa'); setError(''); setFolioInput(''); setAddressedTo(''); setServiceType('SS'); }}
                  className={`text-left bg-white dark:bg-[#15121b] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-900 transition-all group ${activeTab === 'cpa' ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                    <FileText size={22} />
                  </div>
                  <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-1">Generar CPA</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">Carta de Presentación y Aceptación.</p>
                </button>

                <button 
                  onClick={() => { setActiveTab('confidencialidad'); setError(''); setFolioInput(''); }}
                  className={`text-left bg-white dark:bg-[#15121b] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-purple-300 dark:hover:border-purple-900 transition-all group ${activeTab === 'confidencialidad' ? 'ring-2 ring-purple-500' : ''}`}
                >
                  <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/40 transition-colors">
                    <ShieldAlert size={22} />
                  </div>
                  <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-1">Carta de Confidencialidad</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">Protección de datos institucionales.</p>
                </button>

                <button 
                  onClick={() => { setActiveTab('compromiso'); setError(''); setFolioInput(''); setPhone(''); setPeriod(''); setYearDigit(''); }}
                  className={`text-left bg-white dark:bg-[#15121b] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-orange-300 dark:hover:border-orange-900 transition-all group ${activeTab === 'compromiso' ? 'ring-2 ring-orange-500' : ''}`}
                >
                  <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-4 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/40 transition-colors">
                    <FileText size={22} />
                  </div>
                  <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-1">Carta Compromiso</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">Responsabilidades del estudiante.</p>
                </button>

                <button 
                  onClick={() => { setActiveTab('folio'); setError(''); setFolioInput(''); setSearchResult(null); }}
                  className={`lg:col-span-3 text-left bg-white dark:bg-[#15121b] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-green-300 dark:hover:border-green-900 transition-all group flex items-center justify-between ${activeTab === 'folio' ? 'ring-2 ring-green-500' : ''}`}
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 flex items-center justify-center mb-2 group-hover:bg-green-100 dark:group-hover:bg-green-900/40 transition-colors">
                      <Search size={22} />
                    </div>
                    <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-1">Consultar Folio</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Verifica cupos y detalles de un programa de SS o PP.</p>
                  </div>
                </button>
              </div>

              {/* Forms Panel */}
              <AnimatePresence mode="wait">
                {activeTab && (
                  <motion.div 
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-white dark:bg-[#120f17] border border-gray-250/30 dark:border-gray-800 rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden"
                  >
                    <button 
                      onClick={() => setActiveTab(null)} 
                      className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 bg-gray-50 dark:bg-gray-900 rounded-full transition-colors"
                    >
                      <X size={18} />
                    </button>

                    {activeTab === 'cpa' && (
                      <div className="max-w-md mx-auto">
                        <h4 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 text-center">Generar CPA</h4>
                        
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-900 p-2 rounded-xl border border-gray-100 dark:border-gray-800">
                            <button
                              onClick={() => setServiceType('SS')}
                              className={`py-2 rounded-lg font-bold transition-all text-xs ${serviceType === 'SS' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
                            >
                              Servicio Social
                            </button>
                            <button
                              onClick={() => setServiceType('PP')}
                              className={`py-2 rounded-lg font-bold transition-all text-xs ${serviceType === 'PP' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
                            >
                              Práctica Prof.
                            </button>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">Folio del Programa *</label>
                            <div className="flex gap-2">
                              <input 
                                type="text" 
                                value={folioInput}
                                onChange={e => { setFolioInput(e.target.value); setSearchResult(null); }}
                                placeholder="Ej. SS-24-001"
                                className="flex-1 border border-gray-350 dark:border-gray-800 bg-transparent rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                              <button 
                                onClick={handleSearchFolio}
                                disabled={loading || !folioInput.trim()}
                                className="px-4 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-850 text-gray-600 dark:text-gray-400 rounded-lg transition-colors border border-gray-300 dark:border-gray-800"
                              >
                                {loading ? '...' : <Search size={16} />}
                              </button>
                            </div>
                          </div>

                          {searchResult && (
                            <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl animate-fade-in text-left">
                              <p className="text-xs font-bold text-blue-800 dark:text-blue-400">{searchResult.name}</p>
                              <p className="text-[10px] text-blue-600 dark:text-blue-500 font-medium">{searchResult.dependency_name}</p>
                              
                              {(searchResult.responsible_name && searchResult.responsible_position) ? (
                                <div className="mt-2 p-2 bg-green-55/30 dark:bg-green-950/20 border border-green-100 dark:border-green-900/40 rounded text-[10px] text-green-700 dark:text-green-400 font-semibold">
                                  <strong>Responsable:</strong> {searchResult.responsible_name} ({searchResult.responsible_position})
                                </div>
                              ) : (
                                <div className="mt-3 pt-3 border-t border-blue-100 dark:border-blue-900/40">
                                  <label className="block text-[11px] font-bold text-amber-700 dark:text-amber-500 mb-1 flex items-center gap-1">
                                    <ShieldAlert size={12} /> Datos del responsable no encontrados. Ingresa el remitente:
                                  </label>
                                  <input 
                                    type="text" 
                                    value={addressedTo}
                                    onChange={e => setAddressedTo(e.target.value)}
                                    placeholder="Nombre y cargo a quien se dirige"
                                    className="w-full border border-amber-200 dark:border-amber-900/40 bg-white dark:bg-[#120f17] rounded-md px-3 py-1.5 text-xs focus:ring-1 focus:ring-amber-500 outline-none"
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          {error && <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 rounded-lg text-xs font-medium">{error}</div>}
                          
                          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl p-3 flex gap-2">
                            <ShieldAlert className="text-red-600 dark:text-red-500 flex-shrink-0" size={16} />
                            <p className="text-[10px] leading-tight font-bold text-red-800 dark:text-red-450">
                              ⚠️ Límite de seguridad: Solo puedes generar 1 documento de este tipo cada 7 días. Revisa muy bien tus datos antes de continuar.
                            </p>
                          </div>

                          <button 
                            onClick={handleGenerateCPA}
                            disabled={loading}
                            className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 mt-4 text-sm"
                          >
                            {loading ? 'Generando...' : <><Download size={18} /> Generar Documento</>}
                          </button>
                        </div>
                      </div>
                    )}

                    {activeTab === 'confidencialidad' && (
                      <div className="max-w-md mx-auto">
                        <h4 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 text-center">Carta de Confidencialidad</h4>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">Folio del Programa (Opcional)</label>
                            <input 
                              type="text" 
                              value={folioInput}
                              onChange={e => setFolioInput(e.target.value)}
                              placeholder="Ej. SS-24-001"
                              className="w-full border border-gray-350 dark:border-gray-800 bg-transparent rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                            />
                          </div>

                          {error && <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 rounded-lg text-xs font-medium">{error}</div>}

                          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl p-3 flex gap-2">
                            <ShieldAlert className="text-red-600 dark:text-red-500 flex-shrink-0" size={16} />
                            <p className="text-[10px] leading-tight font-bold text-red-800 dark:text-red-450">
                              ⚠️ Límite de seguridad: Solo puedes generar 1 documento de este tipo cada 7 días.
                            </p>
                          </div>

                          <button 
                            onClick={handleGenerateConfidencialidad}
                            disabled={loading}
                            className="w-full flex justify-center items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 mt-4 text-sm"
                          >
                            {loading ? 'Generando...' : <><Download size={18} /> Generar Carta</>}
                          </button>
                        </div>
                      </div>
                    )}

                    {activeTab === 'compromiso' && (
                      <div className="max-w-md mx-auto">
                        <h4 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 text-center">Carta Compromiso</h4>
                        
                        <div className="space-y-4 text-left">
                          <div>
                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">Folio del Programa *</label>
                            <input 
                              type="text" 
                              value={folioInput}
                              onChange={e => setFolioInput(e.target.value)}
                              placeholder="Ej. SS-24-001"
                              className="w-full border border-gray-355 dark:border-gray-800 bg-transparent rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">Número de Teléfono *</label>
                            <input 
                              type="tel" 
                              value={phone}
                              onChange={e => setPhone(e.target.value)}
                              placeholder="2221234567"
                              className="w-full border border-gray-355 dark:border-gray-800 bg-transparent rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">Periodo *</label>
                              <select 
                                value={period}
                                onChange={e => setPeriod(e.target.value)}
                                className="w-full border border-gray-355 dark:border-gray-800 bg-transparent dark:bg-[#120f17] rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                              >
                                <option value="">Selecciona...</option>
                                <option value="PRIMAVERA">PRIMAVERA</option>
                                <option value="VERANO">VERANO</option>
                                <option value="OTOÑO">OTOÑO</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">Año *</label>
                              <input 
                                type="text" 
                                value={yearDigit}
                                onChange={e => setYearDigit(e.target.value)}
                                placeholder="Ej. 2026"
                                maxLength={4}
                                className="w-full border border-gray-355 dark:border-gray-800 bg-transparent rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none text-center"
                              />
                            </div>
                          </div>

                          {error && <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-655 dark:text-red-400 rounded-lg text-xs font-medium">{error}</div>}

                          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl p-3 flex gap-2">
                            <ShieldAlert className="text-red-600 dark:text-red-500 flex-shrink-0" size={16} />
                            <p className="text-[10px] leading-tight font-bold text-red-800 dark:text-red-450">
                              ⚠️ Límite de seguridad: Solo puedes generar 1 documento de este tipo cada 7 días.
                            </p>
                          </div>

                          <button 
                            onClick={handleGenerateCompromiso}
                            disabled={loading}
                            className="w-full flex justify-center items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 mt-4 text-sm"
                          >
                            {loading ? 'Generando...' : <><Download size={18} /> Generar Carta Compromiso</>}
                          </button>
                        </div>
                      </div>
                    )}

                    {activeTab === 'folio' && (
                      <div className="max-w-xl mx-auto">
                        <h4 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 text-center">Consultar Folio</h4>
                        
                        <div className="flex gap-2 mb-6">
                          <input 
                            type="text" 
                            value={folioInput}
                            onChange={e => setFolioInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearchFolio()}
                            placeholder="Ej. SS-24-001"
                            className="flex-1 border border-gray-350 dark:border-gray-800 bg-transparent rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                          />
                          <button 
                            onClick={handleSearchFolio}
                            disabled={loading}
                            className="px-6 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 flex justify-center items-center"
                          >
                            {loading ? '...' : <Search size={20} />}
                          </button>
                        </div>

                        {error && <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-655 dark:text-red-400 rounded-lg text-xs font-medium mb-4 text-center">{error}</div>}

                        {searchResult && (
                          <div className="bg-gray-50 dark:bg-[#15121b] border border-gray-200 dark:border-gray-800 rounded-xl p-5 animate-fade-in text-left">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <span className="inline-block px-2.5 py-1 bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-400 text-[10px] font-bold rounded mb-2">
                                  {searchResult.program_type === 'servicio_social' ? 'Servicio Social' : 'Práctica Profesional'}
                                </span>
                                <h5 className="text-base font-bold text-gray-800 dark:text-gray-100">{searchResult.name}</h5>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{searchResult.dependency_name}</p>
                              </div>
                              <span className="text-xs font-mono text-gray-500 bg-gray-200 dark:bg-gray-900 px-2.5 py-1 rounded">
                                {searchResult.folio}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                              <div className="bg-white dark:bg-[#1c1825] p-3 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm text-center">
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Cupo Total</p>
                                <p className="text-lg font-bold text-gray-800 dark:text-gray-200">{searchResult.availability?.max_slots ?? searchResult.max_slots}</p>
                              </div>
                              <div className="bg-white dark:bg-[#1c1825] p-3 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm text-center">
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Disponibles</p>
                                <p className={`text-lg font-bold ${searchResult.availability?.available_slots === 0 ? 'text-red-650' : 'text-green-650'}`}>
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
            </motion.div>
          )}

          {/* TAB 3: VALIDATE (Embedded Document Validator Page) */}
          {currentTab === 'validate' && (
            <motion.div
              key="validate"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full flex flex-col"
            >
              <ValidatorView />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Bottom macOS Floating Dock */}
      <Dock currentTab={currentTab} onTabChange={(tab) => { setCurrentTab(tab); setActiveTab(null); }} />

      <footer className="mt-auto border-t border-gray-100 dark:border-gray-900 bg-white dark:bg-[#0b090f] py-6 transition-colors">
        <div className="max-w-4xl mx-auto px-6 text-center text-xs text-gray-400 dark:text-gray-500 font-medium">
          Plataforma Express - Coordinación de Prácticas Profesionales y Servicio Social BUAP
        </div>
      </footer>
      <PoweredBy />
    </div>
  )
}
