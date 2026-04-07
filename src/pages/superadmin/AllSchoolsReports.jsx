import { useEffect, useMemo, useState } from 'react'
import {
  Building2, CalendarClock, CreditCard, Download, RefreshCw, Search, ShieldCheck,
  AlertCircle, Phone, UserRound,
} from 'lucide-react'
import schoolDataService from '../../services/schoolDataService'
import clsx from 'clsx'

function StatCard({ label, value, icon: Icon, color, sub }) {
  const c = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    red: 'bg-red-50 text-red-600 border-red-100',
  }
  const ic = {
    blue: 'bg-blue-100',
    green: 'bg-emerald-100',
    amber: 'bg-amber-100',
    red: 'bg-red-100',
  }

  return (
    <div className={clsx('bg-white rounded-2xl border p-5 flex items-start justify-between gap-4 shadow-sm', c[color])}>
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', ic[color])}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  )
}

const fmt = n => 'â‚¹' + Number(n || 0).toLocaleString('en-IN')

function getDaysLeft(expiryDate) {
  if (!expiryDate) return null
  const diff = new Date(expiryDate).getTime() - Date.now()
  if (Number.isNaN(diff)) return null
  return Math.ceil(diff / 86400000)
}

function getStatusTone(status) {
  if (status === 'paid') return 'bg-emerald-100 text-emerald-700'
  if (status === 'pending') return 'bg-amber-100 text-amber-700'
  if (status === 'overdue') return 'bg-red-100 text-red-700'
  return 'bg-gray-100 text-gray-600'
}

export default function AllSchoolsReports() {
  const [institutes, setInstitutes] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [list, licenseRecord] = await Promise.all([
        schoolDataService.institutes.list(true),
        schoolDataService.license.getCurrent(),
      ])

      const activePayload = licenseRecord?.payload ?? null
      const rows = list
        .map(inst => {
          const isCurrentLicensedInstitute = activePayload?.instituteId === inst.id
          const expiryDate = inst.expiryDate || (isCurrentLicensedInstitute ? activePayload?.expiresAt ?? '' : '')
          const subscriptionPlan = inst.subscriptionPlan || (isCurrentLicensedInstitute ? activePayload?.featureTier ?? '' : '')

          return {
            ...inst,
            expiryDate,
            subscriptionPlan,
            paymentStatus: inst.paymentStatus || (expiryDate ? 'paid' : ''),
            paymentAmount: Number(inst.paymentAmount ?? 0) || 0,
            daysLeft: getDaysLeft(expiryDate),
            maxStudents: isCurrentLicensedInstitute ? Number(activePayload?.maxStudents ?? 0) || 0 : 0,
          }
        })
        .sort((a, b) => a.name.localeCompare(b.name))

      setInstitutes(rows)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return institutes
    const q = search.toLowerCase()
    return institutes.filter(inst =>
      inst.name.toLowerCase().includes(q) ||
      (inst.location ?? '').toLowerCase().includes(q) ||
      (inst.phone ?? '').toLowerCase().includes(q) ||
      (inst.principalName ?? '').toLowerCase().includes(q),
    )
  }, [institutes, search])

  const paidCount = useMemo(
    () => filtered.filter(inst => inst.paymentStatus === 'paid').length,
    [filtered],
  )

  const expiringSoonCount = useMemo(
    () => filtered.filter(inst => inst.daysLeft !== null && inst.daysLeft >= 0 && inst.daysLeft <= 30).length,
    [filtered],
  )

  const overdueCount = useMemo(
    () => filtered.filter(inst => inst.paymentStatus === 'overdue' || (inst.daysLeft !== null && inst.daysLeft < 0)).length,
    [filtered],
  )

  const exportCSV = () => {
    if (!filtered.length) return
    const rows = [
      ['#', 'Institute', 'Plan', 'Payment Amount', 'Payment Date', 'Expiry Date', 'Days Left', 'Payment Status', 'Phone', 'Principal'],
      ...filtered.map((inst, i) => [
        i + 1,
        inst.name ?? '',
        inst.subscriptionPlan ? String(inst.subscriptionPlan).toUpperCase() : '',
        inst.paymentAmount ?? 0,
        inst.paymentDate ?? '',
        inst.expiryDate ?? '',
        inst.daysLeft ?? '',
        inst.paymentStatus ?? '',
        inst.phone ?? '',
        inst.principalName ?? '',
      ]),
    ]
    const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    Object.assign(document.createElement('a'), {
      href: url,
      download: `institutes-billing-report-${new Date().toISOString().slice(0, 10)}.csv`,
    }).click()
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">All Schools Report</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Institute-wise payment details, plan, and expiry overview
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Schools" value={filtered.length} icon={Building2} color="blue" sub="Visible institutes" />
        <StatCard label="Paid Schools" value={paidCount} icon={ShieldCheck} color="green" sub="Payment marked as paid" />
        <StatCard label="Expiring Soon" value={expiringSoonCount} icon={CalendarClock} color="amber" sub="Expiry within 30 days" />
        <StatCard label="Overdue" value={overdueCount} icon={AlertCircle} color="red" sub="Expired or overdue payment" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by school, phone, principal, or location..."
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="p-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-500 rounded-xl shadow-sm transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={exportCSV}
              disabled={!filtered.length}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin mb-2" />
            <p className="text-sm text-gray-400">Loading institute billing data...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              {search ? 'No institutes match your search.' : 'No institutes available.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Institute', 'Plan', 'Payment', 'Payment Date', 'Expiry', 'Status', 'Contact'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(inst => {
                  const expired = inst.daysLeft !== null && inst.daysLeft < 0
                  const expiryTone = expired
                    ? 'text-red-600'
                    : inst.daysLeft !== null && inst.daysLeft <= 30
                      ? 'text-amber-600'
                      : 'text-gray-700'

                  return (
                    <tr key={inst.id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center shrink-0 text-indigo-700 font-semibold text-xs">
                            {inst.name?.charAt(0) || 'S'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{inst.name}</p>
                            <p className="text-xs text-gray-400 truncate">{inst.location || inst.address || 'No address'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-700 capitalize">{inst.subscriptionPlan || 'Not set'}</span>
                          {inst.maxStudents > 0 && (
                            <span className="text-xs text-gray-400">{inst.maxStudents} students</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2 text-gray-700 font-medium">
                          <CreditCard className="w-4 h-4 text-gray-400" />
                          {inst.paymentAmount ? fmt(inst.paymentAmount) : 'Not set'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">
                        {inst.paymentDate || 'Not set'}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col">
                          <span className={clsx('font-medium', expiryTone)}>
                            {inst.expiryDate || 'Not set'}
                          </span>
                          <span className="text-xs text-gray-400">
                            {inst.daysLeft === null ? 'Days left unavailable' : expired ? `${Math.abs(inst.daysLeft)} days overdue` : `${inst.daysLeft} days left`}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={clsx('px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize', getStatusTone(inst.paymentStatus))}>
                          {inst.paymentStatus || 'not set'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="space-y-1 text-xs text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            <span>{inst.phone || 'Not set'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <UserRound className="w-3.5 h-3.5 text-gray-400" />
                            <span>{inst.principalName || 'Not set'}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

