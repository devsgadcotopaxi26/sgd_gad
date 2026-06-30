import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import {
  Shield, Users, Search, Plus, X, Check,
  ChevronRight, RefreshCw, AlertCircle,
  CheckCircle2, Lock, Unlock, Eye, Edit2,
  UserCheck, UserX, Crown, Settings
} from 'lucide-react'

// ── Servicios ──────────────────────────────────────────────────────────

const permisosService = {
  usuarios: (search?: string) =>
    api.get('/usuarios/', { params: search ? { search } : {} }).then(r => r.data?.results ?? r.data),
  roles: () =>
    api.get('/usuarios/roles/').then(r => r.data?.results ?? r.data),
  asignarRol: (usuarioId: number, rolId: number) =>
    api.post(`/usuarios/${usuarioId}/asignar_rol/`, { rol: rolId }).then(r => r.data),
  revocarRol: (usuarioId: number, rolId: number) =>
    api.post(`/usuarios/${usuarioId}/revocar_rol/`, { rol_id: rolId }).then(r => r.data),
  detalle: (id: number) =>
    api.get(`/usuarios/${id}/`).then(r => r.data),
  bloquear: (id: number, motivo: string) =>
    api.post(`/usuarios/${id}/bloquear/`, { motivo }).then(r => r.data),
  desbloquear: (id: number) =>
    api.post(`/usuarios/${id}/desbloquear/`).then(r => r.data),
}

// ── Constantes ──────────────────────────────────────────────────────────

const PERMISOS_ROL: Record<string, Record<string, string[]>> = {
  ADMIN:      { documentos: ['ver','crear','editar','eliminar','firmar','enviar','archivar'], tramites: ['ver','crear','editar','eliminar','resolver','reasignar'], archivo: ['ver','crear','editar','eliminar','transferir'], usuarios: ['ver','crear','editar','eliminar','bloquear'], reportes: ['ver','generar'], ajustes: ['ver','editar'] },
  PREFECTO:   { documentos: ['ver','crear','editar','firmar','enviar','archivar'], tramites: ['ver','resolver','reasignar'], archivo: ['ver'], reportes: ['ver','generar'] },
  SECRETARIO: { documentos: ['ver','crear','editar','firmar','enviar','archivar'], tramites: ['ver','crear','reasignar'], archivo: ['ver','crear','archivar'], reportes: ['ver','generar'] },
  DIRECTOR:   { documentos: ['ver','crear','editar','firmar','enviar','archivar'], tramites: ['ver','crear','editar','resolver','reasignar'], archivo: ['ver','crear'], reportes: ['ver','generar'] },
  ANALISTA:   { documentos: ['ver','crear','editar','enviar'], tramites: ['ver','crear','editar','resolver'], archivo: ['ver','crear'], reportes: ['ver'] },
  ASISTENTE:  { documentos: ['ver','crear','editar'], tramites: ['ver','crear'], archivo: ['ver'], reportes: ['ver'] },
  RECEPCION:  { documentos: ['ver'], tramites: ['ver','crear'], archivo: ['ver'] },
  ARCHIVO:    { documentos: ['ver','archivar'], tramites: ['ver'], archivo: ['ver','crear','editar','transferir'], reportes: ['ver','generar'] },
  SOLO_LECTURA: { documentos: ['ver'], tramites: ['ver'], archivo: ['ver'], reportes: ['ver'] },
}

