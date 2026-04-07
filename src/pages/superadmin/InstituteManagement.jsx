import { useEffect, useState, useMemo } from 'react'
import {
  Building2, Plus, Search, Edit2, Trash2, RefreshCw,
  X, Save, AlertTriangle, Users, MapPin, CalendarClock, CreditCard,
} from 'lucide-react'
import schoolDataService from '../../services/schoolDataService'
import { getAllInstitutes, getStudentCountsPerInstitute } from '../../utils/dbHelpers'
import clsx from 'clsx'

const EMPTY_FORM = {
  name: '',
  address: '',
  location: '',
  phone: '',
  email: '',
  principalName: '',
  subscriptionPlan: 'pro',
  paymentAmount: '',
  paymentDate: '',
  expiryDate: '',
  paymentStatus: 'paid',
}

export default function InstituteManagement() {
  const [institutes,   setInstitutes]   = useState([])
  const [studentCount, setStudentCount] = useState({})
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [showForm,     setShowForm]     = useState(false)
  const [editTarget,   setEditTarget]   = useState(null)
  const [form,         setForm]         = useState(EMPTY_FORM)
  const [saving,       setSaving]       = useState(false)
  const [deleteId,     setDeleteId]     = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [list, counts] = await Promise.all([
        getAllInstitutes(),
        getStudentCountsPerInstitute(),
      ])
      setInstitutes(list.sort((a, b) => a.name.localeCompare(b.name)))
      setStudentCount(counts)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return institutes
    const q = search.toLowerCase()
    return institutes.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.location ?? '').toLowerCase().includes(q) ||
      (i.address ?? '').toLowerCase().includes(q)
    )
  }, [institutes, search])

  const openAdd  = () => { setEditTarget(null); setForm(EMPTY_FORM); setShowForm(true) }
  const openEdit = (inst) => {
    setEditTarget(inst.id)
    setForm({
      name: inst.name ?? '',
      address: inst.address ?? '',
      location: inst.location ?? '',
      phone: inst.phone ?? '',
      email: inst.email ?? '',
      principalName: inst.principalName ?? '',
      subscriptionPlan: inst.subscriptionPlan ?? 'pro',
      paymentAmount: inst.paymentAmount ?? '',
      paymentDate: inst.paymentDate ?? '',
      expiryDate: inst.expiryDate ?? '',
      paymentStatus: inst.paymentStatus ?? 'paid',
    })
    setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditTarget(null); setForm(EMPTY_FORM) }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editTarget) {
        await schoolDataService.institutes.upsert({ id: editTarget, ...form })
      } else {
        await schoolDataService.institutes.upsert({ id: crypto.randomUUID(), ...form })
      }
      await load(); closeForm()
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try { await schoolDataService.institutes.delete(deleteId); setDeleteId(null); await load() }
    catch (err) { console.error(err) }
  }

  const fields = [
    { key: 'name',          label: 'Institute Name',  placeholder: 'Shri Ram Vidyalaya',  required: true,  type: 'text' },
    { key: 'location',      label: 'City / Location', placeholder: 'Pune',                               type: 'text' },
    { key: 'address',       label: 'Full Address',    placeholder: '123 Main Road, Pune 411001',         type: 'text' },
    { key: 'phone',         label: 'Phone',           placeholder: '+91 98765 43210',                    type: 'text' },
    { key: 'email',         label: 'Email',           placeholder: 'principal@school.edu',               type: 'text' },
    { key: 'principalName', label: 'Principal Name',  placeholder: 'Mr. Rajesh Sharma',                  type: 'text' },
  ]

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Institutes</h2>
          <p className="text-sm text-gray-500 mt-0.5">{institutes.length} institute{institutes.length !== 1 ? 's' : ''} registered</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-500 rounded-xl shadow-sm transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors">
            <Plus className="w-4 h-4" /> Add Institute
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or locationâ€¦"
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
        />
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin mb-2" />
            <p className="text-sm text-gray-400">Loading institutesâ€¦</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">
              {search ? 'No institutes match your search.' : 'No institutes yet.'}
            </p>
            {!search && (
              <button onClick={openAdd} className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                + Add your first institute
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Institute</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Location</th>
                  <th className="text-center px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Students</th>
                  <th className="text-center px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Expiry</th>
                  <th className="text-center px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment</th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(inst => (
                  <tr key={inst.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0 font-bold text-indigo-700 text-sm">
                          {inst.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{inst.name}</p>
                          {inst.principalName && (
                            <p className="text-xs text-gray-400 truncate">Principal: {inst.principalName}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                        {(inst.location || inst.address) && <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-400" />}
                        <span className="truncate">{inst.location || inst.address || 'â€”'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm font-semibold text-gray-700">{studentCount[inst.id] ?? 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center hidden lg:table-cell">
                      <div className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                        <CalendarClock className="w-3.5 h-3.5 text-gray-400" />
                        <span>{inst.expiryDate || 'â€”'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={clsx(
                        'inline-flex px-2.5 py-1 rounded-full text-xs font-semibold capitalize',
                        inst.paymentStatus === 'paid' && 'bg-emerald-100 text-emerald-700',
                        inst.paymentStatus === 'pending' && 'bg-amber-100 text-amber-700',
                        inst.paymentStatus === 'overdue' && 'bg-red-100 text-red-700',
                        !inst.paymentStatus && 'bg-gray-100 text-gray-600',
                      )}>
                        {inst.paymentStatus || 'not set'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(inst)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteId(inst.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={closeForm} />
          <div className="fixed inset-0 z-50 overflow-y-auto p-4">
            <div className="min-h-full flex items-start sm:items-center justify-center py-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                  </div>
                  <h2 className="text-base font-bold text-gray-900">
                    {editTarget ? 'Edit Institute' : 'Add New Institute'}
                  </h2>
                </div>
                <button onClick={closeForm} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSave} className="max-h-[calc(90vh-72px)] overflow-y-auto p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {fields.map(({ key, label, placeholder, required, type }) => (
                    <div key={key} className={key === 'name' || key === 'address' ? 'sm:col-span-2' : ''}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
                      </label>
                      <input
                        type={type}
                        value={form[key]}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        placeholder={placeholder}
                        required={required}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                      />
                    </div>
                  ))}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Plan</label>
                    <select
                      value={form.subscriptionPlan}
                      onChange={e => setForm(f => ({ ...f, subscriptionPlan: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                    >
                      <option value="basic">Basic</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                    <select
                      value={form.paymentStatus}
                      onChange={e => setForm(f => ({ ...f, paymentStatus: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                    >
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <span className="inline-flex items-center gap-1.5"><CreditCard className="w-4 h-4 text-gray-400" /> Payment Amount</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.paymentAmount}
                      onChange={e => setForm(f => ({ ...f, paymentAmount: e.target.value }))}
                      placeholder="12000"
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                    <input
                      type="date"
                      value={form.paymentDate}
                      onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">License / Service Expiry</label>
                    <input
                      type="date"
                      value={form.expiryDate}
                      onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100">
                  <button type="button" onClick={closeForm} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                    <Save className="w-4 h-4" />
                    {saving ? 'Savingâ€¦' : (editTarget ? 'Save Changes' : 'Add Institute')}
                  </button>
                </div>
              </form>
            </div>
            </div>
          </div>
        </>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
              <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>
              <h2 className="text-base font-bold text-gray-900 mb-1">Delete Institute?</h2>
              <p className="text-sm text-gray-500 mb-5">This will hide the institute. Student data will be retained safely.</p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                  Cancel
                </button>
                <button onClick={handleDelete} className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}




