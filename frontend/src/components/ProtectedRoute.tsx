import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// Redirects to /login if user is not authenticated
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }




  

  return <>{children}</>
}






