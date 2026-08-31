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
import OrganigramaPage from '@/pages/usuarios/OrganigramaPage'
import CuadroClasificacionPage from '@/pages/archivo/CuadroClasificacionPage'
import CicloVitalPage from '@/pages/archivo/CicloVitalPage'
import BajaDocumentalPage from '@/pages/archivo/BajaDocumentalPage'
import PrestamosCopiasCertificadasPage from '@/pages/archivo/PrestamosCopiasCertificadasPage'
import ConfiguracionTramitesPage from '@/pages/tramites/ConfiguracionTramitesPage'

// "Acceso de gestión" = tiene al menos un módulo más allá de documentos/perfil,
// que es lo único que PERMISOS_ROL le da a USUARIO. Decide el destino de
// HomeRedirect, el guard genérico de /dashboard y (en MainLayout) si se
// muestra el sidebar general. Fuente única: permisosStore.tieneAccesoGestion.
function useTieneAccesoGestion() {
  return usePermisosStore(s => s.tieneAccesoGestion())
}

function RutaProtegida({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function RutaPublica({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return !isAuthenticated ? <>{children}</> : <Navigate to="/" replace />
}

// Ruta protegida por el mismo par módulo/acción que usa el sidebar
// (MainLayout NAV), para que "qué veo en el menú" y "a qué puedo entrar por
// URL" sean siempre la misma fuente de verdad.
function RutaConPermiso({ modulo, accion, children }: { modulo: string; accion?: string; children: React.ReactNode }) {
  const { cargado, puede } = usePermisosStore()
  // Esperar a que carguen permisos para evitar falso redirect
  if (!cargado) return null
  return puede(modulo, accion ?? 'ver') ? <>{children}</> : <Navigate to="/documentos" replace />
}

// /dashboard no tiene un módulo propio en PERMISOS_ROL — cualquier rol con
// acceso de gestión (ver §useTieneAccesoGestion) puede verlo.
function RutaConAccesoGestion({ children }: { children: React.ReactNode }) {
  const { cargado } = usePermisosStore()
  const tieneAcceso = useTieneAccesoGestion()
  if (!cargado) return null
  return tieneAcceso ? <>{children}</> : <Navigate to="/documentos" replace />
}

// Redirige la raíz según el tipo de usuario
function HomeRedirect() {
  const { cargado } = usePermisosStore()
  const tieneAcceso = useTieneAccesoGestion()
  if (!cargado) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#9ca3af', fontSize: 13 }}>
      Cargando…
    </div>
  )
  return <Navigate to={tieneAcceso ? '/dashboard' : '/documentos'} replace />
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

          {/* Rutas de gestión — protegidas por el módulo/acción real de cada una */}
          <Route path="dashboard"  element={<RutaConAccesoGestion><DashboardPage /></RutaConAccesoGestion>} />
          <Route path="tramites"   element={<RutaConPermiso modulo="tramites" accion="crear"><TramitesPage /></RutaConPermiso>} />
          <Route path="tramites/configuracion" element={<RutaConPermiso modulo="tramites" accion="editar"><ConfiguracionTramitesPage /></RutaConPermiso>} />
          <Route path="archivo"    element={<RutaConPermiso modulo="archivo" accion="crear"><ArchivoPage /></RutaConPermiso>} />
          <Route path="archivo/cuadro-clasificacion" element={<RutaConPermiso modulo="archivo" accion="editar"><CuadroClasificacionPage /></RutaConPermiso>} />
          <Route path="archivo/ciclo-vital" element={<RutaConPermiso modulo="archivo" accion="editar"><CicloVitalPage /></RutaConPermiso>} />
          <Route path="archivo/baja-documental" element={<RutaConPermiso modulo="archivo" accion="editar"><BajaDocumentalPage /></RutaConPermiso>} />
          <Route path="archivo/prestamos" element={<RutaConPermiso modulo="archivo" accion="editar"><PrestamosCopiasCertificadasPage /></RutaConPermiso>} />
          <Route path="archivo/digitalizacion-masiva" element={<RutaConPermiso modulo="archivo" accion="editar"><DigitalizacionMasivaPage /></RutaConPermiso>} />
          <Route path="usuarios"   element={<RutaConPermiso modulo="usuarios" accion="editar"><UsuariosPage /></RutaConPermiso>} />
          <Route path="reportes"   element={<RutaConPermiso modulo="reportes" accion="generar"><ReportesPage /></RutaConPermiso>} />
          <Route path="auditoria"  element={<RutaConPermiso modulo="ajustes"><AuditoriaPage /></RutaConPermiso>} />
          <Route path="organigrama" element={<RutaConPermiso modulo="organigrama"><OrganigramaPage /></RutaConPermiso>} />
          <Route path="ajustes"    element={<RutaConPermiso modulo="ajustes"><AjustesPage /></RutaConPermiso>} />

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
