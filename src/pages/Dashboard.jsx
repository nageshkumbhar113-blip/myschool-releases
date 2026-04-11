/**
 * Dashboard.jsx
 *
 * School admin dashboard — shows ONLY the current institute's data.
 * currentInstituteId is read from localStorage (set when license is activated).
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, CreditCard, AlertCircle,
  TrendingUp, TrendingDown, ArrowRight,
  RefreshCw, GraduationCap, ArrowRightLeft,
} from 'lucide-react'
import { getCurrentInstituteId, getCurrentInstituteName, getStudents, getFees } from '../utils/dbHelpers'
import clsx from 'clsx'

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ title, value, subtitle, icon: Icon, color, trend, trendValue, loading }) {
  const colors = {
    blue:   'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green:  'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    red:    'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
  }
  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
          {loading ? (
            <div className="h-7 w-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mt-1" />
          ) : (
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          )}
        </div>
        <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', colors[color])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</span>
        {trend && !loading && (
          <div className={clsx(
            'flex items-center gap-1 text-xs font-medium',
            trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          )}>
            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trendValue}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Quick actions ─────────────────────────────────────────────────────────────

function QuickAction({ to, label, description, icon: Icon, color }) {
  const colors = {
    blue:   'hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20',
    green:  'hover:border-green-300 dark:hover:border-green-700 hover:bg-green-50 dark:hover:bg-green-900/20',
    purple: 'hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20',
    orange: 'hover:border-orange-300 dark:hover:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20',
  }
  const iconColors = {
    blue:   'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30',
    green:  'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30',
    purple: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30',
    orange: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30',
  }
  return (
    <Link
      to={to}
      className={clsx(
        'card p-4 flex items-center gap-4 border-2 border-transparent transition-all duration-200 group',
        colors[color]
      )}
    >
      <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', iconColors[color])}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{description}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
    </Link>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const instituteId   = getCurrentInstituteId()
  const instituteName = getCurrentInstituteName()

  const [stats,    setStats]    = useState({ students: 0, transferred: 0, collected: 0, pending: 0 })
  const [recent,   setRecent]   = useState([])
  const [loading,  setLoading]  = useState(true)

  const load = async () => {
    if (!instituteId) { setLoading(false); return }
    setLoading(true)
    try {
      const [students, fees] = await Promise.all([
        getStudents(instituteId),
        getFees(instituteId),
      ])

      let collected = 0, pending = 0
      const feeMap = {}
      for (const f of fees) {
        collected += f.paidAmount      ?? 0
        pending   += f.remainingAmount ?? 0
        feeMap[f.studentId] = f
      }

      const activeCount     = students.filter(s => s.status !== 'transferred').length
      const transferredCount = students.filter(s => s.status === 'transferred').length
      setStats({ students: activeCount, transferred: transferredCount, collected, pending })

      // Recent students — last 5 added (exclude transferred)
      const sorted = [...students]
        .filter(s => s.status !== 'transferred')
        .sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0))
        .slice(0, 5)
        .map(s => ({ ...s, fee: feeMap[s.id] ?? null }))
      setRecent(sorted)
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [instituteId])

  const fmt = (n) => '₹' + Number(n).toLocaleString('en-IN')

  return (
    <div className="space-y-6">

      {/* Welcome header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary-600" />
            {instituteName}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">School Dashboard</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {!instituteId && (
        <div className="card p-6 text-center">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">No Institute Linked</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your license does not have an institute ID. Please activate a valid license from the
            <Link to="/license" className="text-primary-600 hover:underline ml-1">License page</Link>.
          </p>
        </div>
      )}

      {instituteId && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Students"
              value={stats.students.toLocaleString()}
              subtitle="Active students this institute"
              icon={Users}
              color="blue"
              loading={loading}
            />
            <StatCard
              title="Transferred"
              value={stats.transferred.toLocaleString()}
              subtitle="Transferred after LC"
              icon={ArrowRightLeft}
              color="orange"
              loading={loading}
            />
            <StatCard
              title="Fees Collected"
              value={fmt(stats.collected)}
              subtitle="Total payments received"
              icon={CreditCard}
              color="green"
              loading={loading}
            />
            <StatCard
              title="Pending Fees"
              value={fmt(stats.pending)}
              subtitle="Outstanding amount"
              icon={AlertCircle}
              color="red"
              loading={loading}
            />
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <QuickAction to="/students/add" label="Add Student"   description="Register a new student" icon={Users}      color="blue"   />
              <QuickAction to="/fees"         label="Collect Fee"   description="Record fee payment"     icon={CreditCard} color="green"  />
              <QuickAction to="/form-builder" label="Create Form"   description="Build custom forms"     icon={GraduationCap} color="purple" />
              <QuickAction to="/reports"      label="View Reports"  description="Analytics & insights"   icon={TrendingUp} color="orange" />
            </div>
          </div>

          {/* Recent Students */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Recent Students</h2>
              <Link to="/students" className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No students yet.</p>
                <Link to="/students/add" className="text-xs text-primary-600 hover:underline mt-1 inline-block">
                  Add your first student →
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="pb-3 text-left font-medium text-gray-500 dark:text-gray-400">Student</th>
                      <th className="pb-3 text-left font-medium text-gray-500 dark:text-gray-400">Class</th>
                      <th className="pb-3 text-right font-medium text-gray-500 dark:text-gray-400">Fees</th>
                      <th className="pb-3 text-right font-medium text-gray-500 dark:text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                    {recent.map(student => {
                      const name   = student.dynamicFields?.studentName ?? 'Unknown'
                      const paid   = student.fee?.paidAmount      ?? 0
                      const total  = student.fee?.effectiveFee    ?? student.fee?.totalFee ?? 0
                      const rem    = student.fee?.remainingAmount ?? 0
                      const isPaid = rem <= 0 && total > 0
                      const isPartial = paid > 0 && rem > 0
                      return (
                        <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                                <span className="text-xs font-semibold text-primary-700 dark:text-primary-400">
                                  {name.charAt(0)}
                                </span>
                              </div>
                              <span className="font-medium text-gray-900 dark:text-white">{name}</span>
                            </div>
                          </td>
                          <td className="py-3 text-gray-500 dark:text-gray-400">{student.class ?? '—'}</td>
                          <td className="py-3 text-right text-gray-900 dark:text-white">{fmt(total)}</td>
                          <td className="py-3 text-right">
                            <span className={clsx(
                              'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                              isPaid    && 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
                              isPartial && 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
                              !isPaid && !isPartial && 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
                            )}>
                              {isPaid ? 'Paid' : isPartial ? 'Partial' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}



