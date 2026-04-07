import { create } from 'zustand'
import schoolDataService from '../services/schoolDataService'

const useSettingsStore = create((set) => ({
  settings: null,
  loading: false,
  saving: false,

  loadSettings: async (instituteId) => {
    if (!instituteId) return
    set({ loading: true })
    try {
      const record = await schoolDataService.settings.get(instituteId)
      set({ settings: record ?? null })
    } catch (err) {
      console.error('Load settings error:', err)
    } finally {
      set({ loading: false })
    }
  },

  saveSettings: async (instituteId, data) => {
    set({ saving: true })
    try {
      const record = await schoolDataService.settings.save(instituteId, data)
      set({ settings: record ?? null })
      return true
    } catch (err) {
      console.error('Save settings error:', err)
      return false
    } finally {
      set({ saving: false })
    }
  },
}))

export default useSettingsStore
