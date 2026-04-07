import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { validateSuperAdminSession } from '../utils/superAdminAuth'

export default function SuperAdminGuard({ children }) {
  const location = useLocation()
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    let active = true

    validateSuperAdminSession()
      .then(isValid => {
        if (!active) return
        setStatus(isValid ? 'valid' : 'invalid')
      })
      .catch(() => {
        if (!active) return
        setStatus('invalid')
      })

    return () => {
      active = false
    }
  }, [])

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Verifying admin session...
        </div>
      </div>
    )
  }

  if (status !== 'valid') {
    return <Navigate to="/super-admin/login" state={{ from: location }} replace />
  }

  return children
}
