import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import { setToken, getToken, adminGetMe, type StudentAPI, type AdminAPI, type EnrollmentStatusAPI } from '../services/api'

interface StudentContextValue {
  student: StudentAPI | null
  admin: AdminAPI | null
  isAuthenticated: boolean
  isAdmin: boolean
  enrollmentStatus: EnrollmentStatusAPI | null
  setStudent: (s: StudentAPI | null) => void
  setAdmin: (a: AdminAPI | null) => void
  setEnrollmentStatus: (s: EnrollmentStatusAPI | null) => void
  logout: () => void
}

const StudentContext = createContext<StudentContextValue | null>(null)

// ─────────────────────────────────────────────────────────────────────────────
// Session restore helpers
// ─────────────────────────────────────────────────────────────────────────────

function restoreStudent(): StudentAPI | null {
  if (!getToken()) return null
  try {
    const raw = localStorage.getItem('buap_student')
    if (!raw) return null
    return JSON.parse(raw) as StudentAPI
  } catch {
    return null
  }
}

function restoreAdmin(): AdminAPI | null {
  if (!getToken()) return null
  try {
    const raw = localStorage.getItem('buap_admin')
    if (!raw) return null
    return JSON.parse(raw) as AdminAPI
  } catch {
    return null
  }
}

function restoreEnrollmentStatus(): EnrollmentStatusAPI | null {
  try {
    const raw = localStorage.getItem('buap_enrollment_status')
    if (!raw) return null
    return JSON.parse(raw) as EnrollmentStatusAPI
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function StudentProvider({ children }: { children: ReactNode }) {
  const [student, setStudentState] = useState<StudentAPI | null>(restoreStudent)
  const [admin, setAdminState] = useState<AdminAPI | null>(restoreAdmin)
  const [enrollmentStatus, setEnrollmentStatusState] = useState<EnrollmentStatusAPI | null>(
    restoreEnrollmentStatus,
  )

  // ── Session restore on crash/refresh ──────────────────────────────────────
  // If a token exists in localStorage but the admin object was lost (e.g. app
  // crashed before it was persisted), re-fetch the admin profile from the API
  // so the auth guard can correctly route to /admin instead of showing login.
  useEffect(() => {
    if (admin !== null) return              // already restored from localStorage
    if (student !== null) return            // student session is fine
    const token = getToken()               // set at module level from localStorage
    if (!token) return                     // no token at all — nothing to restore
    // Token exists but no admin/student object — try to recover admin session
    const raw = localStorage.getItem('buap_admin')
    if (raw) return                        // buap_admin exists, restoreAdmin() handled it
    adminGetMe()
      .then((a) => {
        localStorage.setItem('buap_admin', JSON.stringify(a))
        setAdminState(a)
      })
      .catch(() => {
        // Token is expired or invalid — clear it so the user gets a clean login
        setToken(null)
        localStorage.removeItem('buap_admin')
        localStorage.removeItem('buap_student')
        localStorage.removeItem('buap_enrollment_status')
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isAuthenticated = student !== null || admin !== null
  const isAdmin = admin !== null

  const setStudent = useCallback((s: StudentAPI | null) => {
    setStudentState(s)
    if (s) localStorage.setItem('buap_student', JSON.stringify(s))
    else localStorage.removeItem('buap_student')
  }, [])

  const setAdmin = useCallback((a: AdminAPI | null) => {
    setAdminState(a)
    if (a) localStorage.setItem('buap_admin', JSON.stringify(a))
    else localStorage.removeItem('buap_admin')
  }, [])

  const setEnrollmentStatus = useCallback((s: EnrollmentStatusAPI | null) => {
    setEnrollmentStatusState(s)
    if (s) localStorage.setItem('buap_enrollment_status', JSON.stringify(s))
    else localStorage.removeItem('buap_enrollment_status')
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setStudentState(null)
    setAdminState(null)
    setEnrollmentStatusState(null)
    localStorage.removeItem('buap_student')
    localStorage.removeItem('buap_admin')
    localStorage.removeItem('buap_enrollment_status')
  }, [])

  return (
    <StudentContext.Provider
      value={{
        student,
        admin,
        isAuthenticated,
        isAdmin,
        enrollmentStatus,
        setStudent,
        setAdmin,
        setEnrollmentStatus,
        logout,
      }}
    >
      {children}
    </StudentContext.Provider>
  )
}

export function useStudent(): StudentContextValue {
  const ctx = useContext(StudentContext)
  if (!ctx) throw new Error('useStudent must be used inside <StudentProvider>')
  return ctx
}
