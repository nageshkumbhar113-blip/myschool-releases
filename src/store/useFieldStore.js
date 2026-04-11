import { create } from 'zustand'
import schoolDataService from '../services/schoolDataService'
import { buildDefaultFieldsForInstitute } from '../utils/defaultFieldCatalog'

const useFieldStore = create((set) => ({
  fields: [],
  loading: false,
  error: null,

  loadFields: async (instituteId) => {
    set({ loading: true, error: null })
    try {
      const rows = await schoolDataService.fields.list(instituteId)

      if (rows.length === 0 && instituteId) {
        const defaultFields = buildDefaultFieldsForInstitute(instituteId)
        const seeded = []

        for (const fieldDef of defaultFields) {
          const record = await schoolDataService.fields.create(fieldDef)
          seeded.push(record)
        }

        set({
          fields: seeded.sort((a, b) => (a.meta?.order ?? 0) - (b.meta?.order ?? 0)),
          loading: false,
        })
        return seeded
      }

      set({ fields: rows, loading: false })
      return rows
    } catch (err) {
      set({ error: err.message, loading: false })
      return []
    }
  },

  addField: async (fieldDef) => {
    const record = await schoolDataService.fields.create(fieldDef)
    set((state) => ({
      fields: [...state.fields, record].sort((a, b) => (a.meta?.order ?? 0) - (b.meta?.order ?? 0)),
    }))
    return record
  },

  updateField: async (id, changes) => {
    const after = await schoolDataService.fields.update(id, changes)
    set((state) => ({
      fields: state.fields.map((field) => (field.id === id ? after : field)).sort((a, b) => (a.meta?.order ?? 0) - (b.meta?.order ?? 0)),
    }))
    return after
  },

  deleteField: async (id) => {
    await schoolDataService.fields.delete(id)
    set((state) => ({ fields: state.fields.filter((field) => field.id !== id) }))
  },

  reorderFields: async (reordered) => {
    set({ fields: reordered })
    const instituteId = reordered[0]?.instituteId || null
    if (!instituteId) return reordered
    const persisted = await schoolDataService.fields.reorder(instituteId, reordered)
    set({ fields: persisted })
    return persisted
  },
}))

export default useFieldStore
