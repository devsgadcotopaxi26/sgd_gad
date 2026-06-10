import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import LoginPage from '@/pages/auth/LoginPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import MainLayout from '@/components/layout/MainLayout'
import UsuariosPage from '@/pages/usuarios/UsuariosPage'
import TramitesPage from '@/pages/tramites/TramitesPage'
import DocumentosPage from '@/pages/documentos/DocumentosPage'
import CorreosPage from '@/pages/correos/CorreosPage'
import ArchivoPage from '@/pages/archivo/ArchivoPage'
import ReportesPage from '@/pages/reportes/ReportesPage'
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
        <Route path="/login" element={
          <RutaPublica><LoginPage /></RutaPublica>
        } />

        {/* Rutas protegidas con layout */}
        <Route path="/" element={
          <RutaProtegida><MainLayout /></RutaProtegida>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          {/* Las demás rutas  */}
          <Route path="usuarios" element={<UsuariosPage />} />
          <Route path="tramites" element={<TramitesPage />} />
          <Route path="documentos" element={<DocumentosPage />} />
          <Route path="correos" element={<CorreosPage />} />
          <Route path="archivo" element={<ArchivoPage />} />
          <Route path="reportes" element={<ReportesPage />} />
          {/* fin de rutas */}
        </Route>
        

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
