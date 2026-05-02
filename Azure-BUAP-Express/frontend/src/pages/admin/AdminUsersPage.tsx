import { useState, useEffect } from 'react'
import { Plus, X, Loader2, AlertCircle, Edit2, UserX } from 'lucide-react'
import { AdminLayout, AdminPageHeader } from './AdminLayout'
import {
  adminGetUsers,
  adminCreateUser,
  adminUpdateUser,
} from '../../services/api'
import { useStudent } from '../../context/StudentContext'

// ─────────────────────────────────────────────────────────────────────────────
// Badges
// ─────────────────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  return role === 'coordinador' ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-badge text-xs font-medium bg-primary-50 text-primary-700">
      Coordinador
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-badge text-xs font-medium bg-gray-100 text-gray-600">
      Subordinado
    </span>
  )
}

function ActiveBadge({ isActive }: { isActive?: boolean }) {
  return isActive !== false ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-badge text-xs font-medium bg-success-light text-success-dark">
      <span className="w-1.5 h-1.5 rounded-full bg-success" />
      Activo
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-badge text-xs font-medium bg-gray-100 text-gray-500">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
      Inactivo
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// User Modal (create / edit)
// ─────────────────────────────────────────────────────────────────────────────

interface UserModalProps {
  user?: any | null
  onClose: () => void
  onSuccess: () => void
}

function UserModal({ user, onClose, onSuccess }: UserModalProps) {
  const isEdit = !!user
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    username: user?.username ?? '',
    full_name: user?.full_name ?? '',
    password: '',
    role: user?.role ?? 'subordinado',
  })

  function set(key: string, value: any) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (isEdit && user) {
        await adminUpdateUser(user.id, {
          full_name: form.full_name || undefined,
          password: form.password || undefined,
          role: form.role,
        })
      } else {
        await adminCreateUser({
          username: form.username,
          full_name: form.full_name,
          password: form.password,
          role: form.role,
        })
      }
      onSuccess()
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-card shadow-modal border border-surface-border w-full max-w-md animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <h2 className="text-base font-semibold text-content-primary">
            {isEdit ? 'Editar usuario' : 'Agregar usuario'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-button text-content-tertiary hover:text-content-primary
                       hover:bg-surface-hover transition-colors duration-150"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!isEdit && (
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1.5">
                Usuario
              </label>
              <input
                required
                value={form.username}
                onChange={(e) => set('username', e.target.value)}
                placeholder="coordinador2"
                className="w-full px-3 py-2 text-sm rounded-input border border-surface-border
                           focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400
                           transition-all duration-150"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1.5">
              Nombre completo
            </label>
            <input
              required={!isEdit}
              value={form.full_name}
              onChange={(e) => set('full_name', e.target.value)}
              placeholder="Nombre Completo"
              className="w-full px-3 py-2 text-sm rounded-input border border-surface-border
                         focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400
                         transition-all duration-150"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1.5">
              Contraseña{isEdit ? ' (dejar vacío para no cambiar)' : ''}
            </label>
            <input
              required={!isEdit}
              type="password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-sm rounded-input border border-surface-border
                         focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400
                         transition-all duration-150"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1.5">Rol</label>
            <select
              value={form.role}
              onChange={(e) => set('role', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-input border border-surface-border bg-white
                         focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400
                         transition-all duration-150"
            >
              <option value="subordinado">Subordinado</option>
              <option value="coordinador">Coordinador</option>
            </select>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-danger-light border border-danger/20">
              <AlertCircle size={14} className="text-danger flex-shrink-0 mt-0.5" />
              <p className="text-xs text-danger-dark">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-content-secondary border border-surface-border
                         rounded-button hover:bg-surface-hover transition-colors duration-150"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700
                         disabled:bg-primary-300 text-white text-sm font-medium rounded-button
                         transition-colors duration-150 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export function AdminUsersPage() {
  const { admin } = useStudent()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<{ open: boolean; user?: any | null }>({ open: false })

  async function loadUsers() {
    setLoading(true)
    setError(null)
    try {
      const data = await adminGetUsers()
      setUsers(data)
    } catch (err: any) {
      setError(err.message ?? 'Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (admin?.role === 'coordinador') loadUsers()
    else setLoading(false)
  }, [admin])

  async function handleDeactivate(userId: number) {
    if (!confirm('¿Desactivar este usuario?')) return
    try {
      await adminUpdateUser(userId, { is_active: false })
      await loadUsers()
    } catch (err: any) {
      alert(err.message ?? 'Error')
    }
  }

  if (admin?.role !== 'coordinador') {
    return (
      <AdminLayout>
        <AdminPageHeader breadcrumb={['Admin', 'Usuarios']} title="Usuarios" />
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-danger-light flex items-center justify-center mb-4">
            <AlertCircle size={24} className="text-danger" />
          </div>
          <h3 className="text-base font-semibold text-content-primary mb-1">Sin acceso</h3>
          <p className="text-sm text-content-secondary max-w-sm">
            Solo los coordinadores pueden gestionar usuarios del sistema.
          </p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      {modal.open && (
        <UserModal
          user={modal.user}
          onClose={() => setModal({ open: false })}
          onSuccess={() => {
            setModal({ open: false })
            loadUsers()
          }}
        />
      )}

      <AdminPageHeader
        breadcrumb={['Admin', 'Usuarios']}
        title="Usuarios del sistema"
        subtitle="Gestiona los accesos al panel de administración"
        actions={
          <button
            onClick={() => setModal({ open: true, user: null })}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700
                       text-white text-sm font-medium rounded-button transition-colors duration-150"
          >
            <Plus size={16} />
            Agregar usuario
          </button>
        }
      />

      {error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle size={24} className="text-danger mb-3" />
          <p className="text-sm text-content-secondary mb-4">{error}</p>
          <button
            onClick={loadUsers}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-button transition-colors"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-card border border-surface-border shadow-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-border bg-surface">
                {['Usuario', 'Nombre', 'Rol', 'Estado', ''].map((h) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-xs font-medium text-content-tertiary uppercase tracking-wider ${h ? 'text-left' : 'text-right'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(5)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <p className="text-sm text-content-tertiary">No hay usuarios registrados</p>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-surface-hover transition-colors duration-150"
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono text-content-secondary">{user.username}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-content-primary">{user.full_name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-4 py-3">
                      <ActiveBadge isActive={user.is_active} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setModal({ open: true, user })}
                          className="p-1.5 rounded-button text-content-tertiary hover:text-primary-600
                                     hover:bg-primary-50 transition-colors duration-150"
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        {user.is_active !== false && user.username !== admin?.username && (
                          <button
                            onClick={() => handleDeactivate(user.id)}
                            className="p-1.5 rounded-button text-content-tertiary hover:text-danger
                                       hover:bg-danger-light transition-colors duration-150"
                            title="Desactivar"
                          >
                            <UserX size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  )
}
