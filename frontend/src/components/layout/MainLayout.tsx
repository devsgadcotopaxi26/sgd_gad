import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { usePermisosStore } from '@/store/permisosStore'
import { useThemeStore } from '@/store/themeStore'
import { THEMES, THEME_ORDER } from '@/constants/themes'
import NotificacionesPanel from '@/components/ui/NotificacionesPanel'

import {
  FileText, ClipboardList,
  Archive, Users, Settings, LogOut, ChevronRight,
  Building2, Menu, X, BarChart2, FolderTree, ArrowRight, Trash2, BookOpen, Shield, ScanLine,
  LayoutGrid
} from 'lucide-react'

const NAV = [
  {
    section: 'Documentos',
    items: [
      { to: '/documentos', label: 'Documentos', icon: FileText,      modulo: 'documentos' },
      { to: '/tramites',   label: 'Trámites',   icon: ClipboardList, modulo: 'tramites', accion: 'crear' },
    ],
  },
  {
    section: 'Archivo',
    items: [
      { to: '/archivo',                       label: 'Archivo',                 icon: Archive,   modulo: 'archivo', accion: 'crear' },
      { to: '/archivo/cuadro-clasificacion',  label: 'Cuadro de clasificación', icon: FolderTree, modulo: 'archivo', accion: 'editar' },
      { to: '/archivo/ciclo-vital',           label: 'Ciclo vital',             icon: ArrowRight, modulo: 'archivo', accion: 'editar' },
      { to: '/archivo/baja-documental',       label: 'Baja documental',         icon: Trash2,     modulo: 'archivo', accion: 'editar' },
      { to: '/archivo/digitalizacion-masiva', label: 'Digitalización masiva',   icon: ScanLine,   modulo: 'archivo', accion: 'editar' },
      { to: '/archivo/prestamos',             label: 'Préstamos y copias',      icon: BookOpen,   modulo: 'archivo', accion: 'editar' },
    ],
  },
  {
    section: 'Administración',
    items: [
      { to: '/organigrama', label: 'Organigrama', icon: Building2, modulo: 'organigrama' },
      { to: '/usuarios',    label: 'Usuarios',    icon: Users,     modulo: 'usuarios',  accion: 'editar' },
      { to: '/reportes',    label: 'Reportes',    icon: BarChart2, modulo: 'reportes',  accion: 'generar' },
      { to: '/auditoria',   label: 'Auditoría',   icon: Shield,    modulo: 'ajustes'   },
      { to: '/ajustes',     label: 'Ajustes',     icon: Settings,  modulo: 'ajustes'   },
    ],
  },
]

