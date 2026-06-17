import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { usePermisosStore } from '@/store/permisosStore'
import NotificacionesPanel from '@/components/ui/NotificacionesPanel'
import {
  LayoutDashboard, FileText, ClipboardList, Mail,
  Archive, Users, Settings, LogOut, ChevronRight,
  Building2, Menu, X, Search, BarChart2, FolderTree, ArrowRight
} from 'lucide-react'

const NAV = [
  {
    section: 'Principal',
    items: [
      { to: '/dashboard',  label: 'Escritorio',  icon: LayoutDashboard, modulo: '' },
    ]
  },
  {
    section: 'Gestión documental',
    items: [
      { to: '/documentos', label: 'Documentos',  icon: FileText,        modulo: 'documentos', badge: 12 },
      { to: '/tramites',   label: 'Trámites',    icon: ClipboardList,   modulo: 'tramites',   badge: 5  },
      { to: '/correos',    label: 'Correos',     icon: Mail,            modulo: 'correos',    badge: 3  },
    ]
  },
  {
    section: 'Organización',
    items: [
      { to: '/archivo',    label: 'Archivo',     icon: Archive,         modulo: 'archivo'    },
      { to: '/organigrama',label: 'Organigrama', icon: Building2,       modulo: ''           },
      { to: '/usuarios',   label: 'Usuarios',    icon: Users,           modulo: 'usuarios'   },
      { to: '/archivo/cuadro-clasificacion', label: 'Cuadro de Clasificación', icon: FolderTree, modulo: 'archivo' },
      { to: '/archivo/ciclo-vital', label: 'Ciclo Vital', icon: ArrowRight, modulo: 'archivo' },
    ]
  },
  {
    section: 'Sistema',
    items: [
      { to: '/reportes',   label: 'Reportes',    icon: BarChart2,       modulo: 'reportes'   },
      { to: '/ajustes',    label: 'Ajustes',     icon: Settings,        modulo: ''           },
    ]
  },
]

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const { usuario, logout }       = useAuthStore()
  const navigate                  = useNavigate()
  const location                  = useLocation()
  const { puede, cargado, cargar } = usePermisosStore()

  useEffect(() => {
    if (usuario && !cargado) {
      cargar()
    }
  }, [usuario, cargado])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const iniciales    = `${usuario?.nombres?.[0] ?? ''}${usuario?.apellidos?.[0] ?? ''}`.toUpperCase()
  const paginaActual = NAV.flatMap(s => s.items).find(i => location.pathname.startsWith(i.to))?.label ?? 'SGD'

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f4f6fa', overflow: 'hidden' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: collapsed ? 68 : 240,
        minWidth: collapsed ? 68 : 240,
        background: '#fff',
        borderRight: '1px solid #f0f0f0',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width .2s ease, min-width .2s ease',
        overflow: 'hidden',
        zIndex: 10,
      }}>

        {/* Logo */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: collapsed ? '16px 14px' : '16px 18px',
          borderBottom: '1px solid #f5f5f5',
          minHeight: 64,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: '#002f6c',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
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
              <p style={{ fontSize: 12, fontWeight: 700, color: '#0a1628', lineHeight: 1.3, whiteSpace: 'nowrap' }}>
                GAD Cotopaxi
              </p>
              <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 1, whiteSpace: 'nowrap' }}>
                Gestión Documental
              </p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto', overflowX: 'hidden' }}>
          {NAV.map(({ section, items }) => {
            const itemsVisibles = items.filter(({ modulo }: any) =>
              !modulo || puede(modulo, 'ver')
            )
            if (itemsVisibles.length === 0) return null
            return (
              <div key={section} style={{ marginBottom: 4 }}>
                {!collapsed && (
                  <p style={{
                    fontSize: 9, fontWeight: 700, color: '#c4c9d4',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    padding: '8px 10px 4px',
                  }}>
                    {section}
                  </p>
                )}
                {itemsVisibles.map(({ to, label, icon: Icon, badge }: any) => (
                  <NavLink key={to} to={to} title={collapsed ? label : undefined}
                    style={({ isActive }) => ({
                      display: 'flex', alignItems: 'center',
                      gap: 10, padding: collapsed ? '9px 14px' : '9px 12px',
                      borderRadius: 10, marginBottom: 2,
                      textDecoration: 'none', position: 'relative',
                      transition: 'background .15s',
                      background: isActive ? '#002f6c' : 'transparent',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                    })}>
                    {({ isActive }) => (
                      <>
                        <Icon size={17} style={{
                          color: isActive ? '#fff' : '#9ca3af',
                          flexShrink: 0, transition: 'color .15s',
                        }} />
                        {!collapsed && (
                          <>
                            <span style={{
                              fontSize: 13, fontWeight: isActive ? 600 : 500,
                              color: isActive ? '#fff' : '#4b5563',
                              flex: 1, whiteSpace: 'nowrap',
                            }}>
                              {label}
                            </span>
                            {badge && !isActive && (
                              <span style={{
                                fontSize: 10, fontWeight: 700,
                                background: '#da291c', color: '#fff',
                                padding: '1px 6px', borderRadius: 20, flexShrink: 0,
                              }}>
                                {badge}
                              </span>
                            )}
                            {isActive && (
                              <ChevronRight size={13} style={{ color: 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
                            )}
                          </>
                        )}
                        {collapsed && badge && (
                          <span style={{
                            position: 'absolute', top: 6, right: 6,
                            width: 7, height: 7, borderRadius: '50%',
                            background: '#da291c',
                          }} />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            )
          })}
        </nav>

        {/* Usuario */}
        <div style={{ padding: collapsed ? '10px 8px' : '10px 12px', borderTop: '1px solid #f5f5f5' }}>
          {collapsed ? (
            <div onClick={() => navigate('/perfil')}
              style={{
                width: 36, height: 36, borderRadius: '50%', margin: '0 auto',
                background: 'linear-gradient(135deg,#002f6c,#0052cc)',
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
                  background: 'linear-gradient(135deg,#002f6c,#0052cc)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer',
                }}>
                {iniciales}
              </div>
              <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => navigate('/perfil')}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#0a1628', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {usuario?.nombre_completo}
                </p>
                <p style={{ fontSize: 10, color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {usuario?.cargo || usuario?.tipo}
                </p>
              </div>
              <button onClick={handleLogout}
                style={{ padding: 6, borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', flexShrink: 0 }}
                title="Cerrar sesión">
                <LogOut size={15} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Contenido principal ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <header style={{
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          padding: '0 20px',
          height: 56,
          display: 'flex', alignItems: 'center', gap: 12,
          flexShrink: 0,
        }}>
          <button onClick={() => setCollapsed(!collapsed)}
            style={{
              width: 32, height: 32, borderRadius: 8, border: '1px solid #f0f0f0',
              background: '#fff', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: '#9ca3af',
              flexShrink: 0,
            }}>
            {collapsed ? <Menu size={16} /> : <X size={16} />}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>SGD</span>
            <ChevronRight size={12} style={{ color: '#d1d5db' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0a1628' }}>{paginaActual}</span>
          </div>

          <div style={{ flex: 1, maxWidth: 340, position: 'relative', marginLeft: 8 }}>
            <Search size={13} style={{
              position: 'absolute', left: 10, top: '50%',
              transform: 'translateY(-50%)', color: '#c4c9d4',
            }} />
            <input type="text"
              placeholder="Buscar documentos, trámites, expedientes..."
              style={{
                width: '100%', padding: '7px 12px 7px 30px',
                fontSize: 12, border: '1px solid #f0f0f0',
                borderRadius: 10, background: '#f9fafb',
                color: '#374151', outline: 'none',
              }}
            />
          </div>

          <div style={{ flex: 1 }} />

          <NotificacionesPanel />

          <div onClick={() => navigate('/perfil')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '4px 10px 4px 4px',
              borderRadius: 10, border: '1px solid #f0f0f0',
              background: '#fff', cursor: 'pointer',
            }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'linear-gradient(135deg,#002f6c,#0052cc)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, color: '#fff',
            }}>
              {iniciales}
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#0a1628', lineHeight: 1.2 }}>
                {usuario?.nombres}
              </p>
              <p style={{ fontSize: 10, color: '#9ca3af', lineHeight: 1.2 }}>
                {usuario?.unidad_siglas ?? usuario?.tipo}
              </p>
            </div>
          </div>
        </header>

        <main style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}