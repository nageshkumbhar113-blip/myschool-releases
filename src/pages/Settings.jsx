/**
 * Settings.jsx
 *
 * School settings page — header/footer data used in LC, certificates, etc.
 * One record per institute stored in IndexedDB.
 *
 * Sections:
 *  1. School Information  (name, address, UDISE, board, phone)
 *  2. Staff Information   (principal name, clerk name)
 *  3. Images              (logo, signature, stamp)
 */

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Settings as SettingsIcon, Save, Loader2,
  School, Users, Image, Upload, X, CheckCircle, RefreshCw,
  Lock, Eye, EyeOff, KeyRound, AlertTriangle, Copy, Download,
} from 'lucide-react'
import useSettingsStore    from '../store/useSettingsStore'
import useAppStore         from '../store/useAppStore'
import useSchoolAuthStore  from '../store/useSchoolAuthStore'
import { validatePasswordRules } from '../utils/schoolAuth'
import clsx                from 'clsx'

// ── Image upload helper ────────────────────────────────────────────────────

function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ── Image upload field ─────────────────────────────────────────────────────

function ImageField({ label, value, onChange, hint }) {
  const inputRef = useRef(null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    const b64 = await readAsBase64(file)
    onChange(b64)
    e.target.value = ''
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {label}
      </label>

      {value ? (
        <div className="relative inline-block">
          <img
            src={value}
            alt={label}
            className="h-20 max-w-[180px] object-contain rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2"
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:border-primary-400 hover:text-primary-600 dark:hover:border-primary-500 dark:hover:text-primary-400 transition-colors w-fit"
        >
          <Upload className="w-4 h-4" />
          Upload {label}
        </button>
      )}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  )
}

// ── Section header ─────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
      <div className="w-7 h-7 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
        <Icon className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
      </div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
    </div>
  )
}

// ── Text input field ───────────────────────────────────────────────────────

function Field({ label, name, value, onChange, placeholder, required, textarea }) {
  const cls = 'input text-sm py-2'
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {textarea ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={3}
          className={clsx(cls, 'resize-none')}
        />
      ) : (
        <input
          type="text"
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={cls}
        />
      )}
    </div>
  )
}

// ── Security — password input helper ──────────────────────────────────────

