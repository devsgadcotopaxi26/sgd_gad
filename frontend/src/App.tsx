import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { usePermisosStore } from '@/store/permisosStore'
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

function useEsArchivoOAdmin() {
  const { usuario } = useAuthStore()
  const { roles, esAdmin } = usePermisosStore()
  return usuario?.is_admin || esAdmin || roles.includes('ARCHIVO')
}

function RutaProtegida({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function RutaPublica({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return !isAuthenticated ? <>{children}</> : <Navigate to="/" replace />
}

// Ruta solo para usuarios de archivo / administradores
function RutaArchivoAdmin({ children }: { children: React.ReactNode }) {
  const { cargado } = usePermisosStore()
  const esArchivoOAdmin = useEsArchivoOAdmin()
  // Esperar a que carguen permisos para evitar falso redirect
  if (!cargado) return null
  return esArchivoOAdmin ? <>{children}</> : <Navigate to="/documentos" replace />
}

// Redirige la raíz según el tipo de usuario
function HomeRedirect() {
  const { cargado } = usePermisosStore()
  const esArchivoOAdmin = useEsArchivoOAdmin()
  if (!cargado) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#9ca3af', fontSize: 13 }}>
      Cargando…
    </div>
  )
  return <Navigate to={esArchivoOAdmin ? '/dashboard' : '/documentos'} replace />
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
          <Route index element={<HomeRedirect />} />

          {/* Rutas exclusivas de archivo / admin */}
          <Route path="dashboard"  element={<RutaArchivoAdmin><DashboardPage /></RutaArchivoAdmin>} />
          <Route path="tramites"   element={<RutaArchivoAdmin><TramitesPage /></RutaArchivoAdmin>} />
          <Route path="tramites/configuracion" element={<RutaArchivoAdmin><ConfiguracionTramitesPage /></RutaArchivoAdmin>} />
          <Route path="archivo"    element={<RutaArchivoAdmin><ArchivoPage /></RutaArchivoAdmin>} />
          <Route path="archivo/cuadro-clasificacion" element={<RutaArchivoAdmin><CuadroClasificacionPage /></RutaArchivoAdmin>} />
          <Route path="archivo/ciclo-vital" element={<RutaArchivoAdmin><CicloVitalPage /></RutaArchivoAdmin>} />
          <Route path="archivo/baja-documental" element={<RutaArchivoAdmin><BajaDocumentalPage /></RutaArchivoAdmin>} />
          <Route path="archivo/prestamos" element={<RutaArchivoAdmin><PrestamosCopiasCertificadasPage /></RutaArchivoAdmin>} />
          <Route path="archivo/digitalizacion-masiva" element={<RutaArchivoAdmin><DigitalizacionMasivaPage /></RutaArchivoAdmin>} />
          <Route path="usuarios"   element={<RutaArchivoAdmin><UsuariosPage /></RutaArchivoAdmin>} />
          <Route path="permisos"   element={<RutaArchivoAdmin><PermisosPage /></RutaArchivoAdmin>} />
          <Route path="reportes"   element={<RutaArchivoAdmin><ReportesPage /></RutaArchivoAdmin>} />
          <Route path="auditoria"  element={<RutaArchivoAdmin><AuditoriaPage /></RutaArchivoAdmin>} />
          <Route path="organigrama" element={<RutaArchivoAdmin><OrganigramaPage /></RutaArchivoAdmin>} />
          <Route path="ajustes"    element={<RutaArchivoAdmin><AjustesPage /></RutaArchivoAdmin>} />

          {/* Rutas accesibles para todos los usuarios autenticados */}
          <Route path="documentos" element={<DocumentosPage />} />
          <Route path="perfil"     element={<PerfilPage />} />

          <Route path="quipux-historico" element={<Navigate to="/documentos" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
