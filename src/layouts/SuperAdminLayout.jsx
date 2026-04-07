import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Building2, Key, BarChart3,
  LogOut, ShieldCheck, Menu, X, GraduationCap,
} from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'
import { logoutSuperAdmin } from '../utils/superAdminAuth'

const navItems = [
  { path: '/super-admin/dashboard',  label: 'Dashboard',       icon: LayoutDashboard },
  { path: '/super-admin/institutes', label: 'Institutes',      icon: Building2 },
  { path: '/super-admin/licenses',   label: 'License Gen',     icon: Key },
  { path: '/super-admin/reports',    label: 'All Reports',     icon: BarChart3 },

]

const pageTitles = {
  '/super-admin/dashboard':  'Dashboard',
  '/super-admin/institutes': 'Institute Management',
  '/super-admin/licenses':   'License Generator',
  '/super-admin/reports':    'All Schools Report',

}

export default function SuperAdminLayout() {
  const navigate        = useNavigate()
  const location        = useLocation()
  const [open, setOpen] = useState(false)

  const handleLogout = async () => {
    await logoutSuperAdmin()
    navigate('/super-admin/login', { replace: true })
  }

  const title = pageTitles[location.pathname] || 'Admin Panel'

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar — indigo/white */}
      <aside className={clsx(
        'fixed lg:relative z-30 h-full flex flex-col w-64',
        'bg-indigo-700 shadow-xl',
        'transition-transform duration-300',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      )}>

        {/* Logo */}
        <div className="flex items-center gap-3 h-16 px-5 border-b border-indigo-600 shrink-0">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">MY School</p>
            <p className="text-xs text-indigo-200 truncate">Admin Panel</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="lg:hidden ml-auto p-1 rounded text-indigo-200 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-indigo-100 hover:bg-indigo-600 hover:text-white',
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-indigo-600 shrink-0 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-indigo-600/50">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">Super Admin</p>
              <p className="text-xs text-indigo-200 truncate">Administrator</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-indigo-200 hover:text-white hover:bg-red-500/20 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 gap-4 shrink-0 shadow-sm">
          <button
            onClick={() => setOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-900">{title}</h1>
            <p className="text-xs text-gray-400 hidden sm:block">MY School — Super Admin</p>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-full border border-indigo-100">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-xs font-semibold text-indigo-700">Super Admin</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
