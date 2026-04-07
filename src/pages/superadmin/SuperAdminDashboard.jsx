import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2, ArrowRight, RefreshCw, TrendingUp, AlertCircle, CalendarClock, ShieldCheck, CreditCard,
} from 'lucide-react'
import schoolDataService from '../../services/schoolDataService'
import clsx from 'clsx'

function StatCard({ label, value, sub, icon: Icon, color }) {
  const c = {
    indigo: { icon: 'bg-indigo-100 text-indigo-600', val: 'text-indigo-700', border: 'border-indigo-100' },
    green: { icon: 'bg-emerald-100 text-emerald-600', val: 'text-emerald-700', border: 'border-emerald-100' },
    amber: { icon: 'bg-amber-100 text-amber-600', val: 'text-amber-700', border: 'border-amber-100' },
    red: { icon: 'bg-red-100 text-red-600', val: 'text-red-700', border: 'border-red-100' },
  }[color]

  return (
    <div className={clsx('bg-white rounded-2xl border p-5 shadow-sm flex items-start justify-between gap-4', c.border)}>
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <p className={clsx('text-3xl font-bold mt-1.5', c.val)}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', c.icon)}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  )
}

function getDaysLeft(expiryDate) {
  if (!expiryDate) return null
  const diff = new Date(expiryDate).getTime() - Date.now()
  if (Number.isNaN(diff)) return null
  return Math.ceil(diff / 86400000)
}

function getStatusTone(inst) {
  const expired = inst.daysLeft !== null && inst.daysLeft < 0
  if (expired || inst.paymentStatus === 'overdue') return 'bg-red-100 text-red-700'
  if (inst.paymentStatus === 'pending') return 'bg-amber-100 text-amber-700'
  if (inst.paymentStatus === 'paid') return 'bg-emerald-100 text-emerald-700'
  return 'bg-gray-100 text-gray-600'
}

const fmt = n => 'â‚¹' + Number(n || 0).toLocaleString('en-IN')

export default function SuperAdminDashboard() {
  const [institutes, setInstitutes] = useState([])
  const [loading, setLoading] = useState(true)

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
          const isLicensedHere = activePayload?.instituteId === inst.id
          const expiryDate = inst.expiryDate || (isLicensedHere ? activePayload?.expiresAt ?? '' : '')
          const subscriptionPlan = inst.subscriptionPlan || (isLicensedHere ? activePayload?.featureTier ?? '' : '')

          return {
            ...inst,
            expiryDate,
            subscriptionPlan,
            paymentStatus: inst.paymentStatus || (expiryDate ? 'paid' : ''),
            paymentAmount: Number(inst.paymentAmount ?? 0) || 0,
            daysLeft: getDaysLeft(expiryDate),
          }
        })
        .sort((a, b) => new Date(b.updatedAt ?? b.createdAt ?? 0) - new Date(a.updatedAt ?? a.createdAt ?? 0))
        .slice(0, 6)

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

  const totalCount = institutes.length
  const paidCount = useMemo(() => institutes.filter(inst => inst.paymentStatus === 'paid').length, [institutes])
  const expiringSoon = useMemo(
    () => institutes.filter(inst => inst.daysLeft !== null && inst.daysLeft >= 0 && inst.daysLeft <= 30).length,
    [institutes],
  )
  const overdueCount = useMemo(
    () => institutes.filter(inst => inst.paymentStatus === 'overdue' || (inst.daysLeft !== null && inst.daysLeft < 0)).length,
    [institutes],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Welcome, Super Admin</h2>
          <p className="text-sm text-gray-500 mt-0.5">Institute billing and expiry overview</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm rounded-xl shadow-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Institutes" value={totalCount} sub="Registered schools" icon={Building2} color="indigo" />
        <StatCard label="Paid Schools" value={paidCount} sub="Payment status marked paid" icon={ShieldCheck} color="green" />
        <StatCard label="Expiring Soon" value={expiringSoon} sub="Expiry within 30 days" icon={CalendarClock} color="amber" />
        <StatCard label="Overdue" value={overdueCount} sub="Expired or overdue schools" icon={AlertCircle} color="red" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">Recent Institute Billing Updates</h3>
          <Link
            to="/super-admin/reports"
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
          >
            View Full Report <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {!institutes.length ? (
          <div className="text-center py-12">
            <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No institutes yet.</p>
            <Link to="/super-admin/institutes" className="text-xs text-indigo-600 hover:underline mt-1 inline-block">
              Add first institute â†’
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {institutes.map(inst => {
              const expiryText = inst.expiryDate || 'Not set'
              const daysText = inst.daysLeft === null
                ? 'Days left unavailable'
                : inst.daysLeft < 0
                  ? `${Math.abs(inst.daysLeft)} days overdue`
                  : `${inst.daysLeft} days left`

              return (
                <div key={inst.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0 text-indigo-700 font-bold text-sm">
                    {inst.name?.charAt(0) || 'S'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-gray-900 truncate">{inst.name}</p>
                      <span className={clsx('shrink-0 px-2 py-0.5 rounded-full text-xs font-medium capitalize', getStatusTone(inst))}>
                        {inst.paymentStatus || 'not set'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                      <span className="capitalize">Plan: {inst.subscriptionPlan || 'not set'}</span>
                      <span>Payment: {inst.paymentAmount ? fmt(inst.paymentAmount) : 'Not set'}</span>
                      <span>Expiry: {expiryText}</span>
                      <span>{daysText}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { to: '/super-admin/institutes', label: 'Manage Institutes', desc: 'Add or update school billing fields', icon: Building2, color: 'indigo' },
          { to: '/super-admin/licenses', label: 'Generate License', desc: 'Create keys and auto-save plan/expiry', icon: TrendingUp, color: 'purple' },
          { to: '/super-admin/reports', label: 'View Reports', desc: 'See institute payment and expiry data', icon: CreditCard, color: 'emerald' },
        ].map(({ to, label, desc, icon: Icon, color }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl hover:border-indigo-200 hover:shadow-md transition-all group shadow-sm"
          >
            <div className={clsx(
              'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
              color === 'indigo' && 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white',
              color === 'purple' && 'bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white',
              color === 'emerald' && 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white',
            ) + ' transition-colors'}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">{label}</p>
              <p className="text-xs text-gray-500 truncate">{desc}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all ml-auto shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}

