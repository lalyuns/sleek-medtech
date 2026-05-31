import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import useAuthStore from './store/authStore'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const LandingPage = lazy(() => import('./pages/LandingPage'))
const ShowcasePage = lazy(() => import('./pages/ShowcasePage'))
const JoinUsPage = lazy(() => import('./pages/JoinUsPage'))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'))
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage'))
const TraceabilityPage = lazy(() => import('./pages/TraceabilityPage'))
const ProductCatalogPage = lazy(() => import('./pages/ProductCatalogPage'))
const ProductOrderPage = lazy(() => import('./pages/ProductOrderPage'))
const ProductAdminPage = lazy(() => import('./pages/ProductAdminPage'))
const AdminMaterialsPage = lazy(() => import('./pages/AdminMaterialsPage'))
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'))
const AdminAuditPage = lazy(() => import('./pages/AdminAuditPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const PublicSiteAdminPage = lazy(() => import('./pages/PublicSiteAdminPage'))

function PrivateRoute({ children }) {
  const { token } = useAuthStore()
  const location = useLocation()
  return token ? children : <Navigate to="/login" replace state={{ next: location.pathname }} />
}

function HighPrivilegeRoute({ children }) {
  const { token, user } = useAuthStore()
  const location = useLocation()

  if (!token) return <Navigate to="/login" replace state={{ next: location.pathname }} />
  return hasHighPrivilege(user) ? children : <PermissionDenied />
}

function hasHighPrivilege(user) {
  if (!user) return false

  const role = String(user.role || user.user_role || user.type || '').toLowerCase()
  const permissions = [...toArray(user.permissions), ...toArray(user.scopes)].map((item) => String(item).toLowerCase())

  return ['admin', 'super_admin', 'owner'].includes(role) || user.is_admin === true || permissions.includes('admin')
}

function toArray(value) {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/showcase" element={<ShowcasePage />} />
          <Route path="/join-us" element={<JoinUsPage />} />
          <Route path="/careers" element={<Navigate to="/join-us" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/catalog" element={<ProductCatalogPage />} />
          <Route path="/order" element={<ProductOrderPage />} />
          <Route path="/projects" element={<PrivateRoute><ProjectsPage /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
          <Route path="/cms" element={<HighPrivilegeRoute><PublicSiteAdminPage /></HighPrivilegeRoute>} />
          <Route path="/admin/public-site" element={<Navigate to="/cms" replace />} />
          <Route path="/product-admin" element={<HighPrivilegeRoute><ProductAdminPage /></HighPrivilegeRoute>} />
          <Route path="/projects/:id" element={<PrivateRoute><ProjectDetailPage /></PrivateRoute>} />
          <Route path="/projects/:id/traceability" element={<PrivateRoute><TraceabilityPage /></PrivateRoute>} />
          <Route path="/admin/materials" element={<PrivateRoute><AdminMaterialsPage /></PrivateRoute>} />
          <Route path="/admin/users" element={<PrivateRoute><AdminUsersPage /></PrivateRoute>} />
          <Route path="/admin/audit" element={<PrivateRoute><AdminAuditPage /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) return
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname, hash])

  return null
}

function PermissionDenied() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#0f172a', color: '#e2e8f0' }}>
      <div style={{ maxWidth: 520, padding: 28, border: '1px solid #334155', borderRadius: 8, background: '#111c31' }}>
        <p style={{ margin: '0 0 10px', color: '#60a5fa', fontWeight: 800 }}>High Privilege Required</p>
        <h1 style={{ margin: '0 0 12px', fontSize: 32 }}>此後台僅開放高權限帳號</h1>
        <p style={{ margin: '0 0 22px', color: '#94a3b8', lineHeight: 1.7 }}>
          請使用系統管理員帳號登入，或請管理員調整資料庫中的使用者角色。
        </p>
        <Link to="/projects" style={{ color: '#bfdbfe', fontWeight: 700 }}>返回內部系統</Link>
      </div>
    </div>
  )
}

function PageLoading() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0f172a', color: '#94a3b8' }}>
      Loading...
    </div>
  )
}
