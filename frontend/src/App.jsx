import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'))
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage'))
const TraceabilityPage = lazy(() => import('./pages/TraceabilityPage'))
const ProductCatalogPage = lazy(() => import('./pages/ProductCatalogPage'))
const ProductAdminPage = lazy(() => import('./pages/ProductAdminPage'))
const AdminMaterialsPage = lazy(() => import('./pages/AdminMaterialsPage'))
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'))
const AdminAuditPage = lazy(() => import('./pages/AdminAuditPage'))
const OnboardingGuidePage = lazy(() => import('./pages/OnboardingGuidePage'))

function PrivateRoute({ children }) {
  const { token } = useAuthStore()
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/guide" element={<OnboardingGuidePage />} />
          <Route path="/catalog" element={<ProductCatalogPage />} />
          <Route path="/projects" element={<PrivateRoute><ProjectsPage /></PrivateRoute>} />
          <Route path="/product-admin" element={<PrivateRoute><ProductAdminPage /></PrivateRoute>} />
          <Route path="/projects/:id" element={<PrivateRoute><ProjectDetailPage /></PrivateRoute>} />
          <Route path="/projects/:id/traceability" element={<PrivateRoute><TraceabilityPage /></PrivateRoute>} />
          <Route path="/admin/materials" element={<PrivateRoute><AdminMaterialsPage /></PrivateRoute>} />
          <Route path="/admin/users" element={<PrivateRoute><AdminUsersPage /></PrivateRoute>} />
          <Route path="/admin/audit" element={<PrivateRoute><AdminAuditPage /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/projects" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

function PageLoading() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f3f6fa', color: '#66758f', fontWeight: 800 }}>
      Loading...
    </div>
  )
}
