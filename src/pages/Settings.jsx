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

import React, { useEffect, useRef, useState } from 'react'
import {
  Settings as SettingsIcon, Save, Loader2,
  School, Users, Image, Upload, X, CheckCircle,
} from 'lucide-react'
import useSettingsStore from '../store/useSettingsStore'
import useAppStore      from '../store/useAppStore'
import clsx             from 'clsx'

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

// ── Main component ─────────────────────────────────────────────────────────

const EMPTY = {
  organizationName: '',
  schoolName:       '',
  address:          '',
  udiseCode:        '',
  boardName:        '',
  phone:            '',
  principalName:    '',
  clerkName:        '',
  logo:             '',
  signature:        '',
  stamp:            '',
}

export default function Settings() {
  const { currentInstituteId, currentInstituteName, selectedInstitute } = useAppStore()
  const { settings, loading, saving, loadSettings, saveSettings } = useSettingsStore()

  const instituteId = currentInstituteId || selectedInstitute || null
  const institute   = { name: currentInstituteName }

  const [form,  setForm]  = useState(EMPTY)
  const [toast, setToast] = useState(null)
  const [dirty, setDirty] = useState(false)

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!instituteId) return showToast('No institute selected', 'error')
    if (!form.schoolName.trim()) return showToast('School name is required', 'error')

    const ok = await saveSettings(instituteId, {
      organizationName: form.organizationName.trim(),
      schoolName:       form.schoolName.trim(),
      address:          form.address.trim(),
      udiseCode:        form.udiseCode.trim(),
      boardName:        form.boardName.trim(),
      phone:            form.phone.trim(),
      principalName:    form.principalName.trim(),
      clerkName:        form.clerkName.trim(),
      logo:             form.logo,
      signature:        form.signature,
      stamp:            form.stamp,
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
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">School Settings</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Header and footer data for LC, certificates · {institute?.name}
          </p>
        </div>
        <button
          type="submit"
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
              <div className="sm:col-span-2">
                <Field
                  label="Organization Name" name="organizationName"
                  value={form.organizationName} onChange={handleChange}
                  placeholder="e.g. Shri Dnyaneshwar Shikshan Sanstha"
                />
              </div>
              <div className="sm:col-span-2">
                <Field
                  label="School Name" name="schoolName"
                  value={form.schoolName} onChange={handleChange}
                  placeholder="e.g. Sunrise English Medium School"
                  required
                />
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
    </form>
  )
}