function PwdInput({ label, value, onChange, show, onToggleShow, placeholder, autoComplete }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</label>
      <div className="relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <Lock className="w-3.5 h-3.5 text-gray-400" />
        </div>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full pl-8 pr-9 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

// ── Security — regenerate recovery code modal ──────────────────────────────

function RegenCodeModal({ recoveryCode, onDone }) {
  const [copied,  setCopied]  = useState(false)
  const [checked, setChecked] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCode)
    } catch {
      const el = document.createElement('textarea')
      el.value = recoveryCode
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const content = [
      'MY School — Recovery Code',
      '========================',
      '',
      `Recovery Code: ${recoveryCode}`,
      '',
      'IMPORTANT: Keep this in a safe place. If you forget your password,',
      'this code lets you reset it. This code will NOT be shown again.',
      '',
      `Generated: ${new Date().toLocaleString()}`,
    ].join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'school-recovery-code.txt'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-sm">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">New Recovery Code</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Save this — old code is now invalid</p>
            </div>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-2 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            This code will <strong className="ml-0.5">NOT</strong> be shown again.
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
            <p className="font-mono text-base font-bold text-gray-900 dark:text-white tracking-wider text-center break-all">
              {recoveryCode}
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={handleCopy}
              className={clsx('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium border transition-colors',
                copied
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50')}>
              {copied ? <><CheckCircle className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
            </button>
            <button type="button" onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors">
              <Download className="w-3.5 h-3.5" /> Download
            </button>
          </div>
          <label className="flex items-start gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)}
              className="mt-0.5 w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <span className="text-xs text-gray-700 dark:text-gray-300">I have saved this code in a safe place.</span>
          </label>
          <button type="button" onClick={onDone} disabled={!checked}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Security section card ──────────────────────────────────────────────────

function SecuritySection() {
  const { changePassword, regenerateRecoveryCode, loading } = useSchoolAuthStore()

  // Change password state
  const [curPwd,   setCurPwd]   = useState('')
  const [newPwd,   setNewPwd]   = useState('')
  const [confirmP, setConfirmP] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [pwdError, setPwdError] = useState('')
  const [pwdOk,    setPwdOk]    = useState(false)

  // Regen state
  const [regenPwd,   setRegenPwd]   = useState('')
  const [showRegen,  setShowRegen]  = useState(false)
  const [regenError, setRegenError] = useState('')
  const [regenCode,  setRegenCode]  = useState(null)

  const newPwdValidation = useMemo(() => {
    if (!newPwd) return null
    return validatePasswordRules(newPwd)
  }, [newPwd])

  const canChangePwd = useMemo(() => {
    if (loading || !curPwd || !newPwd || !confirmP) return false
    if (newPwdValidation && !newPwdValidation.valid) return false
    if (newPwd !== confirmP) return false
    return true
  }, [loading, curPwd, newPwd, confirmP, newPwdValidation])

  const handleChangePwd = async (e) => {
    e.preventDefault()
    setPwdError('')
    setPwdOk(false)
    const result = await changePassword(curPwd, newPwd)
    if (result.ok) {
      setPwdOk(true)
      setCurPwd(''); setNewPwd(''); setConfirmP('')
      setTimeout(() => setPwdOk(false), 3000)
    } else {
      setPwdError(result.error || 'Failed to change password.')
    }
  }

  const handleRegen = async (e) => {
    e.preventDefault()
    setRegenError('')
    const result = await regenerateRecoveryCode(regenPwd)
    if (result.error) {
      setRegenError(result.error)
    } else {
      setRegenCode(result.recoveryCode)
      setRegenPwd('')
    }
  }

  return (
    <>
      <div className="card p-5 space-y-6">
        <SectionHeader icon={Lock} title="Security" />

        {/* Change Password */}
        <div>
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">
            Change Password
          </h4>
          <form onSubmit={handleChangePwd} className="space-y-3 max-w-sm">
            <PwdInput
              label="Current Password"
              value={curPwd}
              onChange={e => { setCurPwd(e.target.value); setPwdError('') }}
              show={showPwd} onToggleShow={() => setShowPwd(v => !v)}
              placeholder="Enter current password"
              autoComplete="current-password"
            />
            <PwdInput
              label="New Password"
              value={newPwd}
              onChange={e => { setNewPwd(e.target.value); setPwdError('') }}
              show={showPwd} onToggleShow={() => setShowPwd(v => !v)}
              placeholder="Min 8 chars, 1 number"
              autoComplete="new-password"
            />
            {newPwd && newPwdValidation && !newPwdValidation.valid && (
              <p className="text-xs text-red-500">{newPwdValidation.error}</p>
            )}
            <PwdInput
              label="Confirm New Password"
              value={confirmP}
              onChange={e => { setConfirmP(e.target.value); setPwdError('') }}
              show={showPwd} onToggleShow={() => setShowPwd(v => !v)}
              placeholder="Re-enter new password"
              autoComplete="new-password"
            />
            {confirmP && newPwd && confirmP !== newPwd && (
              <p className="text-xs text-red-500">Passwords do not match.</p>
            )}
            {pwdError && (
              <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />{pwdError}
              </div>
            )}
            {pwdOk && (
              <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-3 py-2">
                <CheckCircle className="w-3.5 h-3.5" /> Password changed successfully!
              </div>
            )}
            <button
              type="submit"
              disabled={!canChangePwd}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</>
                : <><Lock className="w-4 h-4" /> Update Password</>
              }
            </button>
          </form>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 dark:border-gray-800" />

        {/* Regenerate Recovery Code */}
        <div>
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
            Recovery Code
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Generate a new recovery code. The old code will be permanently invalidated.
          </p>
          <form onSubmit={handleRegen} className="space-y-3 max-w-sm">
            <PwdInput
              label="Confirm Current Password"
              value={regenPwd}
              onChange={e => { setRegenPwd(e.target.value); setRegenError('') }}
              show={showRegen} onToggleShow={() => setShowRegen(v => !v)}
              placeholder="Enter current password to confirm"
              autoComplete="current-password"
            />
            {regenError && (
              <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />{regenError}
              </div>
            )}
            <button
              type="submit"
              disabled={!regenPwd || loading}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                : <><KeyRound className="w-4 h-4" /> Regenerate Recovery Code</>
              }
            </button>
          </form>
        </div>
      </div>

      {regenCode && (
        <RegenCodeModal recoveryCode={regenCode} onDone={() => setRegenCode(null)} />
      )}
    </>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

const EMPTY = {
  organizationName:      '',
  organizationNameColor: '',
  schoolName:            '',
  schoolNameColor:       '',
  address:               '',
  udiseCode:             '',
  boardName:             '',
  phone:                 '',
  registrationNo:        '',
  sscIndexNo:            '',
  schoolCode:            '',
  principalName:         '',
  clerkName:             '',
  logo:                  '',
  signature:             '',
  stamp:                 '',
}

export default function Settings() {
  const { currentInstituteId, currentInstituteName, selectedInstitute } = useAppStore()
  const { settings, loading, saving, loadSettings, saveSettings } = useSettingsStore()

  const instituteId = currentInstituteId || selectedInstitute || null
  const institute   = { name: currentInstituteName }

  const [form,        setForm]        = useState(EMPTY)
  const [toast,       setToast]       = useState(null)
  const [dirty,       setDirty]       = useState(false)
  const [appVersion,  setAppVersion]  = useState('')
  const [updateState, setUpdateState] = useState('idle') // idle | checking | available | latest | error

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return
    api.getVersion?.().then(v => setAppVersion(v)).catch(() => {})
    const unsubAvail = api.onUpdateAvailable?.((info) => {
      setUpdateState('available:' + (info?.version ?? ''))
    })
    const unsubNone  = api.onUpdateNotAvailable?.(() => setUpdateState('latest'))
    const unsubErr   = api.onUpdateError?.(() => setUpdateState('error'))
    return () => { unsubAvail?.(); unsubNone?.(); unsubErr?.() }
  }, [])

  // Load settings on mount / institute change
  useEffect(() => {
    if (instituteId) loadSettings(instituteId)
  }, [instituteId])

  // Populate form when settings load
  useEffect(() => {
    setForm({ ...EMPTY, ...(settings ?? {}) })
    setDirty(false)
  }, [settings])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    setDirty(true)
  }

  const handleImage = (key) => (value) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSaveSettings = async () => {
    if (!instituteId) return showToast('No institute selected', 'error')
    if (!form.schoolName.trim()) return showToast('School name is required', 'error')

    const ok = await saveSettings(instituteId, {
      organizationName:      form.organizationName.trim(),
      organizationNameColor: form.organizationNameColor,
      schoolName:            form.schoolName.trim(),
      schoolNameColor:       form.schoolNameColor,
      address:               form.address.trim(),
      udiseCode:             form.udiseCode.trim(),
      boardName:             form.boardName.trim(),
      phone:                 form.phone.trim(),
      registrationNo:        form.registrationNo.trim(),
      sscIndexNo:            form.sscIndexNo.trim(),
      schoolCode:            form.schoolCode.trim(),
      principalName:         form.principalName.trim(),
      clerkName:             form.clerkName.trim(),
      logo:                  form.logo,
      signature:             form.signature,
      stamp:                 form.stamp,
    })

    if (ok) {
      setDirty(false)
      showToast('Settings saved successfully')
    } else {
      showToast('Failed to save settings', 'error')
    }
  }

  if (!instituteId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <SettingsIcon className="w-12 h-12 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-400">No institute found. Add one first.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">School Settings</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Header and footer data for LC, certificates · {institute?.name}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={saving || !dirty}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors',
            saving || !dirty
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
              : 'bg-primary-600 hover:bg-primary-700 text-white'
          )}
        >
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
            : <><Save className="w-4 h-4" /> Save Settings</>
          }
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-7 h-7 animate-spin text-primary-600" />
        </div>
      ) : (
        <>
          {/* School Information */}
          <div className="card p-5">
            <SectionHeader icon={School} title="School Information" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Organization Name + color */}
              <div className="sm:col-span-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Organization Name</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text" name="organizationName"
                      value={form.organizationName} onChange={handleChange}
                      placeholder="e.g. Shri Dnyaneshwar Shikshan Sanstha"
                      className="input text-sm py-2 flex-1"
                    />
                    <div className="flex flex-col items-center gap-0.5 shrink-0">
                      <input
                        type="color" name="organizationNameColor"
                        value={form.organizationNameColor || '#333333'} onChange={handleChange}
                        className="w-9 h-9 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer p-0.5 bg-white dark:bg-gray-800"
                        title="Organization name colour"
                      />
                      <span className="text-[10px] text-gray-400">Color</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* School Name + color */}
              <div className="sm:col-span-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    School Name<span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text" name="schoolName"
                      value={form.schoolName} onChange={handleChange}
                      placeholder="e.g. Sunrise English Medium School"
                      className="input text-sm py-2 flex-1"
                    />
                    <div className="flex flex-col items-center gap-0.5 shrink-0">
                      <input
                        type="color" name="schoolNameColor"
                        value={form.schoolNameColor || '#111111'} onChange={handleChange}
                        className="w-9 h-9 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer p-0.5 bg-white dark:bg-gray-800"
                        title="School name colour"
                      />
                      <span className="text-[10px] text-gray-400">Color</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2">
                <Field
                  label="Address" name="address"
                  value={form.address} onChange={handleChange}
                  placeholder="Full school address"
                  textarea
                />
              </div>
              <Field
                label="UDISE Code" name="udiseCode"
                value={form.udiseCode} onChange={handleChange}
                placeholder="e.g. 27040101101"
              />
              <Field
                label="Board Name" name="boardName"
                value={form.boardName} onChange={handleChange}
                placeholder="e.g. SSC Board, CBSE, ICSE"
              />
              <Field
                label="Phone" name="phone"
                value={form.phone} onChange={handleChange}
                placeholder="e.g. +91 98765 43210"
              />
              <Field
                label="Registration No." name="registrationNo"
                value={form.registrationNo} onChange={handleChange}
                placeholder="e.g. REG/2024/001"
              />
              <Field
                label="SSC Index No." name="sscIndexNo"
                value={form.sscIndexNo} onChange={handleChange}
                placeholder="e.g. 123456"
              />
              <Field
                label="School Code" name="schoolCode"
                value={form.schoolCode} onChange={handleChange}
                placeholder="e.g. 31201"
              />
            </div>
          </div>

          {/* Staff Information */}
          <div className="card p-5">
            <SectionHeader icon={Users} title="Staff Information" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Principal / Head Master Name" name="principalName"
                value={form.principalName} onChange={handleChange}
                placeholder="Full name"
              />
              <Field
                label="Clerk / Office Staff Name" name="clerkName"
                value={form.clerkName} onChange={handleChange}
                placeholder="Full name"
              />
            </div>
          </div>

          {/* App Update */}
          {window.electronAPI && (
            <div className="card p-5">
              <SectionHeader icon={RefreshCw} title="App Update" />
              <div className="flex items-center gap-4 flex-wrap">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Current version: <span className="font-semibold text-gray-900 dark:text-white">v{appVersion || '…'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUpdateState('checking')
                    window.electronAPI.checkForUpdates?.()
                  }}
                  disabled={updateState === 'checking'}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors',
                    updateState === 'checking'
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                      : 'bg-primary-600 hover:bg-primary-700 text-white'
                  )}
                >
                  <RefreshCw className={clsx('w-4 h-4', updateState === 'checking' && 'animate-spin')} />
                  {updateState === 'checking' ? 'Checking…' : 'Check for Updates'}
                </button>
                {updateState === 'latest' && (
                  <span className="text-sm text-green-600 dark:text-green-400 font-medium">Latest version installed</span>
                )}
                {updateState?.startsWith('available:') && (
                  <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                    v{updateState.split(':')[1]} available — check the notification banner
                  </span>
                )}
                {updateState === 'error' && (
                  <span className="text-sm text-red-500 font-medium">Update check failed</span>
                )}
              </div>
            </div>
          )}

          {/* Images */}
          <div className="card p-5">
            <SectionHeader icon={Image} title="School Images" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <ImageField
                label="School Logo"
                value={form.logo}
                onChange={handleImage('logo')}
                hint="PNG/JPG, shows in LC header"
              />
              <ImageField
                label="Signature"
                value={form.signature}
                onChange={handleImage('signature')}
                hint="Principal/Clerk signature image"
              />
              <ImageField
                label="School Stamp"
                value={form.stamp}
                onChange={handleImage('stamp')}
                hint="Official school stamp/seal"
              />
            </div>
          </div>

        </>
      )}

      {/* Security section — outside the settings form, has its own forms */}
      {!loading && <SecuritySection />}

      {/* Toast */}
      {toast && (
        <div className={clsx(
          'fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all',
          toast.type === 'error'
            ? 'bg-red-600 text-white'
            : 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
        )}>
          {toast.type !== 'error' && <CheckCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}
