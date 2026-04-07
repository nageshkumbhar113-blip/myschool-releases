import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAppStore = create(
  persist(
    (set, get) => ({
      // Theme
      darkMode: false,
      toggleDarkMode: () => {
        const newMode = !get().darkMode
        set({ darkMode: newMode })
        if (newMode) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      },
      initTheme: () => {
        if (get().darkMode) {
          document.documentElement.classList.add('dark')
        }
      },

      // Sidebar
      sidebarOpen: true,
      mobileSidebarOpen: false,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      toggleMobileSidebar: () => set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),
      closeMobileSidebar: () => set({ mobileSidebarOpen: false }),

      // ── Institute Identity (single source of truth) ──────────────────────
      // License activate झाल्यावर हे set होतं
      currentInstituteId: localStorage.getItem('currentInstituteId') || '',
      currentInstituteName: localStorage.getItem('currentInstituteName') || 'My School',
      licenseExpiry: localStorage.getItem('licenseExpiry') || null,

      setInstituteContext: ({ id, name, expiry }) => {
        // Store मध्ये save
        set({
          currentInstituteId: id || '',
          currentInstituteName: name || 'My School',
          licenseExpiry: expiry || null,
          // Legacy support
          selectedInstitute: id || null,
        })
        // localStorage मध्ये पण save — license system साठी
        if (id)     localStorage.setItem('currentInstituteId', id)
        if (name)   localStorage.setItem('currentInstituteName', name)
        if (expiry) localStorage.setItem('licenseExpiry', expiry)
      },

      clearInstituteContext: () => {
        set({
          currentInstituteId: '',
          currentInstituteName: 'My School',
          licenseExpiry: null,
          selectedInstitute: null,
        })
        localStorage.removeItem('currentInstituteId')
        localStorage.removeItem('currentInstituteName')
        localStorage.removeItem('licenseExpiry')
      },

      // Legacy — जुन्या pages साठी ठेवलं (हळूहळू replace होईल)
      selectedInstitute: localStorage.getItem('currentInstituteId') || null,
      setSelectedInstitute: (id) => set({ selectedInstitute: id }),

      // Dashboard Stats — demo data (नंतर real DB queries येतील)
      stats: {
        totalStudents: 0,
        feesCollected: 0,
        pendingFees: 0,
        activeInstitutes: 0,
      },

      // Notifications
      notifications: [
        { id: 1, type: 'warning', message: '12 students have pending fees due this week', time: '2h ago' },
        { id: 2, type: 'info', message: 'New form template "Admission 2024" created', time: '5h ago' },
        { id: 3, type: 'success', message: 'Backup completed successfully', time: '1d ago' },
      ],
    }),
    {
      name: 'myschool-storage',
      partialize: (state) => ({
        darkMode: state.darkMode,
        sidebarOpen: state.sidebarOpen,
        currentInstituteId: state.currentInstituteId,
        currentInstituteName: state.currentInstituteName,
        licenseExpiry: state.licenseExpiry,
        selectedInstitute: state.selectedInstitute,
      }),
    }
  )
)

export default useAppStore