const ROL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  ADMIN:       { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  PREFECTO:    { bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff' },
  SECRETARIO:  { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  DIRECTOR:    { bg: '#f0fdf4', text: '#15803d', border: '#86efac' },
  ANALISTA:    { bg: '#e8f1fd', text: '#002f6c', border: '#93c5fd' },
  ASISTENTE:   { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  RECEPCION:   { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' },
  ARCHIVO:     { bg: '#f0fdf4', text: '#0f6e56', border: '#6ee7b7' },
  SOLO_LECTURA:{ bg: '#f9fafb', text: '#6b7280', border: '#e5e7eb' },
}

const MODULOS = ['documentos', 'tramites', 'archivo', 'usuarios', 'reportes', 'ajustes']
const ACCIONES_TODAS = ['ver', 'crear', 'editar', 'eliminar', 'firmar', 'enviar', 'archivar', 'resolver', 'reasignar', 'transferir', 'generar', 'bloquear']

// ── Panel de detalle de usuario ────────────────────────────────────────

function PanelUsuario({ usuario, onClose }: { usuario: any; onClose: () => void }) {
  const qc = useQueryClient()
  const [motivo, setMotivo] = useState('')
  const [mostrarBloqueo, setMostrarBloqueo] = useState(false)

  const { data: detalle, isLoading } = useQuery({
    queryKey: ['usuario-detalle', usuario.id],
    queryFn: () => permisosService.detalle(usuario.id),
  })

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: permisosService.roles,
  })

  const asignar = useMutation({
    mutationFn: (rolId: number) => permisosService.asignarRol(usuario.id, rolId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuario-detalle', usuario.id] })
      qc.invalidateQueries({ queryKey: ['usuarios-permisos'] })
    },
  })

  const revocar = useMutation({
    mutationFn: (rolId: number) => permisosService.revocarRol(usuario.id, rolId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuario-detalle', usuario.id] })
      qc.invalidateQueries({ queryKey: ['usuarios-permisos'] })
    },
  })

  const bloquear = useMutation({
    mutationFn: () => permisosService.bloquear(usuario.id, motivo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios-permisos'] })
      qc.invalidateQueries({ queryKey: ['usuario-detalle', usuario.id] })
      setMostrarBloqueo(false)
    },
  })

  const desbloquear = useMutation({
    mutationFn: () => permisosService.desbloquear(usuario.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios-permisos'] })
      qc.invalidateQueries({ queryKey: ['usuario-detalle', usuario.id] })
    },
  })

  // Roles activos del usuario
  const rolesActivos: number[] = (detalle?.roles ?? [])
    .filter((r: any) => r.activo)
    .map((r: any) => r.rol ?? r.rol_id ?? r.id)

  // Permisos efectivos combinados
  const permisosEfectivos: Record<string, Set<string>> = {}
  const codigosRoles: string[] = (detalle?.roles ?? [])
    .filter((r: any) => r.activo)
    .map((r: any) => r.rol_codigo ?? r.codigo ?? '')

  codigosRoles.forEach(codigo => {
    const perms = PERMISOS_ROL[codigo] ?? {}
    Object.entries(perms).forEach(([mod, acciones]) => {
      if (!permisosEfectivos[mod]) permisosEfectivos[mod] = new Set()
      acciones.forEach(a => permisosEfectivos[mod].add(a))
    })
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
      background: 'rgba(0,0,0,0.3)',
    }} onClick={onClose}>
      <div style={{
        width: 480, height: '100vh', background: '#fff',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #f0f0f0', background: '#f8faff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#002f6c,#0052cc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {(usuario.nombres?.[0] ?? '') + (usuario.apellidos?.[0] ?? '')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0a1628', margin: 0 }}>
                {usuario.nombres} {usuario.apellidos}
              </p>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>
                {usuario.email_institucional || usuario.email} · {usuario.cargo || '—'}
              </p>
            </div>
            <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}>
              <X size={16} />
            </button>
          </div>

          {/* Estado */}
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {detalle?.bloqueado ? (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#fef2f2', color: '#dc2626' }}>
                🔒 Bloqueado
              </span>
            ) : (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#f0fdf4', color: '#15803d' }}>
                ✓ Activo
              </span>
            )}
            {detalle?.is_superuser && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#faf5ff', color: '#7e22ce', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Crown size={9} /> Superusuario
              </span>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              {detalle?.bloqueado ? (
                <button onClick={() => desbloquear.mutate()}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, border: '0.5px solid #86efac', background: '#f0fdf4', cursor: 'pointer', fontSize: 11, color: '#15803d', fontWeight: 600 }}>
                  <Unlock size={11} /> Desbloquear
                </button>
              ) : (
                <button onClick={() => setMostrarBloqueo(!mostrarBloqueo)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, border: '0.5px solid #fecaca', background: '#fef2f2', cursor: 'pointer', fontSize: 11, color: '#dc2626', fontWeight: 600 }}>
                  <Lock size={11} /> Bloquear
                </button>
              )}
            </div>
          </div>

          {mostrarBloqueo && (
            <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
              <input
                style={{ flex: 1, padding: '6px 10px', fontSize: 11, border: '0.5px solid #fecaca', borderRadius: 8, outline: 'none', background: '#fef2f2' }}
                placeholder="Motivo del bloqueo..."
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
              />
              <button onClick={() => bloquear.mutate()}
                style={{ padding: '6px 12px', borderRadius: 8, background: '#dc2626', color: '#fff', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                Confirmar
              </button>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af', fontSize: 12 }}>Cargando...</div>
          ) : (
            <>
              {/* Roles asignados */}
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10 }}>Roles asignados</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {(detalle?.roles ?? []).filter((r: any) => r.activo).length === 0 && (
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>Sin roles asignados</span>
                  )}
                  {(detalle?.roles ?? []).filter((r: any) => r.activo).map((r: any) => {
                    const codigo = r.rol_codigo ?? r.codigo ?? ''
                    const c = ROL_COLORS[codigo] ?? ROL_COLORS.SOLO_LECTURA
                    return (
                      <div key={r.id ?? r.rol} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: c.bg, border: `0.5px solid ${c.border}` }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: c.text }}>{r.rol_nombre ?? codigo}</span>
                        <button onClick={() => revocar.mutate(r.rol ?? r.rol_id)}
                          style={{ border: 'none', background: 'none', cursor: 'pointer', color: c.text, padding: 1, opacity: .7, display: 'flex' }}>
                          <X size={11} />
                        </button>
                      </div>
                    )
                  })}
                </div>

                <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', marginBottom: 6 }}>Agregar rol:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {(roles ?? []).map((rol: any) => {
                    const yaAsignado = (detalle?.roles ?? []).filter((r: any) => r.activo).some((r: any) => (r.rol ?? r.rol_id) === rol.id)
                    const c = ROL_COLORS[rol.codigo] ?? ROL_COLORS.SOLO_LECTURA
                    return (
                      <button key={rol.id}
                        onClick={() => !yaAsignado && asignar.mutate(rol.id)}
                        disabled={yaAsignado}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '4px 10px', borderRadius: 20, cursor: yaAsignado ? 'default' : 'pointer',
                          background: yaAsignado ? '#f3f4f6' : c.bg,
                          border: `0.5px solid ${yaAsignado ? '#e5e7eb' : c.border}`,
                          fontSize: 11, fontWeight: 600,
                          color: yaAsignado ? '#9ca3af' : c.text,
                          opacity: yaAsignado ? .6 : 1,
                        }}>
                        {yaAsignado ? <Check size={10} /> : <Plus size={10} />}
                        {rol.nombre}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Permisos efectivos */}
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10 }}>
                  Permisos efectivos {detalle?.is_superuser ? '(Superusuario — acceso total)' : ''}
                </p>
                {MODULOS.map(modulo => {
                  const acciones = detalle?.is_superuser
                    ? ACCIONES_TODAS
                    : Array.from(permisosEfectivos[modulo] ?? [])
                  if (acciones.length === 0) return null
                  return (
                    <div key={modulo} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', minWidth: 80 }}>
                          {modulo}
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                          {acciones.map(a => (
                            <span key={a} style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 6, background: '#e8f1fd', color: '#002f6c' }}>
                              {a}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {Object.keys(permisosEfectivos).length === 0 && !detalle?.is_superuser && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#fff7ed', border: '0.5px solid #fed7aa', borderRadius: 8, fontSize: 11, color: '#92400e' }}>
                    <AlertCircle size={13} /> Sin permisos asignados — el usuario no puede acceder a ningún módulo
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────

export default function PermisosPage() {
  const [busqueda, setBusqueda]     = useState('')
  const [selected, setSelected]     = useState<any>(null)
  const [filtroRol, setFiltroRol]   = useState('')
  const [tab, setTab]               = useState<'usuarios' | 'roles'>('usuarios')

  const { data: usuarios, isLoading, refetch } = useQuery({
    queryKey: ['usuarios-permisos', busqueda],
    queryFn: () => permisosService.usuarios(busqueda || undefined),
  })

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: permisosService.roles,
  })

  const usuariosFiltrados = (usuarios ?? []).filter((u: any) => {
    if (!filtroRol) return true
    return (u.roles ?? []).some((r: any) => r.activo && (r.rol_codigo ?? r.codigo) === filtroRol)
  })

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {selected && <PanelUsuario usuario={selected} onClose={() => setSelected(null)} />}

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0a1628', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={18} style={{ color: '#002f6c' }} /> Gestión de permisos por rol
        </h1>
        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
          Asigna y revoca roles a los usuarios del sistema
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#fff', borderRadius: 12, border: '0.5px solid #e5e7eb', marginBottom: 16, overflow: 'hidden' }}>
        {[
          { key: 'usuarios', label: 'Usuarios y roles',    icon: Users    },
          { key: 'roles',    label: 'Matriz de permisos',  icon: Settings },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as any)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              padding: '12px 16px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: tab === key ? '#fff' : '#f9fafb',
              color: tab === key ? '#002f6c' : '#9ca3af',
              borderBottom: `2px solid ${tab === key ? '#002f6c' : 'transparent'}`,
            }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'usuarios' && (
        <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '0.5px solid #f5f5f5', background: '#f9fafb' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
              <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#c4c9d4' }} />
              <input
                placeholder="Buscar usuario..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                style={{ width: '100%', padding: '7px 10px 7px 26px', fontSize: 11, border: '0.5px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#374151', outline: 'none' }}
              />
            </div>
            <select value={filtroRol} onChange={e => setFiltroRol(e.target.value)}
              style={{ padding: '7px 10px', fontSize: 11, border: '0.5px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#374151', outline: 'none' }}>
              <option value="">Todos los roles</option>
              {(roles ?? []).map((r: any) => <option key={r.id} value={r.codigo}>{r.nombre}</option>)}
            </select>
            <button onClick={() => refetch()}
              style={{ width: 30, height: 30, borderRadius: 8, border: '0.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
              <RefreshCw size={13} />
            </button>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>{usuariosFiltrados.length} usuarios</span>
          </div>

          {/* Header tabla */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 200px 100px', gap: 10, padding: '8px 16px', background: '#f9fafb', borderBottom: '0.5px solid #f0f0f0' }}>
            {['Usuario', 'Estado', 'Roles activos', 'Acciones'].map(h => (
              <span key={h} style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</span>
            ))}
          </div>

          {/* Lista */}
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 12 }}>Cargando...</div>
          ) : usuariosFiltrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#c4c9d4' }}>
              <Users size={28} style={{ opacity: .3, margin: '0 auto 8px', display: 'block' }} />
              <p style={{ fontSize: 12 }}>No se encontraron usuarios</p>
            </div>
          ) : usuariosFiltrados.map((u: any) => {
            const rolesActivos = (u.roles ?? []).filter((r: any) => r.activo)
            const bloqueado    = u.bloqueado
            return (
              <div key={u.id}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 140px 200px 100px',
                  gap: 10, padding: '10px 16px', borderBottom: '0.5px solid #f9fafb',
                  alignItems: 'center', background: bloqueado ? '#fef9f9' : '#fff',
                }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#002f6c,#0052cc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                      {(u.nombres?.[0] ?? '') + (u.apellidos?.[0] ?? '')}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#0a1628', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.nombres} {u.apellidos}
                        {u.is_superuser && <Crown size={10} style={{ color: '#7e22ce', marginLeft: 4, display: 'inline' }} />}
                      </p>
                      <p style={{ fontSize: 10, color: '#9ca3af', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.cargo || u.email_institucional || u.email}
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  {bloqueado ? (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', gap: 3, width: 'fit-content' }}>
                      <Lock size={9} /> Bloqueado
                    </span>
                  ) : u.activo ? (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#f0fdf4', color: '#15803d', display: 'flex', alignItems: 'center', gap: 3, width: 'fit-content' }}>
                      <CheckCircle2 size={9} /> Activo
                    </span>
                  ) : (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#f9fafb', color: '#6b7280', width: 'fit-content', display: 'block' }}>
                      Inactivo
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {rolesActivos.length === 0 ? (
                    <span style={{ fontSize: 10, color: '#c4c9d4' }}>Sin roles</span>
                  ) : rolesActivos.slice(0, 3).map((r: any) => {
                    const codigo = r.rol_codigo ?? r.codigo ?? ''
                    const c = ROL_COLORS[codigo] ?? ROL_COLORS.SOLO_LECTURA
                    return (
                      <span key={r.id ?? r.rol} style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 8, background: c.bg, color: c.text, border: `0.5px solid ${c.border}` }}>
                        {r.rol_nombre ?? codigo}
                      </span>
                    )
                  })}
                  {rolesActivos.length > 3 && (
                    <span style={{ fontSize: 9, color: '#9ca3af' }}>+{rolesActivos.length - 3}</span>
                  )}
                </div>
                <div>
                  <button onClick={() => setSelected(u)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: '0.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 11, color: '#374151', fontWeight: 500 }}>
                    <Edit2 size={11} /> Gestionar
                    <ChevronRight size={11} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'roles' && (
        <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #e5e7eb', overflow: 'auto' }}>
          <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #f0f0f0', background: '#f9fafb' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', margin: 0 }}>
              Matriz de permisos por rol — referencia de acceso por módulo
            </p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', borderBottom: '0.5px solid #f0f0f0', minWidth: 120 }}>Rol</th>
                  {MODULOS.map(m => (
                    <th key={m} style={{ padding: '8px 10px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', borderBottom: '0.5px solid #f0f0f0', minWidth: 100 }}>
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(PERMISOS_ROL).map(([codigo, permisos]) => {
                  const c = ROL_COLORS[codigo] ?? ROL_COLORS.SOLO_LECTURA
                  return (
                    <tr key={codigo} style={{ borderBottom: '0.5px solid #f9fafb' }}>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10, background: c.bg, color: c.text, border: `0.5px solid ${c.border}` }}>
                          {codigo}
                        </span>
                      </td>
                      {MODULOS.map(modulo => {
                        const acciones = permisos[modulo] ?? []
                        return (
                          <td key={modulo} style={{ padding: '8px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                            {acciones.length === 0 ? (
                              <span style={{ color: '#e5e7eb', fontSize: 14 }}>—</span>
                            ) : (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
                                {acciones.map(a => (
                                  <span key={a} style={{ fontSize: 8, fontWeight: 600, padding: '1px 4px', borderRadius: 4, background: c.bg, color: c.text }}>
                                    {a}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}