/**
 * SchoolLogin.jsx
 *
 * School-level authentication page — two modes:
 *   setup  — First launch: create password + show recovery code
 *   login  — Subsequent launches: enter password to access app
 *
 * School name displayed from license payload (useLicenseStore).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  GraduationCap, Lock, Eye, EyeOff, AlertTriangle,
  Copy, Download, KeyRound, ShieldCheck, CheckCircle,
  RotateCcw, Loader2,
} from 'lucide-react'
import useSchoolAuthStore from '../store/useSchoolAuthStore'
import useLicenseStore    from '../store/useLicenseStore'
import { validatePasswordRules } from '../utils/schoolAuth'
import clsx from 'clsx'

// ── RecoveryCodeModal ──────────────────────────────────────────────────────

function RecoveryCodeModal({ recoveryCode, onDone }) {
  const [copied,  setCopied]  = useState(false)
  const [checked, setChecked] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for environments without clipboard API
      const el = document.createElement('textarea')
      el.value = recoveryCode
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownload = () => {
    const content = [
      'MY School — Recovery Code',
      '========================',
      '',
      `Recovery Code: ${recoveryCode}`,
      '',
      'IMPORTANT:',
      '- Keep this code in a safe place.',
      '- If you forget your password, this code lets you reset it.',
      '- This code will NOT be shown again.',
      '- If lost, you may need to reinstall the app.',
      '',
      `Generated: ${new Date().toLocaleString()}`,
    ].join('\n')

    const blob = new Blob([content], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'school-recovery-code.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Your Recovery Code</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Save this before continuing</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Warnings */}
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2.5">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>This code will <strong>NOT</strong> be shown again.</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2.5">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>If you lose this code, you may need to <strong>reinstall the app</strong> to recover access.</span>
            </div>
          </div>

          {/* Code display */}
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium uppercase tracking-wider">Recovery Code</p>
            <p className="font-mono text-lg font-bold text-gray-900 dark:text-white tracking-widest text-center break-all">
              {recoveryCode}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-colors',
                copied
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750',
              )}
            >
              {copied
                ? <><CheckCircle className="w-4 h-4" /> Copied!</>
                : <><Copy className="w-4 h-4" /> Copy</>
              }
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <Download className="w-4 h-4" /> Download .txt
            </button>
          </div>

          {/* Confirmation checkbox */}
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              I have saved this recovery code in a safe place.
            </span>
          </label>

          {/* Continue button */}
          <button
            type="button"
            onClick={onDone}
            disabled={!checked}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            Continue to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ForgotPasswordModal ────────────────────────────────────────────────────

