/**
 * SchoolAuthGuard.jsx
 *
 * Route guard inserted between LicenseGuard and DashboardLayout.
 * - Waits for Zustand persist hydration (prevents flicker)
 * - Calls store.init() to verify sessionToken against DB
 * - Syncs logout across multiple browser tabs via storage event
 * - Renders SchoolLogin page (setup or login mode) when not authenticated
 */

import React, { useEffect, useState } from 'react'
import useSchoolAuthStore from '../store/useSchoolAuthStore'
import SchoolLogin from '../pages/SchoolLogin'
import LoadingSpinner from './LoadingSpinner'

export default function SchoolAuthGuard({ children }) {
  const [hydrated, setHydrated] = useState(false)

  const { isLoggedIn, isPasswordSet, loading, setupRecoveryCode, init, logout } = useSchoolAuthStore()

  // ── Step 1: Wait for Zustand persist to rehydrate from localStorage ──────
  useEffect(() => {
    // hasHydrated() returns true if already done (e.g. second render)
    if (useSchoolAuthStore.persist.hasHydrated()) {
      setHydrated(true)
      return
    }
    const unsub = useSchoolAuthStore.persist.onFinishHydration(() => {
      setHydrated(true)
    })
    return unsub
  }, [])

  // ── Step 2: After hydration, verify session token against DB ─────────────
  useEffect(() => {
    if (hydrated) {
      init()
    }
  }, [hydrated, init])

  // ── Step 3: Multi-tab logout sync ────────────────────────────────────────
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'school-auth-storage') {
        try {
          const data = JSON.parse(e.newValue || '{}')
          if (data?.state?.isLoggedIn === false) {
            // Another tab logged out — sync this tab
            logout()
          }
        } catch {
          // ignore parse errors
        }
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [logout])

  // ── Render ────────────────────────────────────────────────────────────────

  // Wait for hydration + init
  if (!hydrated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // No password configured → show setup flow
  if (!isPasswordSet) {
    return <SchoolLogin mode="setup" />
  }

  // Setup just completed — waiting for user to acknowledge recovery code
  // Keep SchoolLogin mounted so RecoveryCodeModal stays visible
  if (setupRecoveryCode) {
    return <SchoolLogin mode="setup" />
  }

  // Password set but not logged in → show login
  if (!isLoggedIn) {
    return <SchoolLogin mode="login" />
  }

  // Authenticated → render app
  return children
}
