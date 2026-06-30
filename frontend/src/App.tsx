import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import LoginPage      from '@/pages/auth/LoginPage'
import DashboardPage  from '@/pages/dashboard/DashboardPage'
import UsuariosPage   from '@/pages/usuarios/UsuariosPage'
import DocumentosPage from '@/pages/documentos/DocumentosPage'
import TramitesPage   from '@/pages/tramites/TramitesPage'
import ArchivoPage    from '@/pages/archivo/ArchivoPage'
import ReportesPage   from '@/pages/reportes/ReportesPage'
import AuditoriaPage  from '@/pages/auditoria/AuditoriaPage'
import PortalPage     from '@/pages/portal/PortalPage'
import MainLayout     from '@/components/layout/MainLayout'
import PerfilPage from '@/pages/usuarios/PerfilPage'
import AjustesPage from '@/pages/ajustes/AjustesPage'
import DigitalizacionMasivaPage from '@/pages/archivo/DigitalizacionMasivaPage'
import PermisosPage from '@/pages/usuarios/PermisosPage'
import OrganigramaPage from '@/pages/usuarios/OrganigramaPage'
import CuadroClasificacionPage from '@/pages/archivo/CuadroClasificacionPage'
import CicloVitalPage from '@/pages/archivo/CicloVitalPage'
import BajaDocumentalPage from '@/pages/archivo/BajaDocumentalPage'
import PrestamosCopiasCertificadasPage from '@/pages/archivo/PrestamosCopiasCertificadasPage'
import ConfiguracionTramitesPage from '@/pages/tramites/ConfiguracionTramitesPage'
import QuipuxHistoricoPage from '@/pages/quipux/QuipuxHistoricoPage'

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
          <Route path="tramites/configuracion" element={<ConfiguracionTramitesPage />} />  
          <Route path="archivo"    element={<ArchivoPage />} />
          <Route path="archivo/cuadro-clasificacion" element={<CuadroClasificacionPage />} />
          <Route path="archivo/ciclo-vital" element={<CicloVitalPage />} />
          <Route path="archivo/baja-documental" element={<BajaDocumentalPage />} />
          <Route path="archivo/prestamos" element={<PrestamosCopiasCertificadasPage />} />
          <Route path="archivo/digitalizacion-masiva" element={<DigitalizacionMasivaPage />} />
          <Route path="usuarios"   element={<UsuariosPage />} />
          <Route path="permisos" element={<PermisosPage />} />
          <Route path="reportes"   element={<ReportesPage />} />
          <Route path="auditoria"  element={<AuditoriaPage />} />
          <Route path="perfil" element={<PerfilPage />} />
          <Route path="ajustes" element={<AjustesPage />} />
          <Route path="organigrama" element={<OrganigramaPage />} />
          <Route path="quipux-historico" element={<QuipuxHistoricoPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}