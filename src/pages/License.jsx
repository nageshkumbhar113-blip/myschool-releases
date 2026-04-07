import React, { useEffect, useState } from 'react'
import {
  Shield, CheckCircle, AlertTriangle, Clock,
  Key, Copy, Loader2, Crown, Zap,
  Users, Calendar, Monitor, ChevronDown, ChevronUp,
} from 'lucide-react'
import useLicenseStore from '../store/useLicenseStore'
import { getDeviceFingerprint, getShortDeviceId } from '../utils/deviceFingerprint'
import { countStudents } from '../utils/dbHelpers'
import clsx from 'clsx'

const TIER_META = {
  basic: { label: 'Basic', icon: Shield, color: 'gray' },
  pro: { label: 'Pro', icon: Zap, color: 'primary' },
  enterprise: { label: 'Enterprise', icon: Crown, color: 'purple' },
}

function TierBadge({ tier }) {
  const meta = TIER_META[tier] ?? TIER_META.basic
  const Icon = meta.icon
  const colorMap = {
    gray: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
    primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  }

  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold', colorMap[meta.color])}>
      <Icon className="w-3.5 h-3.5" />
      {meta.label}
    </span>
  )
}

function DaysLeftBadge({ daysLeft }) {
  if (daysLeft === null || daysLeft === undefined) return null

  const color =
    daysLeft > 60 ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' :
    daysLeft > 30 ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' :
      'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'

  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold', color)}>
      <Clock className="w-3.5 h-3.5" />
      {daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}
    </span>
  )
}

function StatCard({ label, value, sub, icon: Icon, color = 'gray' }) {
  const colorMap = {
    gray: 'bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400',
    primary: 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
  }

  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', colorMap[color])}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
        <p className="text-base font-bold text-gray-900 dark:text-white truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 truncate">{sub}</p>}
      </div>
    </div>
  )
}

export default function License() {
  const {
    payload, daysLeft, warnings, activate,
    activating, activateError, clearActivateError,
  } = useLicenseStore()

  const [deviceId, setDeviceId] = useState('')
  const [deviceCode, setDeviceCode] = useState('')
  const [showUpdate, setShowUpdate] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [copiedField, setCopiedField] = useState('')
  const [studentCount, setStudentCount] = useState(0)

  useEffect(() => {
    Promise.all([getShortDeviceId(), getDeviceFingerprint()])
      .then(([shortId, fullCode]) => {
        setDeviceId(shortId)
        setDeviceCode(fullCode)
      })
  }, [])

  useEffect(() => {
    const instituteId = payload?.instituteId
    if (!instituteId) {
      setStudentCount(0)
      return
    }

    countStudents(instituteId)
      .then(setStudentCount)
      .catch(() => setStudentCount(0))
  }, [payload?.instituteId])

  const copy = (text, field) => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopiedField(field)
    setTimeout(() => setCopiedField(''), 2500)
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    clearActivateError()
    const ok = await activate(newKey)
    if (ok) {
      setNewKey('')
      setShowUpdate(false)
    }
  }

  const expiryDisplay = payload?.expiresAt
    ? new Date(payload.expiresAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : '-'

  const maxStudents = Number(payload?.maxStudents ?? 0)
  const studentPct = maxStudents ? Math.round((studentCount / maxStudents) * 100) : 0

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">License Management</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Subscription status, device binding, and license details
        </p>
      </div>

      {warnings.map((warning, index) => (
        <div key={index} className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          {warning}
        </div>
      ))}

      <div className={clsx(
        'card p-6 border-2',
        daysLeft !== null && daysLeft <= 30
          ? 'border-red-300 dark:border-red-700'
          : 'border-primary-200 dark:border-primary-800',
      )}>
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center shadow-md">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {payload?.instituteName ?? 'Licensed'}
              </h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                  <CheckCircle className="w-3 h-3" />
                  Active
                </span>
                <TierBadge tier={payload?.featureTier ?? 'basic'} />
                <DaysLeftBadge daysLeft={daysLeft} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Expires On"
            value={expiryDisplay}
            icon={Calendar}
            color={daysLeft !== null && daysLeft <= 30 ? 'red' : 'primary'}
          />
          <StatCard
            label="Days Remaining"
            value={daysLeft !== null ? `${daysLeft} days` : '-'}
            icon={Clock}
            color={daysLeft !== null && daysLeft <= 30 ? 'red' : daysLeft <= 60 ? 'yellow' : 'green'}
          />
          <StatCard
            label="Students"
            value={`${studentCount} / ${maxStudents || '-'}`}
            sub={maxStudents ? `${studentPct}% used` : undefined}
            icon={Users}
            color={studentPct >= 90 ? 'red' : 'gray'}
          />
          <StatCard
            label="Feature Tier"
            value={(payload?.featureTier ?? 'basic').charAt(0).toUpperCase() + (payload?.featureTier ?? 'basic').slice(1)}
            icon={Crown}
            color="primary"
          />
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Monitor className="w-4 h-4 text-gray-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-400">Device ID</p>
              <p className="text-xs font-mono text-gray-700 dark:text-gray-300 truncate">{deviceId || 'Loading...'}</p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <button
              onClick={() => copy(deviceId, 'id')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
            >
              {copiedField === 'id' ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedField === 'id' ? 'Copied!' : 'Copy ID'}
            </button>
            <button
              onClick={() => copy(deviceCode, 'code')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
            >
              {copiedField === 'code' ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedField === 'code' ? 'Copied!' : 'Copy Code'}
            </button>
          </div>
        </div>
        {deviceCode && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-400 mb-1">Device Binding Code</p>
            <p className="text-[11px] font-mono break-all text-gray-700 dark:text-gray-300">{deviceCode}</p>
            <p className="text-[11px] text-gray-400 mt-1">Share this binding code with super admin to generate a license from another PC.</p>
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <button
          onClick={() => setShowUpdate(!showUpdate)}
          className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
              <Key className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Update License Key</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Enter a new device-bound key to renew or upgrade</p>
            </div>
          </div>
          {showUpdate ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {showUpdate && (
          <form onSubmit={handleUpdate} className="px-5 pb-5 space-y-3 border-t border-gray-100 dark:border-gray-800 pt-4">
            <textarea
              value={newKey}
              onChange={(e) => { setNewKey(e.target.value); clearActivateError() }}
              placeholder="Paste new license key here..."
              rows={3}
              className={clsx(
                'w-full rounded-xl border px-3 py-2.5 text-sm font-mono resize-none',
                'bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-primary-500',
                activateError ? 'border-red-400 dark:border-red-600' : 'border-gray-300 dark:border-gray-600',
              )}
            />
            {activateError && (
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                {activateError}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={activating || !newKey.trim()}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-colors',
                  activating || !newKey.trim()
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                    : 'bg-primary-600 hover:bg-primary-700 text-white',
                )}
              >
                {activating
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Validating...</>
                  : <><CheckCircle className="w-4 h-4" /> Activate</>
                }
              </button>
              <button
                type="button"
                onClick={() => { setShowUpdate(false); setNewKey(''); clearActivateError() }}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
