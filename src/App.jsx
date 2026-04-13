import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LicenseGuard          from './components/LicenseGuard'
import SchoolAuthGuard       from './components/SchoolAuthGuard'
import SuperAdminGuard       from './components/SuperAdminGuard'
import ErrorBoundary         from './components/ErrorBoundary'
import { Toaster }           from './components/Toast'
import { ConfirmModalRoot }  from './components/ConfirmModal'
import { PageLoader }        from './components/LoadingSpinner'
import UpdateNotification    from './components/UpdateNotification'
import DashboardLayout       from './layouts/DashboardLayout'
import SuperAdminLayout      from './layouts/SuperAdminLayout'

// Public / Super Admin pages
const SuperAdminLogin      = lazy(() => import('./pages/superadmin/SuperAdminLogin'))
const SuperAdminDashboard  = lazy(() => import('./pages/superadmin/SuperAdminDashboard'))
const InstituteManagement  = lazy(() => import('./pages/superadmin/InstituteManagement'))
const LicenseGenerator     = lazy(() => import('./pages/superadmin/LicenseGenerator'))
const AllSchoolsReports    = lazy(() => import('./pages/superadmin/AllSchoolsReports'))

// School app pages (lazy)
const Dashboard       = lazy(() => import('./pages/Dashboard'))
const FormBuilder     = lazy(() => import('./pages/FormBuilder'))
const TemplateBuilder = lazy(() => import('./pages/TemplateBuilder'))
const Students        = lazy(() => import('./pages/Students'))
const AddStudent      = lazy(() => import('./pages/AddStudent'))
const FeeStructure    = lazy(() => import('./pages/FeeStructure'))
const StudentDetail   = lazy(() => import('./pages/StudentDetail'))
const Fees            = lazy(() => import('./pages/Fees'))
const Receipts        = lazy(() => import('./pages/Receipts'))
const Documents       = lazy(() => import('./pages/Documents'))
const Reports         = lazy(() => import('./pages/Reports'))
const Promotion       = lazy(() => import('./pages/Promotion'))
const Settings        = lazy(() => import('./pages/Settings'))
const Backup          = lazy(() => import('./pages/Backup'))
const License         = lazy(() => import('./pages/License'))
const NotFound        = lazy(() => import('./pages/NotFound'))

export default function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <ConfirmModalRoot />

      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/superadmin" element={<Navigate to="/super-admin/login" replace />} />
            <Route path="/superadmin/*" element={<Navigate to="/super-admin/login" replace />} />

            <Route path="/super-admin/login" element={<SuperAdminLogin />} />

            <Route
              path="/super-admin"
              element={
                <SuperAdminGuard>
                  <SuperAdminLayout />
                </SuperAdminGuard>
              }
            >
              <Route index element={<Navigate to="/super-admin/dashboard" replace />} />
              <Route path="dashboard"  element={<SuperAdminDashboard />} />
              <Route path="institutes" element={<InstituteManagement />} />
              <Route path="licenses"   element={<LicenseGenerator />} />
              <Route path="reports"    element={<AllSchoolsReports />} />

            </Route>

            <Route
              path="/"
              element={
                <LicenseGuard>
                  <SchoolAuthGuard>
                    <DashboardLayout />
                  </SchoolAuthGuard>
                </LicenseGuard>
              }
            >
              <Route index                    element={<Dashboard />} />
              <Route path="form-builder"    element={<FormBuilder />} />
              <Route path="templates"       element={<TemplateBuilder />} />
              <Route path="students"        element={<Students />} />
              <Route path="students/add"    element={<AddStudent />} />
              <Route path="students/:id/edit" element={<AddStudent />} />
              <Route path="students/:id"    element={<StudentDetail />} />
              <Route path="fees"            element={<Fees />} />
              <Route path="fee-structure"   element={<FeeStructure />} />
              <Route path="receipts"        element={<Receipts />} />
              <Route path="documents"       element={<Documents />} />
              <Route path="reports"         element={<Reports />} />
              <Route path="promotion"       element={<Promotion />} />
              <Route path="settings"        element={<Settings />} />
              <Route path="backup"          element={<Backup />} />
              <Route path="license"         element={<License />} />
              <Route path="*"               element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </ErrorBoundary>
      <UpdateNotification />
    </BrowserRouter>
  )
}
