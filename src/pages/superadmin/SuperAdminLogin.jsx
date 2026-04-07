import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck, Eye, EyeOff, Lock, GraduationCap,
  Loader2, KeyRound, AlertTriangle,
} from 'lucide-react'
import {
  isSuperAdminConfigured,
  loginSuperAdmin,
  setupSuperAdminPassword,
  validateSuperAdminSession,
} from '../../utils/superAdminAuth'

export default function SuperAdminLogin() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('checking')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true

    Promise.all([validateSuperAdminSession(), isSuperAdminConfigured()])
      .then(([hasSession, configured]) => {
        if (!active) return
        if (hasSession) {
          navigate('/super-admin/dashboard', { replace: true })
          return
        }
        setMode(configured ? 'login' : 'setup')
      })
      .catch(() => {
        if (!active) return
        setMode('setup')
      })

    return () => {
      active = false
    }
  }, [navigate])

  const isSetup = mode === 'setup'
  const title = isSetup ? 'Create Admin Password' : 'Admin Login'
  const subtitle = isSetup
    ? 'Set the super admin password for this device.'
    : 'Enter your administrator password'
  const buttonLabel = loading
    ? (isSetup ? 'Saving...' : 'Verifying...')
    : (isSetup ? 'Save Admin Password' : 'Sign In to Admin Panel')

  const canSubmit = useMemo(() => {
    if (loading) return false
    if (!password.trim()) return false
    if (!isSetup) return true
    return confirmPassword.trim().length > 0
  }, [confirmPassword, isSetup, loading, password])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (isSetup) {
      if (password.trim().length < 8) {
        setError('Password must be at least 8 characters long.')
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        return
      }
    }

    setLoading(true)
    try {
      if (isSetup) {
        await setupSuperAdminPassword(password)
        const ok = await loginSuperAdmin(password)
        if (!ok) throw new Error('Admin setup completed, but login could not be verified.')
      } else {
        const ok = await loginSuperAdmin(password)
        if (!ok) {
          setError('Incorrect password. Please try again.')
          setLoading(false)
          return
        }
      }

      navigate('/super-admin/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Admin authentication failed.')
      setLoading(false)
    }
  }

  if (mode === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading admin security...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-indigo-700 to-sky-800 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10 text-center">
          <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-3">MY School</h1>
          <p className="text-indigo-100 text-lg font-medium">Admin Security Console</p>
          <div className="mt-8 p-4 bg-white/10 backdrop-blur rounded-2xl max-w-xs">
            <p className="text-sm text-indigo-100 leading-relaxed">
              Super admin access stays local to this device and uses a hashed password plus validated session token.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">MY School</h1>
            <p className="text-sm text-indigo-600 mt-1">Admin Panel</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                {isSetup ? <KeyRound className="w-5 h-5 text-indigo-600" /> : <ShieldCheck className="w-5 h-5 text-indigo-600" />}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{title}</h2>
                <p className="text-xs text-gray-500">{subtitle}</p>
              </div>
            </div>

            {isSetup && (
              <div className="mb-4 flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                This runs only once on a fresh device. Remember this password carefully.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {isSetup ? 'New Password' : 'Password'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError('') }}
                    placeholder={isSetup ? 'Create admin password' : 'Enter admin password'}
                    autoFocus
                    className="w-full pl-9 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {isSetup && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <Lock className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => { setConfirmPassword(e.target.value); setError('') }}
                      placeholder="Re-enter password"
                      className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-colors"
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
              >
                {buttonLabel}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-gray-400 mt-5">
            MY School Management System · Local Admin Access
          </p>
        </div>
      </div>
    </div>
  )
}
