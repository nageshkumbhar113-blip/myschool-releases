import React, { useEffect, useState } from 'react'
import {
  Lock, Key, Shield, CheckCircle, AlertTriangle,
  RefreshCw, Copy, Loader2, GraduationCap,
  WifiOff, X,
} from 'lucide-react'
import useLicenseStore from '../store/useLicenseStore'
import { getDeviceFingerprint, getShortDeviceId } from '../utils/deviceFingerprint'
import clsx from 'clsx'

function KeyEntry({ title, subtitle, onSuccess, compact = false }) {
  const { activate, activating, activateError, clearActivateError } = useLicenseStore()
  const [key, setKey] = useState('')
  const [deviceId, setDeviceId] = useState('')
  const [deviceCode, setDeviceCode] = useState('')
  const [copiedField, setCopiedField] = useState('')

  useEffect(() => {
    Promise.all([getShortDeviceId(), getDeviceFingerprint()])
      .then(([shortId, fullCode]) => {
        setDeviceId(shortId)
        setDeviceCode(fullCode)
      })
  }, [])

  const handleActivate = async (e) => {
    e?.preventDefault()
    clearActivateError()
    const ok = await activate(key)
    if (ok) onSuccess?.()
  }

  const copyValue = (value, field) => {
    navigator.clipboard.writeText(value).catch(() => {})
    setCopiedField(field)
    setTimeout(() => setCopiedField(''), 2000)
  }

  return (
    <form onSubmit={handleActivate} className={clsx('space-y-4', compact ? 'mt-4' : 'mt-6')}>
      {!compact && (
        <div className="text-center mb-2">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
          {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
          License Key
        </label>
        <textarea
          value={key}
          onChange={e => { setKey(e.target.value); clearActivateError() }}
          placeholder="Paste your license key here..."
          rows={3}
          className={clsx(
            'w-full rounded-xl border px-3 py-2.5 text-sm font-mono resize-none',
            'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-primary-500',
            activateError ? 'border-red-400 dark:border-red-600' : 'border-gray-300 dark:border-gray-600',
          )}
        />
        {activateError && (
          <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            {activateError}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={activating || !key.trim()}
        className={clsx(
          'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors',
          activating || !key.trim()
            ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            : 'bg-primary-600 hover:bg-primary-700 text-white',
        )}
      >
        {activating
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Validating...</>
          : <><Key className="w-4 h-4" /> Activate License</>
        }
      </button>

      {deviceId && deviceCode && (
        <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-gray-400 mb-0.5">Device ID</p>
              <p className="text-xs font-mono text-gray-700 dark:text-gray-300 truncate">{deviceId}</p>
            </div>
            <button
              type="button"
              onClick={() => copyValue(deviceId, 'id')}
              className="shrink-0 p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {copiedField === 'id' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-gray-400 mb-0.5">Device Binding Code (share this with Admin Tool)</p>
              <p className="text-[11px] font-mono text-gray-700 dark:text-gray-300 break-all">{deviceCode}</p>
            </div>
            <button
              type="button"
              onClick={() => copyValue(deviceCode, 'code')}
              className="shrink-0 p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {copiedField === 'code' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-gray-400">
            Super admin can generate the license on another PC using this binding code.
          </p>
        </div>
      )}
    </form>
  )
}

function SplashScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 gap-4">
      <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg">
        <GraduationCap className="w-8 h-8 text-white" />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Checking license...
      </p>
    </div>
  )
}

function ActivationScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-primary-50 dark:from-gray-950 dark:to-primary-950/20 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-primary-600 rounded-3xl flex items-center justify-center shadow-xl mb-4">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">MY School</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Management System</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
              <Key className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">License Required</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Enter the key provided by your administrator</p>
            </div>
          </div>

          <KeyEntry title="Activate License" subtitle="Only admin-generated, device-bound keys are accepted." />
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          MY School Management System · Secure & Offline-first
        </p>
      </div>
    </div>
  )
}

function LockScreen() {
  const { lockReason, payload, init } = useLicenseStore()
  const [showEntry, setShowEntry] = useState(false)

  const lockMessages = {
    expired: {
      icon: Lock,
      color: 'red',
      title: 'License Expired',
      message: `Your license expired on ${payload?.expiresAt
        ? new Date(payload.expiresAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
        : 'an unknown date'
      }. Renew your license to continue using the application.`,
    },
    'offline-grace': {
      icon: WifiOff,
      color: 'orange',
      title: 'Offline Grace Period Exceeded',
      message: 'The application has been offline for more than 30 days. Please connect to the internet and restart.',
    },
    'device-mismatch': {
      icon: Shield,
      color: 'purple',
      title: 'Device Not Authorized',
      message: 'This license is registered to a different device. Please contact your administrator for a new license.',
    },
  }

  const info = lockMessages[lockReason] ?? lockMessages.expired
  const Icon = info.icon

  const colorMap = {
    red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  }

  const borderMap = {
    red: 'border-red-200 dark:border-red-800',
    orange: 'border-orange-200 dark:border-orange-800',
    purple: 'border-purple-200 dark:border-purple-800',
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-red-50 dark:from-gray-950 dark:to-red-950/20 p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gray-300 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
            <GraduationCap className="w-8 h-8 text-gray-500 dark:text-gray-400" />
          </div>
        </div>

        <div className={clsx('bg-white dark:bg-gray-900 rounded-2xl shadow-xl border-2 p-6', borderMap[info.color])}>
          <div className="flex flex-col items-center text-center mb-6">
            <div className={clsx('w-16 h-16 rounded-2xl flex items-center justify-center mb-4', colorMap[info.color])}>
              <Icon className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{info.title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{info.message}</p>
          </div>

          {payload?.instituteName && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 mb-4 text-sm text-center">
              <p className="text-gray-400 text-xs mb-0.5">Registered to</p>
              <p className="font-semibold text-gray-900 dark:text-white">{payload.instituteName}</p>
            </div>
          )}

          <button
            onClick={() => setShowEntry(!showEntry)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              Enter new license key
            </span>
            <span className="text-xs text-gray-400">{showEntry ? '▲' : '▼'}</span>
          </button>

          {showEntry && (
            <KeyEntry compact title="" onSuccess={() => setShowEntry(false)} />
          )}
        </div>

        {lockReason === 'offline-grace' && (
          <button
            onClick={() => init()}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Connection
          </button>
        )}

        <p className="text-center text-xs text-gray-400 mt-4">
          MY School Management System
        </p>
      </div>
    </div>
  )
}

export default function LicenseGuard({ children }) {
  const { status, init, warnings } = useLicenseStore()

  useEffect(() => {
    init()
  }, [])

  if (status === 'checking') return <SplashScreen />
  if (status === 'locked') return <LockScreen />
  if (status === 'unlicensed') return <ActivationScreen />

  return (
    <>
      {warnings.length > 0 && (
        <WarningBanner warnings={warnings} />
      )}
      {children}
    </>
  )
}

function WarningBanner({ warnings }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed || !warnings.length) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white text-xs font-medium px-4 py-2 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        {warnings.map((warning, index) => <span key={index}>{warning}</span>)}
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 p-0.5 hover:bg-amber-600 rounded transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
