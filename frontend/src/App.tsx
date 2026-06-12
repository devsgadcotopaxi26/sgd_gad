import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import LoginPage      from '@/pages/auth/LoginPage'
import DashboardPage  from '@/pages/dashboard/DashboardPage'
import UsuariosPage   from '@/pages/usuarios/UsuariosPage'
import DocumentosPage from '@/pages/documentos/DocumentosPage'
import TramitesPage   from '@/pages/tramites/TramitesPage'
import CorreosPage    from '@/pages/correos/CorreosPage'
import ArchivoPage    from '@/pages/archivo/ArchivoPage'
import ReportesPage   from '@/pages/reportes/ReportesPage'
import PortalPage     from '@/pages/portal/PortalPage'
import MainLayout     from '@/components/layout/MainLayout'
import PerfilPage from '@/pages/usuarios/PerfilPage'
function RutaProtegida({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function RutaPublica({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<RutaPublica><LoginPage /></RutaPublica>} />
        <Route path="/portal" element={<PortalPage />} />

        {/* Rutas protegidas con layout */}
        <Route path="/" element={<RutaProtegida><MainLayout /></RutaProtegida>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"  element={<DashboardPage />} />
          <Route path="documentos" element={<DocumentosPage />} />
          <Route path="tramites"   element={<TramitesPage />} />
          <Route path="correos"    element={<CorreosPage />} />
          <Route path="archivo"    element={<ArchivoPage />} />
          <Route path="usuarios"   element={<UsuariosPage />} />
          <Route path="reportes"   element={<ReportesPage />} />
          <Route path="perfil" element={<PerfilPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}