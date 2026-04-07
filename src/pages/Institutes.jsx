import React, { useState } from 'react'
import { Building2, Plus, Search, MapPin, Phone, Mail, Users, Edit2, Trash2, X } from 'lucide-react'
import useAppStore from '../store/useAppStore'
import { useForm } from 'react-hook-form'
import clsx from 'clsx'

export default function Institutes() {
  const { institutes } = useAppStore()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [list, setList] = useState(institutes)

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const filtered = list.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.city.toLowerCase().includes(search.toLowerCase())
  )

  const onSubmit = (data) => {
    if (editItem) {
      setList(prev => prev.map(i => i.id === editItem.id ? { ...i, ...data } : i))
    } else {
      setList(prev => [...prev, { ...data, id: Date.now(), students: 0, status: 'active' }])
    }
    setShowModal(false)
    setEditItem(null)
    reset()
  }

  const onEdit = (item) => {
    setEditItem(item)
    reset(item)
    setShowModal(true)
  }

  const onDelete = (id) => {
    if (confirm('Delete this institute?')) {
      setList(prev => prev.filter(i => i.id !== id))
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Institutes</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{list.length} institutes registered</p>
        </div>
        <button onClick={() => { setShowModal(true); setEditItem(null); reset({}) }} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Institute
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search institutes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-9"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(inst => (
          <div key={inst.id} className="card p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{inst.name}</h3>
                  <span className={clsx(
                    'inline-flex px-2 py-0.5 rounded-full text-xs font-medium mt-0.5',
                    inst.status === 'active'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  )}>
                    {inst.status}
                  </span>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => onEdit(inst)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => onDelete(inst.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>{inst.city}</span>
              </div>
              {inst.phone && (
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span>{inst.phone}</span>
                </div>
              )}
              {inst.email && (
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{inst.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 pt-2 border-t border-gray-100 dark:border-gray-800">
                <Users className="w-3.5 h-3.5 shrink-0 text-primary-600 dark:text-primary-400" />
                <span className="font-medium">{inst.students} Students enrolled</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editItem ? 'Edit Institute' : 'Add Institute'}
              </h3>
              <button onClick={() => { setShowModal(false); setEditItem(null); reset({}) }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="label">Institute Name *</label>
                <input {...register('name', { required: true })} className="input" placeholder="e.g. Sunrise Public School" />
                {errors.name && <p className="text-xs text-red-500 mt-1">Name is required</p>}
              </div>
              <div>
                <label className="label">City *</label>
                <input {...register('city', { required: true })} className="input" placeholder="e.g. Mumbai" />
                {errors.city && <p className="text-xs text-red-500 mt-1">City is required</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Phone</label>
                  <input {...register('phone')} className="input" placeholder="9876543210" />
                </div>
                <div>
                  <label className="label">Status</label>
                  <select {...register('status')} className="input">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Email</label>
                <input {...register('email')} type="email" className="input" placeholder="school@example.com" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setEditItem(null); reset({}) }} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1 justify-center">
                  {editItem ? 'Update' : 'Add Institute'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