const BREADCRUMB_EXTRA: Record<string, string> = {
  '/perfil':    'Mi Perfil',
  '/documentos': 'Mis Documentos',
}

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [temaOpen, setTemaOpen]   = useState(false)
  const { usuario, logout }       = useAuthStore()
  const { puede, cargado, cargar } = usePermisosStore()
  // Sidebar general de módulos: solo tiene sentido si hay MÁS de un módulo
  // entre los que elegir. Un usuario cuyo único módulo funcional es
  // Documentos (rol USUARIO) no gana nada con él → se oculta y el workspace
  // documental ocupa todo el ancho. La condición es por MÓDULOS disponibles,
  // no por el nombre del rol (ver permisosStore.tieneAccesoGestion).
  const tieneAccesoGestion = usePermisosStore(s => s.tieneAccesoGestion())
  const soloDocumentos = cargado && !tieneAccesoGestion
  const { tema, setTema }         = useThemeStore()
  const T                         = THEMES[tema].vars
  const navigate                  = useNavigate()
  const location                  = useLocation()
  const queryClient               = useQueryClient()

  useEffect(() => {
    if (usuario && !cargado) cargar()
  }, [usuario, cargado])

  const handleLogout = async () => {
    try { await logout() } finally { queryClient.clear(); navigate('/login') }
  }

  const iniciales    = `${usuario?.nombres?.[0] ?? ''}${usuario?.apellidos?.[0] ?? ''}`.toUpperCase()
  const paginaActual = BREADCRUMB_EXTRA[location.pathname]
    ?? NAV.flatMap(s => s.items).find(i => location.pathname.startsWith(i.to))?.label
    ?? 'SGD'

  const enDocumentos      = location.pathname.startsWith('/documentos')
  const fullscreenContent = enDocumentos

  return (
    <div
      className={T.bgAnimation === 'gradientShift' ? 'bg-gradient-animated' : ''}
      style={{ display: 'flex', height: '100vh', background: T.gradientPrimary, overflow: 'hidden' }}
    >

      {/* ── Sidebar oscuro institucional ──
         Se omite por completo (no solo se colapsa) cuando el usuario solo
         tiene acceso al módulo Documentos: la navegación real de ese caso
         vive en el sidebar de bandejas de DocumentosPage. */}
      {!soloDocumentos && (
      <aside style={{
        width: collapsed ? 68 : 240,
        minWidth: collapsed ? 68 : 240,
        background: T.sbBg,
        borderRight: 'none',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width .2s ease, min-width .2s ease',
        overflow: 'hidden',
        zIndex: 10,
        boxShadow: '2px 0 12px rgba(0,0,0,.18)',
      }}>

        {/* Logo */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: collapsed ? '16px 14px' : '16px 18px',
          borderBottom: `1px solid ${T.sbBorder}`,
          minHeight: 64,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg,#da291c,#ff4d3d)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, boxShadow: '0 2px 8px rgba(218,41,28,.4)',
          }}>
            <img
              src="https://cotopaxi.gob.ec/wp-content/uploads/2026/02/Prefectura-de-Cotopaxi-0062d2.svg"
              alt="GAD"
              style={{ width: 24, height: 24, filter: 'brightness(0) invert(1)', objectFit: 'contain' }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: T.sbTextOn, lineHeight: 1.3, whiteSpace: 'nowrap' }}>
                GAD Cotopaxi
              </p>
              <p style={{ fontSize: 10, color: T.sbIcon, marginTop: 1, whiteSpace: 'nowrap' }}>
                Gestión Documental
              </p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto', overflowX: 'hidden' }}>
          {NAV.map(({ section, items }) => {
            const itemsVisibles = items.filter(({ modulo, accion }: any) =>
              !modulo || puede(modulo, accion ?? 'ver')
            )
            if (itemsVisibles.length === 0) return null
            return (
              <div key={section} style={{ marginBottom: 4 }}>
                {!collapsed && (
                  <p style={{
                    fontSize: 9, fontWeight: 700, color: T.sbLabel,
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                    padding: '10px 10px 4px',
                  }}>
                    {section}
                  </p>
                )}
                {itemsVisibles.map(({ to, label, icon: Icon }: any) => (
                  <NavLink key={to} to={to} title={collapsed ? label : undefined}
                    style={({ isActive }) => ({
                      display: 'flex', alignItems: 'center',
                      gap: 10, padding: collapsed ? '9px 14px' : '9px 12px',
                      borderRadius: 10, marginBottom: 2,
                      textDecoration: 'none', position: 'relative',
                      transition: 'background .15s',
                      background: isActive ? T.sbActive : 'transparent',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                    })}>
                    {({ isActive }) => (
                      <>
                        <Icon size={17} style={{
                          color: isActive ? T.sbIconOn : T.sbIcon,
                          flexShrink: 0, transition: 'color .15s',
                        }} />
                        {!collapsed && (
                          <>
                            <span style={{
                              fontSize: 13, fontWeight: isActive ? 600 : 400,
                              color: isActive ? T.sbTextOn : T.sbText,
                              flex: 1, whiteSpace: 'nowrap',
                            }}>
                              {label}
                            </span>
                            {isActive && (
                              <div style={{ width: 5, height: 5, borderRadius: '50%', background: T.sbIconOn, flexShrink: 0 }} />
                            )}
                          </>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            )
          })}
        </nav>

        {/* Selector de tema */}
        <div style={{ padding: '8px 12px', borderTop: `1px solid ${T.sbBorder}`, position: 'relative' }}>
          <button
            onClick={() => setTemaOpen(v => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 8px', borderRadius: 8, border: 'none',
              background: 'transparent', cursor: 'pointer',
            }}
            title="Cambiar tema de color"
          >
            {/* Dot indicador del tema actual */}
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: THEMES[tema].color, border: '2px solid rgba(255,255,255,.4)', flexShrink: 0 }} />
            {!collapsed && (
              <span style={{ fontSize: 11, color: T.sbText, flex: 1, textAlign: 'left' }}>
                Tema: {THEMES[tema].nombre}
              </span>
            )}
          </button>
          {temaOpen && (
            <div style={{
              position: 'absolute', bottom: '100%', left: 8, right: 8, marginBottom: 4,
              background: '#fff', borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,.18)',
              border: '1px solid #e5e7eb', padding: '12px', zIndex: 50,
            }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.06em' }}>Tema de color</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                {THEME_ORDER.map(id => {
                  const isActive = tema === id
                  return (
                    <div key={id} onClick={() => { setTema(id); setTemaOpen(false) }}
                      style={{ cursor: 'pointer', textAlign: 'center', width: 48 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, margin: '0 auto 4px',
                        background: THEMES[id].color,
                        border: isActive ? '3px solid #002f6c' : '2px solid #e5e7eb',
                        boxShadow: isActive ? '0 0 0 2px rgba(0,47,108,.25)' : '0 1px 4px rgba(0,0,0,.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all .15s',
                      }}>
                        {isActive && (
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fff', opacity: .9 }} />
                        )}
                      </div>
                      <span style={{ fontSize: 9, color: '#6b7280', fontWeight: isActive ? 700 : 400 }}>
                        {THEMES[id].nombre}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Usuario */}
        <div style={{
          padding: collapsed ? '10px 8px' : '10px 12px',
          borderTop: `1px solid ${T.sbBorder}`,
          background: T.sbUser,
        }}>
          {collapsed ? (
            <div onClick={() => navigate('/perfil')}
              style={{
                width: 36, height: 36, borderRadius: '50%', margin: '0 auto',
                background: 'linear-gradient(135deg,#da291c,#ff4d3d)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer',
              }}
              title={usuario?.nombre_completo}>
              {iniciales}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div onClick={() => navigate('/perfil')}
                style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg,#da291c,#ff4d3d)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer',
                  boxShadow: '0 1px 6px rgba(218,41,28,.35)',
                }}>
                {iniciales}
              </div>
              <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => navigate('/perfil')}>
                <p style={{ fontSize: 12, fontWeight: 600, color: T.sbTextOn, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {usuario?.nombre_completo}
                </p>
                <p style={{ fontSize: 10, color: T.sbIcon, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {usuario?.cargo || usuario?.tipo}
                </p>
              </div>
              <button onClick={handleLogout}
                style={{ padding: 6, borderRadius: 8, border: 'none', background: `${T.sbHover}`, cursor: 'pointer', color: T.sbIcon, flexShrink: 0, transition: 'background .12s' }}
                title="Cerrar sesión"
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(218,41,28,.3)')}
                onMouseLeave={e => (e.currentTarget.style.background = T.sbHover)}>
                <LogOut size={15} />
              </button>
            </div>
          )}
        </div>
      </aside>
      )}

      {/* ── Contenido principal ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar — glass effect */}
        <header style={{
          background: T.glassBackground,
          backdropFilter: T.glassBackdrop,
          WebkitBackdropFilter: T.glassBackdrop,
          borderBottom: T.glassBorder,
          padding: '0 20px',
          height: 56,
          display: 'flex', alignItems: 'center', gap: 12,
          flexShrink: 0,
          boxShadow: T.tbShadow,
        }}>
          {/* Colapsar/expandir el sidebar general — sin sidebar no aplica. */}
          {!soloDocumentos && (
            <button onClick={() => setCollapsed(!collapsed)}
              style={{
                width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.tbBorder}`,
                background: T.ctHdrBg ?? '#f4f6fb', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: T.tbSub,
                flexShrink: 0,
              }}>
              {collapsed ? <Menu size={16} /> : <X size={16} />}
            </button>
          )}

          {/* Botón "← Inicio" — visible cuando el usuario está fuera de /documentos */}
          {!enDocumentos && (
            <button
              onClick={() => navigate('/documentos')}
              title="Volver a Documentos"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 8,
                border: `1px solid ${T.tbBorder}`,
                background: T.ctHdrBg ?? '#f4f6fb',
                cursor: 'pointer', color: T.tbSub, fontSize: 11, flexShrink: 0,
              }}
            >
              <LayoutGrid size={13} />
              <span>Inicio</span>
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: T.accentDk, background: `${T.accent}30`, padding: '2px 8px', borderRadius: 6 }}>SGD</span>
            <ChevronRight size={12} style={{ color: T.tbSub }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.tbText }}>{paginaActual}</span>
          </div>

          <div style={{ flex: 1 }} />

          <NotificacionesPanel />

          <div onClick={() => navigate('/perfil')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '4px 10px 4px 4px',
              borderRadius: 10, border: `1px solid ${T.tbBorder}`,
              background: T.tbBg, cursor: 'pointer',
            }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'linear-gradient(135deg,#da291c,#ff4d3d)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, color: '#fff',
            }}>
              {iniciales}
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: T.tbText, lineHeight: 1.2 }}>
                {usuario?.nombres}
              </p>
              <p style={{ fontSize: 10, color: T.tbSub, lineHeight: 1.2 }}>
                {usuario?.unidad_siglas ?? usuario?.tipo}
              </p>
            </div>
          </div>

          {/* Botón cerrar sesión — siempre visible en topbar */}
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            style={{
              width: 32, height: 32, borderRadius: 8,
              border: `1px solid ${T.tbBorder}`,
              background: T.tbBg, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: T.tbSub, flexShrink: 0, transition: 'all .15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(218,41,28,.12)'
              e.currentTarget.style.color = '#da291c'
              e.currentTarget.style.borderColor = 'rgba(218,41,28,.4)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = T.tbBg
              e.currentTarget.style.color = T.tbSub
              e.currentTarget.style.borderColor = T.tbBorder
            }}
          >
            <LogOut size={15} />
          </button>
        </header>

        <main style={{ flex: 1, overflow: fullscreenContent ? 'hidden' : 'auto', padding: fullscreenContent ? 0 : '20px 24px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