function ForgotPasswordModal({ onClose }) {
  const [step,    setStep]    = useState('code')  // 'code' | 'newpwd' | 'done'
  const [code,    setCode]    = useState('')
  const [newPwd,  setNewPwd]  = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const { verifyRecoveryCode, resetPasswordWithCode } = useSchoolAuthStore()

  const pwdError = useMemo(() => {
    if (!newPwd) return null
    return validatePasswordRules(newPwd).error
  }, [newPwd])

  const handleCodeSubmit = async (e) => {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    setError('')
    try {
      const valid = await verifyRecoveryCode(code.trim())
      if (!valid) {
        setError('Invalid recovery code. Please check and try again.')
        return
      }
      setStep('newpwd')
    } finally {
      setLoading(false)
    }
  }

  const handleResetSubmit = async (e) => {
    e.preventDefault()
    if (pwdError) { setError(pwdError); return }
    if (newPwd !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    setError('')
    try {
      const result = await resetPasswordWithCode(code.trim(), newPwd)
      if (!result.ok) { setError(result.error || 'Reset failed.'); return }
      setStep('done')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-sm">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center">
              <RotateCcw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Reset Password</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {step === 'done' ? (
            <div className="text-center space-y-3">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
              <p className="font-semibold text-gray-900 dark:text-white">Password Reset!</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">You are now logged in with your new password.</p>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          ) : step === 'code' ? (
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Enter the recovery code you saved during setup.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Recovery Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => { setCode(e.target.value); setError('') }}
                  placeholder="XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX"
                  autoFocus
                  className="w-full px-3 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-mono text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              {error && (
                <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2.5">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={!code.trim() || loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}
                Verify Code
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Recovery code verified. Enter your new password.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={newPwd}
                    onChange={(e) => { setNewPwd(e.target.value); setError('') }}
                    placeholder="Min 8 chars, 1 number"
                    autoFocus
                    className="w-full pl-3 pr-10 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {pwdError && <p className="text-xs text-red-500 mt-1">{pwdError}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirm Password</label>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setError('') }}
                  placeholder="Re-enter password"
                  className="w-full px-3 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              {error && (
                <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2.5">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={!newPwd || !confirm || !!pwdError || loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}
                Reset Password
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Lockout countdown hook ─────────────────────────────────────────────────

function useLockCountdown(lockUntil) {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    if (!lockUntil) { setRemaining(0); return }

    const tick = () => {
      const diff = Math.max(0, lockUntil - Date.now())
      setRemaining(diff)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [lockUntil])

  if (!remaining) return null
  const secs = Math.ceil(remaining / 1000)
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

// ── Main SchoolLogin component ─────────────────────────────────────────────

export default function SchoolLogin({ mode }) {
  const { payload } = useLicenseStore()
  const schoolName  = payload?.instituteName || 'My School'

  const {
    setupPassword, login, loading, error, clearError,
    loginAttempts, lockUntil,
    setupRecoveryCode, acknowledgeSetup,
  } = useSchoolAuthStore()

  // Form state
  const [password,   setPassword]   = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showPwd,    setShowPwd]    = useState(false)

  // Modals
  const [showForgot, setShowForgot] = useState(false)

  const countdown = useLockCountdown(lockUntil)
  const isLocked  = countdown !== null

  // Inline password validation for setup mode
  const pwdValidation = useMemo(() => {
    if (mode !== 'setup' || !password) return null
    return validatePasswordRules(password)
  }, [mode, password])

  const canSubmit = useMemo(() => {
    if (loading || isLocked) return false
    if (!password) return false
    if (mode === 'setup') {
      if (pwdValidation && !pwdValidation.valid) return false
      if (!confirmPwd) return false
    }
    return true
  }, [loading, isLocked, password, mode, pwdValidation, confirmPwd])

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearError()

    if (mode === 'setup') {
      if (password !== confirmPwd) {
        // Store error via clearError + set via local — use store error pattern
        useSchoolAuthStore.setState({ error: 'Passwords do not match.' })
        return
      }
      // setupPassword sets store.setupRecoveryCode → RecoveryCodeModal auto-shows
      await setupPassword(password)
    } else {
      await login(password)
    }
  }

  const handleChange = (setter) => (e) => {
    setter(e.target.value)
    clearError()
  }

  return (
    <>
      <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
        {/* Left decorative panel — desktop only */}
        <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex-col items-center justify-center p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/3" />

          <div className="relative z-10 text-center">
            <div className="w-24 h-24 bg-white/20 backdrop-blur rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <GraduationCap className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-white mb-2 leading-tight">{schoolName}</h1>
            <p className="text-blue-100 text-base font-medium">School Management System</p>
            <div className="mt-8 p-4 bg-white/10 backdrop-blur rounded-2xl max-w-xs">
              <p className="text-sm text-blue-100 leading-relaxed">
                {mode === 'setup'
                  ? 'Create a password to secure your school data. This is a one-time setup.'
                  : 'Your school data is protected. Enter your password to continue.'}
              </p>
            </div>
          </div>
        </div>

        {/* Right form panel */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm">
            {/* Mobile branding */}
            <div className="lg:hidden text-center mb-8">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{schoolName}</h1>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-0.5">School Management System</p>
            </div>

            {/* Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-8">

              {/* Card header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center">
                  {mode === 'setup'
                    ? <KeyRound className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    : <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  }
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">
                    {mode === 'setup' ? 'Setup School Login' : 'Welcome Back'}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {mode === 'setup'
                      ? 'Create a password to protect school data'
                      : `Sign in to ${schoolName}`}
                  </p>
                </div>
              </div>

              {/* Setup notice */}
              {mode === 'setup' && (
                <div className="mb-4 flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2.5">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>This setup runs once. You will be shown a recovery code — please save it.</span>
                </div>
              )}

              {/* Lockout banner */}
              {isLocked && (
                <div className="mb-4 flex items-center gap-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Too many attempts. Try again in <strong className="ml-1">{countdown}</strong>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Password field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {mode === 'setup' ? 'New Password' : 'Password'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <Lock className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={handleChange(setPassword)}
                      placeholder={mode === 'setup' ? 'Min 8 chars, 1 number' : 'Enter your password'}
                      autoFocus
                      autoComplete={mode === 'setup' ? 'new-password' : 'current-password'}
                      className="w-full pl-9 pr-10 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-750 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(v => !v)}
                      className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Inline rule hint for setup */}
                  {mode === 'setup' && password && pwdValidation && !pwdValidation.valid && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1">{pwdValidation.error}</p>
                  )}
                  {mode === 'setup' && password && pwdValidation?.valid && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Password looks good
                    </p>
                  )}
                </div>

                {/* Confirm password — setup only */}
                {mode === 'setup' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <Lock className="w-4 h-4 text-gray-400" />
                      </div>
                      <input
                        type={showPwd ? 'text' : 'password'}
                        value={confirmPwd}
                        onChange={handleChange(setConfirmPwd)}
                        placeholder="Re-enter password"
                        autoComplete="new-password"
                        className="w-full pl-9 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-750 transition-colors"
                      />
                    </div>
                    {confirmPwd && password && confirmPwd !== password && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-1">Passwords do not match.</p>
                    )}
                  </div>
                )}

                {/* Error message */}
                {error && !isLocked && (
                  <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2.5">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    {error}
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
                >
                  {loading
                    ? <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {mode === 'setup' ? 'Setting up...' : 'Signing in...'}
                      </span>
                    : mode === 'setup' ? 'Set Password & Continue' : 'Sign In'
                  }
                </button>

                {/* Forgot password — login mode only */}
                {mode === 'login' && (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => { clearError(); setShowForgot(true) }}
                      className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </form>
            </div>

            <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-5">
              MY School Management System · Secured Login
            </p>
          </div>
        </div>
      </div>

      {/* Recovery code modal — shown after successful setup, cleared on acknowledge */}
      {setupRecoveryCode && (
        <RecoveryCodeModal
          recoveryCode={setupRecoveryCode}
          onDone={acknowledgeSetup}
        />
      )}

      {/* Forgot password modal */}
      {showForgot && (
        <ForgotPasswordModal onClose={() => setShowForgot(false)} />
      )}
    </>
  )
}
