// AppShell — legacy wrapper, now redirects student nav to new /student routes.
// The new student area uses inline sidebars in StudentDashboard, ProcessView, etc.
// This file is kept for backward compatibility with any remaining admin references.

import { NavLink, useNavigate } from 'react-router-dom'
import { Home, User, LogOut, ChevronRight, GraduationCap } from 'lucide-react'
import { useStudent } from '../context/StudentContext'
import { BuapLogo } from './BuapLogo'
import type { ReactNode } from 'react'
import { PoweredBy } from './PoweredBy'

const NAV_ITEMS = [
  { id: 'home',    label: 'Inicio',   icon: Home, path: '/student' },
  { id: 'profile', label: 'Mi perfil', icon: User, path: '/student/profile' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────────────────────

function Sidebar() {
  const { student, logout } = useStudent()
  const navigate = useNavigate()


  function handleLogout() {
    logout()
    navigate('/')
  }

  const initials = student
    ? student.full_name.split(' ').slice(0, 2).map((n) => n.charAt(0)).join('')
    : '?'

  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-surface-border
                      flex flex-col h-screen sticky top-0 overflow-y-auto">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-surface-border flex-shrink-0">
        <BuapLogo size={32} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary-700 truncate leading-tight">
            SS/PP BUAP
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.path === '/student'}
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
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Student info at bottom */}
      {student && (
        <div className="p-4 border-t border-surface-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-primary-700">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-content-primary truncate">
                {student.first_name ?? student.full_name.split(' ')[0]}
              </p>
              <p className="text-xs font-mono text-content-tertiary truncate">
                {student.matricula}
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
        </div>
      )}
    </aside>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page header
// ─────────────────────────────────────────────────────────────────────────────

interface HeaderProps {
  breadcrumb?: string[]
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ breadcrumb, title, subtitle, actions }: HeaderProps) {
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

// ─────────────────────────────────────────────────────────────────────────────
// Shell
// ─────────────────────────────────────────────────────────────────────────────

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden">
        <div className="max-w-5xl mx-auto px-8 pt-8 pb-16">
          {children}
        </div>
        <PoweredBy />
      </main>
    </div>
  )
}

export { GraduationCap }
