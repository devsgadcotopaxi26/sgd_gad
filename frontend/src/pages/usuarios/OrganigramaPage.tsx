import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { organizacionService } from '@/services/organizacion.service'
import {
  Building2, ChevronRight, ChevronDown, Users,
  Plus, X, Edit3, CheckCircle, XCircle, Search,
  LayoutList, Network
} from 'lucide-react'

const TIPO_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  prefectura:   { bg: '#002f6c', text: '#fff',    border: '#002f6c' },
  viceprefectura:{ bg: '#003d8f', text: '#fff',   border: '#003d8f' },
  secretaria:   { bg: '#e8f1fd', text: '#002f6c', border: '#b5d4f4' },
  direccion:    { bg: '#faeeda', text: '#854f0b', border: '#f5c98a' },
  departamento: { bg: '#f0fdf4', text: '#15803d', border: '#86efac' },
  unidad:       { bg: '#f9fafb', text: '#374151', border: '#e5e7eb' },
  coordinacion: { bg: '#faf5ff', text: '#7e22ce', border: '#d8b4fe' },
  other:        { bg: '#f9fafb', text: '#6b7280', border: '#e5e7eb' },
}

function getNivelPadding(nivel: number) {
  return nivel * 20
}

function UnidadRow({
  unidad, nivel, expanded, onToggle, onSelect, selected
}: {
  unidad: any; nivel: number; expanded: boolean
  onToggle: () => void; onSelect: () => void; selected: boolean
}) {
  const cfg     = TIPO_CONFIG[unidad.tipo] ?? TIPO_CONFIG.other
  const tieneHijos = unidad.hijos?.length > 0

  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px',
        paddingLeft: 12 + getNivelPadding(nivel),
        cursor: 'pointer',
        background: selected ? '#e8f1fd' : 'transparent',
        borderLeft: selected ? '2px solid #002f6c' : '2px solid transparent',
        borderBottom: '0.5px solid #f5f6f8',
        transition: 'background .1s',
      }}
    >
      {/* Toggle */}
      <div
        onClick={e => { e.stopPropagation(); if (tieneHijos) onToggle() }}
        style={{
          width: 18, height: 18, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: tieneHijos ? '#9ca3af' : 'transparent',
          cursor: tieneHijos ? 'pointer' : 'default',
        }}>
        {tieneHijos
          ? expanded
            ? <ChevronDown size={14} />
            : <ChevronRight size={14} />
          : <span style={{ width: 14 }} />}
      </div>

      {/* Ícono tipo */}
      <div style={{
        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Building2 size={13} style={{ color: cfg.text }} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 12, fontWeight: selected ? 600 : 500,
          color: selected ? '#002f6c' : '#0a1628',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {unidad.nombre}
        </p>
        <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>
          {unidad.tipo?.charAt(0).toUpperCase() + unidad.tipo?.slice(1)}
          {unidad.siglas ? ` · ${unidad.siglas}` : ''}
        </p>
      </div>

      {/* Estado */}
      {!unidad.activo && (
        <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 10, background: '#fef2f2', color: '#dc2626' }}>
          Inactivo
        </span>
      )}
    </div>
  )
}

function ArbolRecursivo({
  nodos, nivel = 0, expandidos, onToggle, onSelect, selected
}: {
  nodos: any[]; nivel?: number
  expandidos: Set<number>; onToggle: (id: number) => void
  onSelect: (u: any) => void; selected: any
}) {
  return (
    <>
      {nodos.map(nodo => (
        <div key={nodo.id}>
          <UnidadRow
            unidad={nodo} nivel={nivel}
            expanded={expandidos.has(nodo.id)}
            onToggle={() => onToggle(nodo.id)}
            onSelect={() => onSelect(nodo)}
            selected={selected?.id === nodo.id}
          />
          {expandidos.has(nodo.id) && nodo.hijos?.length > 0 && (
            <ArbolRecursivo
              nodos={nodo.hijos} nivel={nivel + 1}
              expandidos={expandidos} onToggle={onToggle}
              onSelect={onSelect} selected={selected}
            />
          )}
        </div>
      ))}
    </>
  )
}

