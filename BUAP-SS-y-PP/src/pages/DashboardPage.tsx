// Legacy — redirected to /student in App.tsx
import { Navigate } from 'react-router-dom'
export function DashboardPage() { return <Navigate to="/student" replace /> }
