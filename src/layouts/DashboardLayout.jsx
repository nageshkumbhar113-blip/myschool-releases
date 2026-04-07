import { useEffect, useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, FileText, Users, CreditCard,
  Receipt, FolderOpen, BarChart3, Database, Shield, Layout,
  Menu, Moon, Sun, Bell, ChevronRight, GraduationCap,
  Settings, ArrowUpCircle, AlertTriangle,
} from 'lucide-react'
import useAppStore from '../store/useAppStore'
import { getCurrentInstituteName, getDaysUntilExpiry, getLicenseExpiry } from '../utils/dbHelpers'
import clsx from 'clsx'

// Institute link is REMOVED from school sidebar (moved to Super Admin panel)
const navItems = [
  { path: '/',             label: 'Dashboard',    icon: LayoutDashboard },
  { path: '/form-builder', label: 'Form Builder', icon: FileText },
  { path: '/templates',    label: 'Templates',    icon: Layout },
  { path: '/students',     label: 'Students',     icon: Users },
  { path: '/fees',         label: 'Fees',         icon: CreditCard },
  { path: '/receipts',     label: 'Receipts',     icon: Receipt },
  { path: '/documents',    label: 'Documents',    icon: FolderOpen },
  { path: '/reports',      label: 'Reports',      icon: BarChart3 },
  { path: '/promotion',    label: 'Promotion',    icon: ArrowUpCircle },
  { path: '/settings',     label: 'Settings',     icon: Settings },
  { path: '/backup',       label: 'Backup',       icon: Database },
  { path: '/license',      label: 'License',      icon: Shield },
]

export default function DashboardLayout() {
  const {
    darkMode, toggleDarkMode, initTheme,
    sidebarOpen, toggleSidebar,
    mobileSidebarOpen, toggleMobileSidebar, closeMobileSidebar,
  } = useAppStore()

  const location      = useLocation()
  const instituteName = getCurrentInstituteName()
  const daysLeft      = getDaysUntilExpiry()
  const expiry        = getLicenseExpiry()
  const showWarning   = daysLeft !== null && daysLeft <= 30

  useEffect(() => { initTheme() }, [])
  useEffect(() => { closeMobileSidebar() }, [location.pathname])

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">

      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        'fixed lg:relative z-30 h-full flex flex-col',
        'bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800',
        'transition-all duration-300 ease-in-out',
        sidebarOpen ? 'lg:w-64' : 'lg:w-[70px]',
        mobileSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0',
      )}>

        {/* Logo */}
        <div className={clsx(
          'flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-800 shrink-0',
          !sidebarOpen && 'lg:justify-center lg:px-2',
        )}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            {(sidebarOpen || mobileSidebarOpen) && (
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">MY School</p>
                <p
                  className="text-[10px] text-primary-600 dark:text-primary-400 truncate font-medium"
                  title={instituteName}
                >
                  {instituteName}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) => clsx(
                'sidebar-link group relative',
                isActive && 'active',
                !sidebarOpen && 'lg:justify-center lg:px-2',
              )}
            >
              {({ isActive }) => (
                <>
                  <Icon className={clsx('w-5 h-5 shrink-0', isActive && 'text-primary-600 dark:text-primary-400')} />
                  {(sidebarOpen || mobileSidebarOpen) && (
                    <span className="truncate">{label}</span>
                  )}
                  {!sidebarOpen && !mobileSidebarOpen && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 hidden lg:block">
                      {label}
                    </div>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className={clsx(
          'p-3 border-t border-gray-200 dark:border-gray-800 shrink-0',
          !sidebarOpen && 'lg:flex lg:justify-center',
        )}>
          <div className={clsx('flex items-center gap-3', !sidebarOpen && 'lg:flex-col')}>
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            {(sidebarOpen || mobileSidebarOpen) && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">School Admin</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{instituteName}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* License expiry warning banner */}
        {showWarning && (
          <ExpiryBanner daysLeft={daysLeft} expiry={expiry} />
        )}

        {/* Top header */}
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-4 shrink-0 z-10">
          <button
            onClick={toggleMobileSidebar}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            onClick={toggleSidebar}
            className="hidden lg:flex p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
          >
            <ChevronRight className={clsx('w-5 h-5 transition-transform duration-300', sidebarOpen && 'rotate-180')} />
          </button>

          <PageTitle location={location} />
          <div className="flex-1" />

          {/* Institute name chip */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-primary-50 dark:bg-primary-900/20 rounded-full">
            <GraduationCap className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
            <span className="text-xs font-medium text-primary-700 dark:text-primary-400 max-w-[160px] truncate">
              {instituteName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 relative">
              <Bell className="w-5 h-5" />
              {showWarning && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full" />
              )}
            </button>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

// ── License expiry warning banner ──────────────────────────────────────────

function ExpiryBanner({ daysLeft, expiry }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  const dateStr = expiry
    ? new Date(expiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''
  const urgent = daysLeft <= 7

  return (
    <div className={clsx(
      'flex items-center gap-3 px-4 py-2.5 text-sm shrink-0',
      urgent
        ? 'bg-red-600 dark:bg-red-700 text-white'
        : 'bg-amber-500 dark:bg-amber-600 text-white',
    )}>
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span className="flex-1 min-w-0">
        {urgent
          ? `License expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} (${dateStr}). Contact your administrator immediately!`
          : `License expires on ${dateStr} (${daysLeft} days remaining). Contact Admin to renew.`
        }
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 opacity-80 hover:opacity-100 text-xs underline"
      >
        Dismiss
      </button>
    </div>
  )
}

// ── Page title ─────────────────────────────────────────────────────────────

function PageTitle({ location }) {
  const titles = {
    '/':             'Dashboard',
    '/form-builder': 'Form Builder',
    '/templates':    'Template Builder',
    '/students':     'Student Management',
    '/fees':         'Fee Management',
    '/receipts':     'Receipts',
    '/documents':    'Documents',
    '/reports':      'Reports',
    '/promotion':    'Student Promotion',
    '/settings':     'School Settings',
    '/backup':       'Backup & Restore',
    '/license':      'License Management',
  }
  return (
    <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
      {titles[location.pathname] || 'MY School'}
    </h1>
  )
}
