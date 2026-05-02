import { NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect, type ReactNode } from 'react'
import {
  LayoutDashboard,
  Users,
  UserCog,
  LogOut,
  ChevronRight,
  ArrowLeft,
  FileCheck,
  Settings,
  BookOpen,
} from 'lucide-react'
import { useStudent } from '../../context/StudentContext'
import { BuapLogo } from '../../components/BuapLogo'
import { adminGetPendingEnrollments, adminGetPendingChangeRequests } from '../../services/api'
import { PoweredBy } from '../../components/PoweredBy'

interface AdminLayoutProps {
  children: ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { admin, logout } = useStudent()
  const navigate = useNavigate()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    async function fetchPending() {
      try {
        const [enrollments, changes] = await Promise.all([
          adminGetPendingEnrollments().catch(() => []),
          adminGetPendingChangeRequests().catch(() => []),
        ])
        setPendingCount(enrollments.length + changes.length)
      } catch {}
    }
    fetchPending()
    const interval = setInterval(fetchPending, 30000)
    return () => clearInterval(interval)
  }, [])

  function handleLogout() {
    logout()
    navigate('/')
  }

  const initials = admin
    ? admin.full_name.split(' ').slice(0, 2).map((n) => n.charAt(0)).join('')
    : 'A'

  const navItems = [
    { id: 'dashboard',   label: 'Dashboard',    icon: LayoutDashboard, path: '/admin',               badge: 0,            end: true },
    { id: 'students',    label: 'Alumnos',       icon: Users,           path: '/admin/students',      badge: 0,            end: false },
    { id: 'solicitudes', label: 'Solicitudes',   icon: FileCheck,       path: '/admin/solicitudes',   badge: pendingCount, end: false },
    { id: 'programs',    label: 'Programas',     icon: BookOpen,        path: '/admin/programs',      badge: 0,            end: false },
    { id: 'config',      label: 'Configuración del periodo', icon: Settings,        path: '/admin/config',        badge: 0,            end: false },
    { id: 'users',       label: 'Usuarios',      icon: UserCog,         path: '/admin/users',         badge: 0,            end: false },
  ]

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-white border-r border-surface-border
                        flex flex-col h-screen sticky top-0 overflow-y-auto">
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-surface-border flex-shrink-0">
          <BuapLogo size={32} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-content-primary truncate leading-tight">
              Panel Admin
            </p>
            <p className="text-xs text-content-tertiary truncate">SS/PP · BUAP</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 group ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-medium border-l-2 border-primary-500'
                    : 'text-content-secondary hover:bg-surface-hover hover:text-content-primary border-l-2 border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    size={18}
                    className={isActive ? 'text-primary-600' : 'text-content-tertiary group-hover:text-content-secondary'}
                  />
                  <span className="text-sm flex-1">{item.label}</span>
                  {item.badge > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1
                                     rounded-full bg-danger text-white text-[10px] font-semibold leading-none">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: admin info + logout */}
        <div className="p-4 border-t border-surface-border flex-shrink-0 space-y-3">
          <NavLink
            to="/"
            className="flex items-center gap-2 text-xs text-content-tertiary hover:text-content-secondary
                       transition-colors duration-150"
          >
            <ArrowLeft size={12} />
            Volver al portal
          </NavLink>

          {admin && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-primary-700">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-content-primary truncate">
                  {admin.full_name}
                </p>
                <p className="text-xs text-content-tertiary truncate capitalize">
                  {admin.role}
                </p>
              </div>
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-1.5 rounded-button text-content-tertiary
                           hover:text-danger hover:bg-danger-light transition-colors duration-150"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-x-hidden">
        <div className="max-w-6xl mx-auto px-8 pt-8 pb-16">
          {children}
        </div>
        <PoweredBy />
      </main>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable page header
// ─────────────────────────────────────────────────────────────────────────────

interface AdminPageHeaderProps {
  breadcrumb?: string[]
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function AdminPageHeader({ breadcrumb, title, subtitle, actions }: AdminPageHeaderProps) {
  return (
    <div className="mb-6">
      {breadcrumb && breadcrumb.length > 0 && (
        <div className="flex items-center gap-1 mb-1.5">
          {breadcrumb.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={12} className="text-content-tertiary" />}
              <span className="text-xs text-content-tertiary">{crumb}</span>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-content-primary">{title}</h1>
          {subtitle && (
            <p className="text-sm text-content-secondary mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
    </div>
  )
}
