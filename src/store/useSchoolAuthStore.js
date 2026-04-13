/**
 * useSchoolAuthStore.js
 *
 * School-level password authentication backed by SQLite via Electron IPC.
 * Persisted locally:
 *   - isLoggedIn
 *   - sessionToken
 *
 * Legacy IndexedDB data is migrated on first init if present.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import db from '../db/db'
import schoolDataService from '../services/schoolDataService'
import { validatePasswordRules } from '../utils/schoolAuth'

async function readLegacySchoolAuth() {
  try {
    return await db.school_auth.get('config')
  } catch {
    return null
  }
}

async function clearLegacySchoolAuth() {
  try {
    await db.school_auth.delete('config')
  } catch {
    // ignore legacy cleanup failures
  }
}

const useSchoolAuthStore = create(
  persist(
    (set, get) => ({
      isLoggedIn: false,
      sessionToken: null,

      isPasswordSet: false,
      loading: false,
      error: null,
      loginAttempts: 0,
      lockUntil: null,
      setupRecoveryCode: null,

      init: async () => {
        set({ loading: true })
        try {
          let status = await schoolDataService.schoolAuth.getStatus()

          if (!status?.configured) {
            const legacyRecord = await readLegacySchoolAuth()
            if (legacyRecord?.passwordHash && legacyRecord?.salt) {
              status = await schoolDataService.schoolAuth.migrateLegacy({
                ...legacyRecord,
                sessionToken: legacyRecord.sessionToken ?? get().sessionToken ?? null,
              })
              await clearLegacySchoolAuth()
            }
          }

          if (!status?.configured) {
            set({
              isPasswordSet: false,
              isLoggedIn: false,
              sessionToken: null,
              loginAttempts: 0,
              lockUntil: null,
              setupRecoveryCode: null,
              error: null,
            })
            return
          }

          set({
            isPasswordSet: true,
            loginAttempts: status.loginAttempts ?? 0,
            lockUntil: status.lockUntil ?? null,
          })

          const { isLoggedIn, sessionToken } = get()
          if (!isLoggedIn || !sessionToken) {
            set({ isLoggedIn: false, sessionToken: null })
            return
          }

          const validation = await schoolDataService.schoolAuth.validateSession(sessionToken)
          if (!validation?.valid) {
            set({ isLoggedIn: false, sessionToken: null })
          }
        } catch (err) {
          console.error('[SchoolAuth] init error:', err)
          set({
            isPasswordSet: false,
            isLoggedIn: false,
            sessionToken: null,
            loginAttempts: 0,
            lockUntil: null,
            error: 'Failed to initialize school login.',
          })
        } finally {
          set({ loading: false })
        }
      },

      setupPassword: async (password) => {
        const rules = validatePasswordRules(password)
        if (!rules.valid) {
          set({ error: rules.error })
          return { ok: false, error: rules.error }
        }

        set({ loading: true, error: null })
        try {
          const result = await schoolDataService.schoolAuth.setup(password)
          if (!result?.ok) {
            const message = result?.error || 'Setup failed. Please try again.'
            set({ error: message })
            return { ok: false, error: message }
          }

          await clearLegacySchoolAuth()
          set({
            isPasswordSet: true,
            isLoggedIn: false,
            sessionToken: result.sessionToken ?? null,
            loginAttempts: 0,
            lockUntil: null,
            setupRecoveryCode: result.recoveryCode ?? null,
          })

          return { ok: true, recoveryCode: result.recoveryCode }
        } catch (err) {
          console.error('[SchoolAuth] setupPassword error:', err)
          const message = 'Setup failed. Please try again.'
          set({ error: message })
          return { ok: false, error: message }
        } finally {
          set({ loading: false })
        }
      },

      login: async (password) => {
        set({ loading: true, error: null })
        try {
          const result = await schoolDataService.schoolAuth.login(password)
          if (!result?.ok) {
            set({
              isLoggedIn: false,
              loginAttempts: result?.loginAttempts ?? 0,
              lockUntil: result?.lockUntil ?? null,
              error: result?.error || 'Incorrect password. Please try again.',
            })
            return false
          }

          await clearLegacySchoolAuth()
          set({
            isLoggedIn: true,
            sessionToken: result.sessionToken ?? null,
            loginAttempts: 0,
            lockUntil: null,
            error: null,
          })
          return true
        } catch (err) {
          console.error('[SchoolAuth] login error:', err)
          set({ error: 'Login failed. Please try again.' })
          return false
        } finally {
          set({ loading: false })
        }
      },

      logout: async () => {
        try {
          await schoolDataService.schoolAuth.logout(get().sessionToken)
        } catch (err) {
          console.error('[SchoolAuth] logout error:', err)
        }
        set({ isLoggedIn: false, sessionToken: null, error: null })
      },

      changePassword: async (currentPwd, newPwd) => {
        const rules = validatePasswordRules(newPwd)
        if (!rules.valid) return { ok: false, error: rules.error }

        set({ loading: true, error: null })
        try {
          const result = await schoolDataService.schoolAuth.changePassword(currentPwd, newPwd)
          if (!result?.ok) {
            return { ok: false, error: result?.error || 'Failed to change password. Try again.' }
          }

          await clearLegacySchoolAuth()
          set({
            sessionToken: result.sessionToken ?? null,
            loginAttempts: 0,
            lockUntil: null,
          })
          return { ok: true }
        } catch (err) {
          console.error('[SchoolAuth] changePassword error:', err)
          return { ok: false, error: 'Failed to change password. Try again.' }
        } finally {
          set({ loading: false })
        }
      },

      regenerateRecoveryCode: async (currentPwd) => {
        set({ loading: true, error: null })
        try {
          const result = await schoolDataService.schoolAuth.regenerateRecoveryCode(currentPwd)
          if (!result?.ok) {
            return { error: result?.error || 'Failed to regenerate. Try again.' }
          }
          return { recoveryCode: result.recoveryCode }
        } catch (err) {
          console.error('[SchoolAuth] regenerateRecoveryCode error:', err)
          return { error: 'Failed to regenerate. Try again.' }
        } finally {
          set({ loading: false })
        }
      },

      verifyRecoveryCode: async (code) => {
        try {
          const result = await schoolDataService.schoolAuth.verifyRecoveryCode(code)
          return Boolean(result?.valid)
        } catch {
          return false
        }
      },

      resetPasswordWithCode: async (recoveryCode, newPwd) => {
        const rules = validatePasswordRules(newPwd)
        if (!rules.valid) return { ok: false, error: rules.error }

        set({ loading: true, error: null })
        try {
          const result = await schoolDataService.schoolAuth.resetPasswordWithCode(recoveryCode, newPwd)
          if (!result?.ok) {
            return { ok: false, error: result?.error || 'Reset failed. Try again.' }
          }

          await clearLegacySchoolAuth()
          set({
            isPasswordSet: true,
            isLoggedIn: true,
            sessionToken: result.sessionToken ?? null,
            loginAttempts: 0,
            lockUntil: null,
          })
          return { ok: true }
        } catch (err) {
          console.error('[SchoolAuth] resetPasswordWithCode error:', err)
          return { ok: false, error: 'Reset failed. Try again.' }
        } finally {
          set({ loading: false })
        }
      },

      acknowledgeSetup: () => set({ isLoggedIn: true, setupRecoveryCode: null }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'school-auth-storage',
      partialize: (state) => ({
        isLoggedIn: state.isLoggedIn,
        sessionToken: state.sessionToken,
      }),
    },
  ),
)

export default useSchoolAuthStore
