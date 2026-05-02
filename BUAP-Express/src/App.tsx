import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { StudentProvider, useStudent } from './context/StudentContext'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'

// Student pages
import { ExpressDashboard } from './pages/student/ExpressDashboard'
import { StudentProfile } from './pages/student/StudentProfile'

// Admin pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { AdminStudentsPage } from './pages/admin/AdminStudentsPage'
import { AdminStudentDetailPage } from './pages/admin/AdminStudentDetailPage'
import { AdminSolicitudesPage } from './pages/admin/AdminSolicitudesPage'
import { AdminConfigPage } from './pages/admin/AdminConfigPage'
import { AdminUsersPage } from './pages/admin/AdminUsersPage'
import { AdminProgramsPage } from './pages/admin/AdminProgramsPage'

import type { ReactNode } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Auth guards
// ─────────────────────────────────────────────────────────────────────────────

function ProtectedStudent({ children }: { children: ReactNode }) {
  const { isAuthenticated, isAdmin } = useStudent()
  if (!isAuthenticated) return <Navigate to="/" replace />
  if (isAdmin) return <Navigate to="/admin" replace />
  return <>{children}</>
}

function ProtectedAdmin({ children }: { children: ReactNode }) {
  const { isAuthenticated, isAdmin } = useStudent()
  if (!isAuthenticated) return <Navigate to="/" replace />
  if (!isAdmin) return <Navigate to="/student" replace />
  return <>{children}</>
}

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

function AppRoutes() {
  const { isAuthenticated, isAdmin } = useStudent()
  const location = useLocation()

  return (
    <Routes location={location} key={location.pathname}>
      {/* Public */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to={isAdmin ? '/admin' : '/student'} replace />
          ) : (
            <LoginPage />
          )
        }
      />
      <Route path="/register" element={<RegisterPage />} />

      {/* Student protected */}
      <Route path="/student" element={<ProtectedStudent><ExpressDashboard /></ProtectedStudent>} />
      <Route path="/student/profile" element={<ProtectedStudent><StudentProfile /></ProtectedStudent>} />

      {/* Legacy redirects */}
      <Route path="/dashboard" element={<Navigate to="/student" replace />} />
      <Route path="/documents" element={<Navigate to="/student" replace />} />
      <Route path="/calendar" element={<Navigate to="/student" replace />} />
      <Route path="/register/status" element={<Navigate to="/student" replace />} />

      {/* Admin protected */}
      <Route path="/admin" element={<ProtectedAdmin><AdminDashboardPage /></ProtectedAdmin>} />
      <Route path="/admin/students" element={<ProtectedAdmin><AdminStudentsPage /></ProtectedAdmin>} />
      <Route path="/admin/students/:id" element={<ProtectedAdmin><AdminStudentDetailPage /></ProtectedAdmin>} />
      <Route path="/admin/solicitudes" element={<ProtectedAdmin><AdminSolicitudesPage /></ProtectedAdmin>} />
      <Route path="/admin/programs" element={<ProtectedAdmin><AdminProgramsPage /></ProtectedAdmin>} />
      <Route path="/admin/config" element={<ProtectedAdmin><AdminConfigPage /></ProtectedAdmin>} />
      <Route path="/admin/users" element={<ProtectedAdmin><AdminUsersPage /></ProtectedAdmin>} />

      {/* Legacy admin redirects */}
      <Route path="/admin/registrations" element={<Navigate to="/admin/solicitudes" replace />} />
      <Route path="/admin/uploads" element={<Navigate to="/admin/solicitudes" replace />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <StudentProvider>
        <AppRoutes />
      </StudentProvider>
    </BrowserRouter>
  )
}