function PanelDetalle({ unidad, onClose }: { unidad: any; onClose: () => void }) {
  const qc = useQueryClient()
  const cfg = TIPO_CONFIG[unidad.tipo] ?? TIPO_CONFIG.other

  const activar = useMutation({
    mutationFn: () => organizacionService.activar(unidad.id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['organigrama-arbol'] }),
  })

  const desactivar = useMutation({
    mutationFn: () => organizacionService.desactivar(unidad.id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['organigrama-arbol'] }),
  })

  return (
    <div style={{
      width: 320, flexShrink: 0, background: '#fff',
      borderLeft: '0.5px solid #e5e7eb',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #f5f6f8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: cfg.bg, border: `1px solid ${cfg.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Building2 size={16} style={{ color: cfg.text }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0a1628', lineHeight: 1.3 }}>
              {unidad.nombre}
            </p>
            <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>
              {unidad.tipo?.charAt(0).toUpperCase() + unidad.tipo?.slice(1)}
            </p>
          </div>
          <button onClick={onClose}
            style={{ padding: 4, borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af' }}>
            <X size={14} />
          </button>
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', gap: 5 }}>
          {unidad.activo ? (
            <button onClick={() => desactivar.mutate()}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, border: '0.5px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
              <XCircle size={12} /> Desactivar
            </button>
          ) : (
            <button onClick={() => activar.mutate()}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, border: '0.5px solid #86efac', background: '#f0fdf4', color: '#15803d', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
              <CheckCircle size={12} /> Activar
            </button>
          )}
        </div>
      </div>

      {/* Datos */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {[
          { label: 'Código',      value: unidad.codigo     },
          { label: 'Siglas',      value: unidad.siglas     },
          { label: 'Tipo',        value: unidad.tipo       },
          { label: 'Nivel',       value: unidad.nivel_nombre },
          { label: 'Responsable', value: unidad.responsable_nombre || 'Sin asignar' },
          { label: 'Email',       value: unidad.email      },
          { label: 'Teléfono',    value: unidad.telefono   },
          { label: 'Ubicación',   value: unidad.ubicacion  },
        ].filter(({ value }) => value).map(({ label, value }) => (
          <div key={label} style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>
              {label}
            </p>
            <p style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{value}</p>
          </div>
        ))}

        {unidad.funciones && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
              Funciones
            </p>
            <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>{unidad.funciones}</p>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
          {[
            { label: 'Subunidades', value: unidad.hijos?.length ?? 0 },
            { label: 'Estado',      value: unidad.activo ? 'Activo' : 'Inactivo' },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: 10, borderRadius: 8, background: '#f8faff', textAlign: 'center' }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#002f6c' }}>{value}</p>
              <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function OrganigramaPage() {
  const [expandidos, setExpandidos]   = useState<Set<number>>(new Set([1, 2, 3]))
  const [selected, setSelected]       = useState<any>(null)
  const [busqueda, setBusqueda]       = useState('')
  const [vista, setVista]             = useState<'arbol' | 'lista'>('arbol')
  const [filtroTipo, setFiltroTipo]   = useState('')

  const { data: arbol, isLoading } = useQuery({
    queryKey: ['organigrama-arbol'],
    queryFn:  organizacionService.arbol,
  })

  const { data: lista } = useQuery({
    queryKey: ['organigrama-lista', busqueda, filtroTipo],
    queryFn: () => organizacionService.listar({ search: busqueda, tipo: filtroTipo }),
    enabled: vista === 'lista',
  })

  const toggleExpanded = (id: number) => {
    setExpandidos(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const expandirTodo = () => {
    const ids = new Set<number>()
    const recopilar = (nodos: any[]) => {
      nodos.forEach(n => { ids.add(n.id); if (n.hijos) recopilar(n.hijos) })
    }
    if (arbol) recopilar(arbol)
    setExpandidos(ids)
  }

  const contraerTodo = () => setExpandidos(new Set())

  const nodos = arbol ?? []
  const unidades = lista?.results ?? []

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Organigrama institucional</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Estructura organizativa del GAD Provincial de Cotopaxi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setVista('arbol')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all"
            style={{ background: vista === 'arbol' ? '#002f6c' : '#f3f4f6', color: vista === 'arbol' ? '#fff' : '#6b7280' }}>
            <Network size={13} /> Árbol
          </button>
          <button onClick={() => setVista('lista')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all"
            style={{ background: vista === 'lista' ? '#002f6c' : '#f3f4f6', color: vista === 'lista' ? '#fff' : '#6b7280' }}>
            <LayoutList size={13} /> Lista
          </button>
        </div>
      </div>

      {/* Leyenda tipos */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(TIPO_CONFIG).filter(([k]) => k !== 'other').map(([tipo, cfg]) => (
          <span key={tipo} style={{
            fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
            background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}`,
            textTransform: 'capitalize', cursor: 'pointer',
          }}
            onClick={() => setFiltroTipo(filtroTipo === tipo ? '' : tipo)}>
            {tipo}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 220px)' }}>

        {/* Panel principal */}
        <div style={{ flex: 1, background: '#fff', borderRadius: 14, border: '0.5px solid #e5e7eb', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '0.5px solid #f5f6f8' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
              <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#c4c9d4' }} />
              <input placeholder="Buscar unidad..."
                value={busqueda} onChange={e => setBusqueda(e.target.value)}
                style={{ width: '100%', padding: '6px 10px 6px 26px', fontSize: 11, border: '0.5px solid #e5e7eb', borderRadius: 8, background: '#f9fafb', color: '#374151', outline: 'none' }} />
            </div>

            {vista === 'arbol' && (
              <>
                <button onClick={expandirTodo}
                  style={{ padding: '5px 10px', fontSize: 11, fontWeight: 500, borderRadius: 8, border: '0.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#6b7280' }}>
                  Expandir todo
                </button>
                <button onClick={contraerTodo}
                  style={{ padding: '5px 10px', fontSize: 11, fontWeight: 500, borderRadius: 8, border: '0.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#6b7280' }}>
                  Contraer todo
                </button>
              </>
            )}

            {vista === 'lista' && (
              <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
                style={{ padding: '6px 10px', fontSize: 11, border: '0.5px solid #e5e7eb', borderRadius: 8, background: '#f9fafb', color: '#374151', outline: 'none' }}>
                <option value="">Todos los tipos</option>
                {Object.keys(TIPO_CONFIG).filter(k => k !== 'other').map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            )}

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={13} style={{ color: '#9ca3af' }} />
              <span style={{ fontSize: 11, color: '#9ca3af' }}>
                {vista === 'arbol' ? `${nodos.length} raíces` : `${lista?.count ?? 0} unidades`}
              </span>
            </div>
          </div>

          {/* Contenido */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {isLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100, fontSize: 12, color: '#9ca3af' }}>
                Cargando organigrama...
              </div>
            ) : vista === 'arbol' ? (
              <ArbolRecursivo
                nodos={nodos} expandidos={expandidos}
                onToggle={toggleExpanded} onSelect={setSelected}
                selected={selected}
              />
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '0.5px solid #f5f6f8' }}>
                    {['Nombre', 'Siglas', 'Tipo', 'Estado'].map(h => (
                      <th key={h} style={{ padding: '7px 12px', fontSize: 10, fontWeight: 600, color: '#9ca3af', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {unidades
                    .filter(u => !busqueda || u.nombre.toLowerCase().includes(busqueda.toLowerCase()))
                    .map((u: any) => {
                      const cfg = TIPO_CONFIG[u.tipo] ?? TIPO_CONFIG.other
                      return (
                        <tr key={u.id} onClick={() => setSelected(u)}
                          style={{ borderBottom: '0.5px solid #f9fafb', cursor: 'pointer', background: selected?.id === u.id ? '#e8f1fd' : 'transparent' }}>
                          <td style={{ padding: '8px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 26, height: 26, borderRadius: 6, background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Building2 size={12} style={{ color: cfg.text }} />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 500, color: '#0a1628' }}>{u.nombre}</span>
                            </div>
                          </td>
                          <td style={{ padding: '8px 12px', fontSize: 11, color: '#374151', fontFamily: 'monospace', fontWeight: 600 }}>{u.siglas || '—'}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}>
                              {u.tipo}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: u.activo ? '#f0fdf4' : '#fef2f2', color: u.activo ? '#15803d' : '#dc2626' }}>
                              {u.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Panel detalle */}
        {selected && (
          <PanelDetalle unidad={selected} onClose={() => setSelected(null)} />
        )}
      </div>
    </div>
  )
}