import React, { useEffect, useMemo, useState } from 'react'
import { CreditCard, Plus, Save, Trash2, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import clsx from 'clsx'
import useAppStore from '../store/useAppStore'
import useSettingsStore from '../store/useSettingsStore'
import {
  DEFAULT_FEE_STRUCTURE_ITEMS,
  createFeeStructureItem,
  getFeeStructure,
} from '../utils/feeStructure'

function emptyCustomRow() {
  return { key: crypto.randomUUID(), label: '' }
}

export default function FeeStructure() {
  const { currentInstituteId, selectedInstitute, currentInstituteName } = useAppStore()
  const { settings, loading, saving, loadSettings, saveSettings } = useSettingsStore()
  const instituteId = currentInstituteId || selectedInstitute || null

  const [customRows, setCustomRows] = useState([])
  const [dirty, setDirty] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (instituteId) loadSettings(instituteId)
  }, [instituteId, loadSettings])

  useEffect(() => {
    const structure = getFeeStructure(settings)
    setCustomRows(
      structure
        .filter((item) => !item.locked)
        .map((item) => ({ key: crypto.randomUUID(), label: item.label }))
    )
    setDirty(false)
  }, [settings])

  const mergedStructure = useMemo(
    () => getFeeStructure({
      feeStructure: customRows
        .map((row) => createFeeStructureItem(row.label))
        .filter((row) => row.label),
    }),
    [customRows]
  )

  const defaultRows = useMemo(
    () => mergedStructure.filter((item) => DEFAULT_FEE_STRUCTURE_ITEMS.some((baseItem) => baseItem.key === item.key)),
    [mergedStructure]
  )

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleChangeRow = (rowKey, label) => {
    setCustomRows((prev) => prev.map((row) => (row.key === rowKey ? { ...row, label } : row)))
    setDirty(true)
  }

  const handleAddRow = () => {
    setCustomRows((prev) => [...prev, emptyCustomRow()])
    setDirty(true)
  }

  const handleRemoveRow = (rowKey) => {
    setCustomRows((prev) => prev.filter((row) => row.key !== rowKey))
    setDirty(true)
  }

  const handleSave = async (event) => {
    event.preventDefault()
    if (!instituteId) return

    const payload = {
      ...(settings ?? {}),
      feeStructure: mergedStructure.map((item) => ({
        key: item.key,
        label: item.label,
      })),
    }

    const ok = await saveSettings(instituteId, payload)
    if (ok) {
      setDirty(false)
      showToast('Fee structure saved')
    } else {
      showToast('Fee structure save failed', 'error')
    }
  }

  if (!instituteId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <CreditCard className="w-12 h-12 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-400">No institute found. Add one first.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Fee Structure</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Default 9 particulars stay locked. School can add extra particulars here for future fee setup.
            {currentInstituteName ? ` · ${currentInstituteName}` : ''}
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
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Structure</>}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-7 h-7 animate-spin text-primary-600" />
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary-600" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Receipt Particulars</h3>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Sr. No.</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Particular</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Type</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {defaultRows.map((item, index) => (
                    <tr key={item.key}>
                      <td className="px-4 py-3 font-mono text-gray-500">{String(index + 1).padStart(2, '0')}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900 dark:text-white">{item.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          Default
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-gray-400">Locked</span>
                      </td>
                    </tr>
                  ))}

                  {customRows.map((row, index) => (
                    <tr key={row.key}>
                      <td className="px-4 py-3 font-mono text-gray-500">
                        {String(defaultRows.length + index + 1).padStart(2, '0')}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          value={row.label}
                          onChange={(event) => handleChangeRow(row.key, event.target.value)}
                          className="input py-2"
                          placeholder="e.g. Transport Fees"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                          Custom
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.key)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800">
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-primary-400 hover:text-primary-600 dark:border-gray-700 dark:text-gray-300"
              >
                <Plus className="w-4 h-4" /> Add Particular
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            These particulars will appear in Add Student fee setup. Entered values will auto-calculate total fee, and blank values will show as `--` in the receipt.
          </div>
        </>
      )}

      {toast && (
        <div className={clsx(
          'fixed bottom-6 right-6 z-[60] flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg',
          toast.type === 'error'
            ? 'bg-red-600 text-white'
            : 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
        )}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </form>
  )
}
