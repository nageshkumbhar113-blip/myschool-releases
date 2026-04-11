import { create } from 'zustand'
import { assertStudentCapacity } from '../utils/licenseLimits'
import useAppStore from './useAppStore'
import schoolDataService from '../services/schoolDataService'

const useStudentStore = create((set) => ({
  students: [],
  activeStudent: null,
  loading: false,
  saving: false,
  error: null,

  loadStudents: async (instituteId) => {
    set({ loading: true, error: null })
    try {
      const students = await schoolDataService.students.list(instituteId)
      set({ students, loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  loadStudent: async (studentId) => {
    set({ loading: true, error: null, activeStudent: null })
    try {
      const student = await schoolDataService.students.get(studentId)
      if (!student) throw new Error('Student not found')
      set({ activeStudent: student, loading: false })
    } catch (err) {
      set({ error: err.message, loading: false, activeStudent: null })
    }
  },

  addStudent: async (payload) => {
    set({ saving: true, error: null })
    try {
      await assertStudentCapacity(payload.instituteId, 1)
      const created = await schoolDataService.students.create(payload)
      set((state) => ({
        students: [created, ...state.students],
        saving: false,
      }))
      return created
    } catch (err) {
      set({ error: err.message, saving: false })
      throw err
    }
  },

  updateStudent: async (studentId, changes) => {
    try {
      const updated = await schoolDataService.students.update(studentId, changes)
      set((state) => ({
        students: state.students.map((student) => student.id === studentId ? updated : student),
        activeStudent: state.activeStudent?.id === studentId ? updated : state.activeStudent,
      }))
      return updated
    } catch (err) {
      set({ error: err.message })
      throw err
    }
  },

  deleteStudent: async (studentId) => {
    try {
      await schoolDataService.students.delete(studentId)
      set((state) => ({
        students: state.students.filter((student) => student.id !== studentId),
        activeStudent: state.activeStudent?.id === studentId ? null : state.activeStudent,
      }))
    } catch (err) {
      set({ error: err.message })
      throw err
    }
  },

  updateFee: async (feeId, changes) => {
    try {
      const updatedFee = await schoolDataService.fees.update(feeId, changes)
      set((state) => ({
        students: state.students.map((student) =>
          student.fee?.id === feeId ? { ...student, fee: updatedFee } : student,
        ),
        activeStudent: state.activeStudent?.fee?.id === feeId
          ? { ...state.activeStudent, fee: updatedFee }
          : state.activeStudent,
      }))
      return updatedFee
    } catch (err) {
      set({ error: err.message })
      throw err
    }
  },

  addInstallment: async (studentId, payload) => {
    set({ saving: true, error: null })
    try {
      const instituteName = useAppStore.getState().currentInstituteName || 'School'
      const result = await schoolDataService.fees.addInstallment(studentId, {
        ...payload,
        instituteName,
      })

      set((state) => ({
        saving: false,
        students: state.students.map((student) =>
          student.id === studentId ? { ...student, fee: result.fee } : student,
        ),
        activeStudent: state.activeStudent?.id === studentId
          ? { ...state.activeStudent, fee: result.fee }
          : state.activeStudent,
      }))

      return result
    } catch (err) {
      set({ saving: false, error: err.message })
      throw err
    }
  },

  cancelReceipt: async (receiptId, cancelReason = '') => {
    try {
      const result = await schoolDataService.receipts.cancel(receiptId, cancelReason)
      set((state) => ({
        students: state.students.map((student) =>
          student.id === result.receipt?.studentId ? { ...student, fee: result.fee } : student,
        ),
        activeStudent: state.activeStudent?.id === result.receipt?.studentId
          ? { ...state.activeStudent, fee: result.fee }
          : state.activeStudent,
      }))
      return true
    } catch (err) {
      set({ error: err.message })
      throw err
    }
  },

  recordLCPrint: async (studentId) => {
    try {
      await schoolDataService.students.recordLCPrint(studentId)
      set((state) => ({
        students: state.students.map((student) =>
          student.id === studentId
            ? { ...student, lcPrintedAt: new Date().toISOString() }
            : student,
        ),
        activeStudent: state.activeStudent?.id === studentId
          ? { ...state.activeStudent, lcPrintedAt: new Date().toISOString() }
          : state.activeStudent,
      }))
    } catch (err) {
      console.error('recordLCPrint error:', err)
    }
  },

  clearError: () => set({ error: null }),
}))

export default useStudentStore
