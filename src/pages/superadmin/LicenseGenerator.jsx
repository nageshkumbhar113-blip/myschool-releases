import { useEffect, useMemo, useState } from 'react'
import {
  Key, Copy, Check, RefreshCw, Building2, Calendar, Users, Sparkles, Monitor, CreditCard, ShieldCheck,
} from 'lucide-react'
import schoolDataService from '../../services/schoolDataService'
import { formatShortDeviceId, getDeviceFingerprint, getShortDeviceId } from '../../utils/deviceFingerprint'
import {
  formatLicenseKey,
  importPrivateKey,
  serializeLicense,
  signLicense,
} from '../../utils/licenseSigner'
import { ADMIN_LICENSE_PRIVATE_KEY_JWK } from './licenseSigningPrivateKey'
import clsx from 'clsx'

const TIERS = [
  { id: 'basic', label: 'Basic' },
  { id: 'pro', label: 'Pro' },
  { id: 'enterprise', label: 'Enterprise' },
]

export default function LicenseGenerator() {
  const [institutes, setInstitutes] = useState([])
  const [targetMode, setTargetMode] = useState('manual')
  const [form, setForm] = useState({
    instituteId: '',
    expiresAt: '',
    maxStudents: 500,
    featureTier: 'pro',
    paymentAmount: '',
    paymentDate: '',
    paymentStatus: 'paid',
  })
  const [generatedKey, setGeneratedKey] = useState('')
  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [currentDeviceHash, setCurrentDeviceHash] = useState('')
  const [currentDeviceId, setCurrentDeviceId] = useState('')
  const [targetDeviceCode, setTargetDeviceCode] = useState('')
  const [recentEntries, setRecentEntries] = useState([])
  const [privateKey, setPrivateKey] = useState(null)
  const [signingReady, setSigningReady] = useState(false)

  useEffect(() => {
    const expiry = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0]
    setForm(f => ({ ...f, expiresAt: expiry }))

    Promise.all([
      schoolDataService.institutes.list(true),
      getDeviceFingerprint(),
      getShortDeviceId(),
      importPrivateKey(ADMIN_LICENSE_PRIVATE_KEY_JWK),
    ]).then(([list, fullFingerprint, shortId, importedPrivateKey]) => {
      setInstitutes(list.sort((a, b) => a.name.localeCompare(b.name)))
      setCurrentDeviceHash(fullFingerprint)
      setCurrentDeviceId(shortId)
      setPrivateKey(importedPrivateKey)
      setSigningReady(Boolean(importedPrivateKey))
    }).catch(err => console.error(err))
  }, [])

  const selectedInstitute = useMemo(
    () => institutes.find(i => i.id === form.instituteId),
    [form.instituteId, institutes],
  )

  const normalizedTargetDeviceCode = targetDeviceCode.trim().toLowerCase()
  const usingManualMode = targetMode === 'manual'
  const activeDeviceHash = usingManualMode ? normalizedTargetDeviceCode : currentDeviceHash
  const activeDeviceId = usingManualMode
    ? formatShortDeviceId(normalizedTargetDeviceCode)
    : currentDeviceId
  const validManualCode = /^[a-f0-9]{64}$/.test(normalizedTargetDeviceCode)
  const canGenerate = generating || !form.instituteId || !signingReady || !(usingManualMode ? validManualCode : activeDeviceHash)

  useEffect(() => {
    if (!selectedInstitute) return

    setForm(f => ({
      ...f,
      featureTier: selectedInstitute.subscriptionPlan || f.featureTier,
      expiresAt: selectedInstitute.expiryDate || f.expiresAt,
      maxStudents: Number(selectedInstitute.maxStudents ?? f.maxStudents) || f.maxStudents,
      paymentAmount: selectedInstitute.paymentAmount ?? '',
      paymentDate: selectedInstitute.paymentDate ?? '',
      paymentStatus: selectedInstitute.paymentStatus || 'paid',
    }))
  }, [selectedInstitute])

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!form.instituteId || !form.expiresAt || !activeDeviceHash || !privateKey) return

    setGenerating(true)
    try {
      const payload = {
        instituteId: form.instituteId,
        instituteName: selectedInstitute?.name ?? 'Unknown',
        deviceHash: activeDeviceHash,
        expiresAt: form.expiresAt,
        maxStudents: Number(form.maxStudents),
        featureTier: form.featureTier,
        generatedAt: new Date().toISOString(),
      }

      const signature = await signLicense(payload, privateKey)
      const rawKey = serializeLicense(payload, signature)
      const paymentAmount = form.paymentAmount === '' ? '' : Number(form.paymentAmount)
      const updatedInstitute = {
        ...selectedInstitute,
        subscriptionPlan: payload.featureTier,
        expiryDate: payload.expiresAt,
        maxStudents: payload.maxStudents,
        paymentAmount: Number.isFinite(paymentAmount) ? paymentAmount : '',
        paymentDate: form.paymentDate || '',
        paymentStatus: form.paymentStatus || 'paid',
        updatedAt: new Date().toISOString(),
      }

      await schoolDataService.institutes.upsert({ id: form.instituteId, ...updatedInstitute })
      setInstitutes(prev => prev
        .map(inst => (inst.id === form.instituteId ? updatedInstitute : inst))
        .sort((a, b) => a.name.localeCompare(b.name)))

      setGeneratedKey(formatLicenseKey(rawKey))
      setRecentEntries(prev => [
        {
          id: crypto.randomUUID(),
          instituteName: payload.instituteName,
          expiresAt: payload.expiresAt,
          maxStudents: payload.maxStudents,
          featureTier: payload.featureTier,
          deviceId: activeDeviceId,
          rawKey,
          generatedAt: payload.generatedAt,
          paymentStatus: updatedInstitute.paymentStatus,
        },
        ...prev,
      ].slice(0, 5))
    } catch (err) {
      console.error(err)
    } finally {
      setGenerating(false)
    }
  }

  const copyKey = (key = generatedKey) => {
    navigator.clipboard.writeText(key.replace(/\s/g, '')).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">License Generator</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Generate signed, device-bound license keys either from this PC or from a school-provided device binding code.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Key className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Generate Signed License</h3>
              <p className="text-xs text-gray-400">The license will be locked to the current device fingerprint and signed locally.</p>
            </div>
          </div>

          <div className="mb-5 space-y-3">
            <div className="p-4 bg-white border border-gray-200 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
                <ShieldCheck className="w-3.5 h-3.5" />
                Target Mode
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetMode('manual')}
                  className={clsx(
                    'px-3 py-2.5 rounded-xl text-sm font-semibold border transition-colors',
                    usingManualMode ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-600',
                  )}
                >
                  Use School Binding Code
                </button>
                <button
                  type="button"
                  onClick={() => setTargetMode('current')}
                  className={clsx(
                    'px-3 py-2.5 rounded-xl text-sm font-semibold border transition-colors',
                    !usingManualMode ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-600',
                  )}
                >
                  Use This PC
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                <Monitor className="w-3.5 h-3.5" />
                Target Device
              </div>
              {usingManualMode ? (
                <>
                  <textarea
                    value={targetDeviceCode}
                    onChange={e => setTargetDeviceCode(e.target.value)}
                    rows={3}
                    placeholder="Paste school device binding code here..."
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-slate-500 mt-2 break-all">
                    {validManualCode
                      ? `Target Device ID: ${activeDeviceId}`
                      : 'Paste the 64-character device binding code copied from the school screen.'}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-900">{currentDeviceId || 'Loading...'}</p>
                  <p className="text-xs text-slate-500 mt-1 break-all">
                    {currentDeviceHash || 'Resolving device fingerprint...'}
                  </p>
                </>
              )}
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Signing Status
              </div>
              <p className="text-sm text-emerald-800">
                {signingReady ? 'Signing key ready on this admin tool.' : 'Preparing signing key...'}
              </p>
            </div>
          </div>

          <form onSubmit={handleGenerate} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-gray-400" /> Select Institute</span>
              </label>
              <select
                value={form.instituteId}
                onChange={e => setForm(f => ({ ...f, instituteId: e.target.value }))}
                required
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              >
                <option value="">-- Select an institute --</option>
                {institutes.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-gray-400" /> Expiry Date</span>
              </label>
              <input
                type="date"
                value={form.expiresAt}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                required
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-gray-400" /> Max Students: <span className="text-indigo-600 font-bold">{form.maxStudents}</span></span>
              </label>
              <input
                type="range"
                min={50}
                max={5000}
                step={50}
                value={form.maxStudents}
                onChange={e => setForm(f => ({ ...f, maxStudents: Number(e.target.value) }))}
                className="w-full h-2 accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1"><span>50</span><span>5000</span></div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-gray-400" /> Feature Tier</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {TIERS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, featureTier: id }))}
                    className={clsx(
                      'py-2.5 rounded-xl text-sm font-semibold border-2 transition-all',
                      form.featureTier === id
                        ? id === 'basic' ? 'bg-gray-700 border-gray-700 text-white'
                        : id === 'pro' ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-purple-600 border-purple-600 text-white'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <span className="flex items-center gap-1.5"><CreditCard className="w-4 h-4 text-gray-400" /> Payment Amount</span>
              </label>
              <input
                type="number"
                min={0}
                value={form.paymentAmount}
                onChange={e => setForm(f => ({ ...f, paymentAmount: e.target.value }))}
                placeholder="12000"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Date</label>
                <input
                  type="date"
                  value={form.paymentDate}
                  onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Status</label>
                <select
                  value={form.paymentStatus}
                  onChange={e => setForm(f => ({ ...f, paymentStatus: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                >
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={canGenerate}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              {generating
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Signing...</>
                : <><Key className="w-4 h-4" /> Generate Signed License</>}
            </button>
          </form>

          {generatedKey && (
            <div className="mt-5 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> Signed License Generated
                </p>
                <button onClick={() => copyKey()} className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 px-2.5 py-1 rounded-lg transition-colors">
                  {copied ? <><Check className="w-3 h-3 text-green-600" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy Key</>}
                </button>
              </div>
              <textarea
                readOnly
                value={generatedKey}
                rows={5}
                className="w-full bg-white text-indigo-700 text-xs font-mono p-2.5 rounded-lg border border-indigo-200 resize-none focus:outline-none"
              />
              <p className="text-xs text-indigo-500 mt-1.5">
                This signed key is bound to device {activeDeviceId || 'target device'}.
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Current Session Activity</h3>
          {!recentEntries.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                <Key className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-500">No license generated in this session</p>
              <p className="text-xs text-gray-400 mt-1">Nothing is stored in localStorage anymore.</p>
            </div>
          ) : (
            <div className="space-y-2.5 overflow-y-auto max-h-[520px] pr-1">
              {recentEntries.map(entry => (
                <div key={entry.id} className="p-3.5 bg-gray-50 border border-gray-100 rounded-xl hover:border-indigo-200 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{entry.instituteName}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize bg-indigo-100 text-indigo-700">
                          {entry.featureTier}
                        </span>
                        <span className="text-xs text-gray-400">Exp: {entry.expiresAt}</span>
                        <span className="text-xs text-gray-400">{entry.maxStudents} students</span>
                        <span className="text-xs text-gray-400 capitalize">Payment: {entry.paymentStatus}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Device: {entry.deviceId}</p>
                      <p className="text-xs text-gray-400 mt-1.5">Generated: {new Date(entry.generatedAt).toLocaleString('en-IN')}</p>
                    </div>
                    <button onClick={() => copyKey(entry.rawKey)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Copy">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

