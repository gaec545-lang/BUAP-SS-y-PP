import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Terminal, 
  Users, 
  Clock, 
  Trash2, 
  Activity, 
  ShieldCheck, 
  Lock, 
  AlertTriangle,
  Server,
  Database,
  Cpu,
  RefreshCcw,
  Search,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { 
  developerLogin, 
  developerGetStatus, 
  developerGetActiveSessions, 
  developerGetUploadLogs,
  developerDeleteStudent,
  developerDeleteAdmin,
  adminGetUsers,
  adminGetStudents
} from '../../services/api'

// ─────────────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────────────

interface DevStatCardProps {
  label: string
  value: string | number
  icon: any
  status?: 'success' | 'warning' | 'error'
}

function DevStatCard({ label, value, icon: Icon, status = 'success' }: DevStatCardProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-lg">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg bg-opacity-10 ${
          status === 'success' ? 'bg-emerald-500 text-emerald-400' :
          status === 'warning' ? 'bg-amber-500 text-amber-400' : 'bg-rose-500 text-rose-400'
        }`}>
          <Icon size={18} />
        </div>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white font-mono">{value}</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export function DeveloperPanel() {
  const [isAuth, setIsAuth] = useState(false)
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [activeTab, setActiveTab] = useState<'sessions' | 'uploads' | 'accounts' | 'status'>('status')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Data states
  const [status, setStatus] = useState<any>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [uploadLogs, setUploadLogs] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<{ admins: any[], students: any[] }>({ admins: [], students: [] })
  const [searchTerm, setSearchTerm] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await developerLogin(credentials)
      setIsAuth(true)
      loadAllData()
    } catch (err: any) {
      setError(err.message ?? 'Credenciales de desarrollador inválidas')
    } finally {
      setLoading(false)
    }
  }

  async function loadAllData() {
    setLoading(true)
    try {
      const [s, sess, logs, admins, students] = await Promise.all([
        developerGetStatus(),
        developerGetActiveSessions(),
        developerGetUploadLogs(),
        adminGetUsers(),
        adminGetStudents()
      ])
      setStatus(s)
      setSessions(sess)
      setUploadLogs(logs)
      setAllUsers({ admins, students })
    } catch (err: any) {
      setError('Error al cargar datos del sistema')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(type: 'student' | 'admin', id: number, name: string) {
    if (!window.confirm(`¿ESTÁS SEGURO? Esta acción es irreversible. Se eliminará la cuenta de: ${name}`)) return
    
    setLoading(true)
    try {
      if (type === 'student') await developerDeleteStudent(id)
      else await developerDeleteAdmin(id)
      
      alert('Cuenta eliminada correctamente.')
      loadAllData()
    } catch (err: any) {
      alert(err.message ?? 'Error al eliminar')
    } finally {
      setLoading(false)
    }
  }

  if (!isAuth) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-gray-950 border border-gray-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Animated Background */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-sky-500 to-emerald-500 animate-gradient-x" />
          
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-emerald-500 bg-opacity-10 text-emerald-400 rounded-2xl flex items-center justify-center mb-4">
              <Terminal size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Developer Mode</h1>
            <p className="text-gray-500 text-sm mt-1">Acceso restringido para personal de sistemas</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5 ml-1">Username</label>
              <div className="relative">
                <Users className="absolute left-4 top-3 text-gray-600" size={16} />
                <input 
                  type="text"
                  required
                  value={credentials.username}
                  onChange={e => setCredentials({...credentials, username: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-11 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all placeholder:text-gray-700"
                  placeholder="admin_dev"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5 ml-1">Master Key</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3 text-gray-600" size={16} />
                <input 
                  type="password"
                  required
                  value={credentials.password}
                  onChange={e => setCredentials({...credentials, password: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-11 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all placeholder:text-gray-700"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-rose-500 bg-opacity-10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
                <AlertTriangle size={14} />
                <span>{error}</span>
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-white hover:bg-emerald-400 text-black font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4 group"
            >
              {loading ? (
                <RefreshCcw className="animate-spin" size={18} />
              ) : (
                <>
                  <ShieldCheck size={18} className="group-hover:scale-110 transition-transform" />
                  Authenticate Terminal
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-[10px] text-gray-600 uppercase tracking-[0.2em]">
            SYSTEM SECURITY v4.0.2 • BUAP CLOUD
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-gray-300 font-sans selection:bg-emerald-500 selection:text-black">
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-widest">Live System</span>
              <span className="text-gray-700 text-[10px]">/</span>
              <span className="text-gray-500 text-[10px] font-mono">ID: BUAP-EXPRESS-PROD</span>
            </div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
              Developer <span className="text-emerald-500">Center</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={loadAllData}
              className="p-3 bg-gray-900 border border-gray-800 rounded-xl hover:bg-gray-800 transition-colors text-gray-400"
            >
              <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <div className="h-10 w-px bg-gray-800 mx-2" />
            <button 
              onClick={() => setIsAuth(false)}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl transition-all"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <DevStatCard 
            label="Database Connection" 
            value={status?.db_status === 'connected' ? 'ONLINE' : 'OFFLINE'} 
            icon={Database} 
            status={status?.db_status === 'connected' ? 'success' : 'error'}
          />
          <DevStatCard 
            label="Active Sessions (20m)" 
            value={sessions.length} 
            icon={Activity} 
          />
          <DevStatCard 
            label="Storage Usage" 
            value="3.2 GB" 
            icon={Server} 
            status="warning"
          />
          <DevStatCard 
            label="OS Architecture" 
            value={status?.system_info?.os || 'Linux'} 
            icon={Cpu} 
          />
        </div>

        {/* Main Content */}
        <div className="bg-gray-950 border border-gray-800 rounded-[2rem] overflow-hidden shadow-2xl">
          {/* Tabs */}
          <div className="flex border-b border-gray-800 p-2 gap-2">
            {[
              { id: 'status', label: 'System Health', icon: Activity },
              { id: 'sessions', label: 'Active Users', icon: Users },
              { id: 'uploads', label: 'Upload Logs', icon: Clock },
              { id: 'accounts', label: 'Account Wipe', icon: Trash2 },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-sm font-bold transition-all ${
                  activeTab === tab.id 
                  ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]' 
                  : 'text-gray-500 hover:bg-gray-900 hover:text-gray-300'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-8">
            <AnimatePresence mode="wait">
              {activeTab === 'status' && (
                <motion.div 
                  key="status"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Server size={20} className="text-emerald-500" />
                        Infrastructure Details
                      </h3>
                      <div className="bg-gray-900/50 rounded-2xl p-6 space-y-4 border border-gray-800">
                        {status?.system_info && Object.entries(status.system_info).map(([key, val]: any) => (
                          <div key={key} className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 capitalize">{key.replace('_', ' ')}</span>
                            <span className="font-mono text-emerald-400">{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <AlertTriangle size={20} className="text-amber-500" />
                        Recent System Alerts
                      </h3>
                      <div className="space-y-3">
                        {(status?.recent_errors?.length > 0) ? status.recent_errors.map((err: any) => (
                          <div key={err.id} className="bg-rose-500/5 border border-rose-500/10 p-4 rounded-xl flex items-center gap-4">
                            <XCircle className="text-rose-500" size={16} />
                            <div className="flex-1">
                              <p className="text-sm text-gray-300 font-medium">{err.action}</p>
                              <p className="text-[10px] text-gray-600 uppercase tracking-wider">{new Date(err.timestamp).toLocaleString()}</p>
                            </div>
                            <span className="text-xs font-mono text-gray-500">{err.user}</span>
                          </div>
                        )) : (
                          <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-xl text-center">
                            <CheckCircle className="text-emerald-500 mx-auto mb-2" size={24} />
                            <p className="text-sm text-emerald-400 font-medium">System reports zero critical errors in recent logs.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'sessions' && (
                <motion.div 
                  key="sessions"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">Active Sessions (20min window)</h3>
                    <span className="text-xs text-gray-500 font-mono">Auto-refreshed every 60s</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sessions.map((s, i) => (
                      <div key={i} className="bg-gray-900 border border-gray-800 p-5 rounded-2xl flex items-center gap-4 group hover:border-emerald-500/30 transition-all">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          s.type === 'admin' ? 'bg-sky-500/10 text-sky-400' : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {s.type === 'admin' ? <ShieldCheck size={20} /> : <Users size={20} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">{s.name}</p>
                          <p className="text-[10px] text-gray-500 uppercase">{s.type}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-gray-500 font-mono">{new Date(s.last_activity).toLocaleTimeString()}</p>
                          <div className="flex justify-end mt-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'uploads' && (
                <motion.div 
                  key="uploads"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="bg-gray-900 rounded-3xl overflow-hidden border border-gray-800">
                    <table className="w-full text-left">
                      <thead className="bg-gray-950 border-b border-gray-800">
                        <tr>
                          <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Timestamp</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Admin</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {uploadLogs.map(log => (
                          <tr key={log.id} className="hover:bg-gray-800/30 transition-colors">
                            <td className="px-6 py-4 font-mono text-xs text-gray-400">{new Date(log.timestamp).toLocaleString()}</td>
                            <td className="px-6 py-4 text-sm font-medium text-white">{log.user}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                log.action.includes('excel') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-sky-500/10 text-sky-400'
                              }`}>
                                {log.action.includes('excel') ? 'EXCEL' : 'PDF'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-500 font-mono">
                              {JSON.stringify(log.details)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {activeTab === 'accounts' && (
                <motion.div 
                  key="accounts"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-3.5 text-gray-600" size={18} />
                      <input 
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search student or admin by name or ID..."
                        className="w-full bg-gray-900 border border-gray-800 rounded-2xl px-12 py-3.5 text-white outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Admins */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest px-2">Administrative Cluster</h4>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {allUsers.admins.filter(a => a.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || a.username.includes(searchTerm)).map(admin => (
                          <div key={admin.id} className="bg-gray-900/50 border border-gray-800 p-4 rounded-2xl flex items-center justify-between group hover:border-rose-500/20 transition-all">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-sky-400">
                                <ShieldCheck size={16} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white">{admin.full_name || admin.username}</p>
                                <p className="text-[10px] text-gray-600 uppercase font-mono">{admin.role}</p>
                              </div>
                            </div>
                            {admin.username !== 'developer' && (
                              <button 
                                onClick={() => handleDelete('admin', admin.id, admin.username)}
                                className="p-2.5 text-gray-700 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Students */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest px-2">Student Core</h4>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {allUsers.students.filter(s => s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || s.matricula.includes(searchTerm)).map(student => (
                          <div key={student.id} className="bg-gray-900/50 border border-gray-800 p-4 rounded-2xl flex items-center justify-between group hover:border-rose-500/20 transition-all">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-emerald-400">
                                <Users size={16} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white">{student.full_name}</p>
                                <p className="text-[10px] text-gray-600 uppercase font-mono">{student.matricula}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleDelete('student', student.id, student.full_name)}
                              className="p-2.5 text-gray-700 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Console Overlay Footer */}
        <div className="mt-8 flex items-center justify-between px-4">
          <div className="flex items-center gap-4 text-[10px] font-mono text-gray-600 uppercase tracking-widest">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              API REACHABLE
            </div>
            <div className="h-3 w-px bg-gray-800" />
            <div>SSL ENCRYPTED (AES-256)</div>
          </div>
          <p className="text-[10px] font-mono text-gray-800">
            &copy; 2026 EVANGELISTA & CO • ADVANCED AGENTIC DEPLOYMENT
          </p>
        </div>

      </div>
    </div>
  )
}
