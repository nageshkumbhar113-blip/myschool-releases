import { create } from 'zustand'
import schoolDataService from '../services/schoolDataService'

const useReceiptStore = create((set) => ({
  receipts: [],
  pdfStatus: {},
  loading: false,
  error: null,

  loadReceipts: async (instituteId) => {
    set({ loading: true, error: null })
    try {
      const receipts = await schoolDataService.receipts.list(instituteId)
      set({ receipts, loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  getReceiptData: async (receiptId) => {
    const payload = await schoolDataService.receipts.getData(receiptId)
    if (!payload?.receipt) return null

    const institute = payload.receipt.instituteId
      ? await schoolDataService.institutes.get(payload.receipt.instituteId)
      : null

    return {
      ...payload,
      institute,
    }
  },

  setPdfStatus: (receiptId, status) => set((state) => ({
    pdfStatus: { ...state.pdfStatus, [receiptId]: status },
  })),
}))

export default useReceiptStore
