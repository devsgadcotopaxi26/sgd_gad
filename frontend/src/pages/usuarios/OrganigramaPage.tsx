import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { organizacionService } from '@/services/organizacion.service'
import {
  ChevronRight, ChevronDown, Building2,
  Search, CheckCircle, XCircle, RefreshCw
} from 'lucide-react'

const TIPO_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  prefectura:     { bg: '#002f6c', border: '#002f6c',  text: '#fff'    },
  viceprefectura: { bg: '#003d8f', border: '#003d8f',  text: '#fff'    },
  consejo:        { bg: '#1f2937', border: '#1f2937',  text: '#fff'    },
  secretaria:     { bg: '#dbeafe', border: '#93c5fd',  text: '#1e3a8a' },
  direccion:      { bg: '#f3f4f6', border: '#d1d5db',  text: '#111827' },
  departamento:   { bg: '#ffffff', border: '#e5e7eb',  text: '#374151' },
  coordinacion:   { bg: '#ede9fe', border: '#a78bfa',  text: '#4c1d95' },
  unidad:         { bg: '#f9fafb', border: '#e5e7eb',  text: '#4b5563' },
  asesoria:       { bg: '#fef3c7', border: '#fcd34d',  text: '#78350f' },
  zona:           { bg: '#ecfdf5', border: '#6ee7b7',  text: '#065f46' },
  other:          { bg: '#f9fafb', border: '#e5e7eb',  text: '#4b5563' },
}

function NodoFila({
  nodo, nivel, expandidos, onToggle, onSelect, selected
}: {
  nodo: any; nivel: number
  expandidos: Set<number>
  onToggle: (id: number) => void
  onSelect: (n: any) => void
  selected: any
}) {
  const cfg      = TIPO_COLORS[nodo.tipo] ?? TIPO_COLORS.other
  const isExp    = expandidos.has(nodo.id)
  const hasKids  = (nodo.hijos ?? []).length > 0
  const isSel    = selected?.id === nodo.id
  const indent   = nivel * 24

  return (
    <>
      <div
        onClick={() => onSelect(nodo)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 14px',
          paddingLeft: 14 + indent,
          background: isSel ? '#e8f1fd' : 'transparent',
          borderLeft: `3px solid ${isSel ? '#002f6c' : 'transparent'}`,
          borderBottom: '0.5px solid #f5f6f8',
          cursor: 'pointer',
          transition: 'background .1s',
        }}
        onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#f8faff' }}
        onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent' }}
      >
        {/* Toggle */}
        <div
          onClick={e => { e.stopPropagation(); if (hasKids) onToggle(nodo.id) }}
          style={{
            width: 18, height: 18, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: hasKids ? '#9ca3af' : 'transparent',
            cursor: hasKids ? 'pointer' : 'default',
          }}
        >
          {hasKids
            ? isExp ? <ChevronDown size={14} /> : <ChevronRight size={14} />
            : null}
        </div>

        {/* Badge tipo */}
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: cfg.bg, border: `1.5px solid ${isSel ? '#002f6c' : cfg.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Building2 size={14} style={{ color: isSel ? '#002f6c' : cfg.text === '#fff' ? '#fff' : cfg.text }} />
        </div>

        {/* Nombre */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 13, fontWeight: isSel ? 600 : 500,
            color: isSel ? '#002f6c' : '#0a1628',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            margin: 0,
          }}>
            {nodo.nombre}
          </p>
          <p style={{ fontSize: 10, color: '#9ca3af', margin: '1px 0 0' }}>
            {nodo.tipo?.charAt(0).toUpperCase() + nodo.tipo?.slice(1)}
            {nodo.siglas ? ` · ${nodo.siglas}` : ''}
          </p>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {hasKids && (
            <span style={{
              fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 10,
              background: '#f3f4f6', color: '#6b7280',
            }}>
              {(nodo.hijos ?? []).length} sub
            </span>
          )}
          {!nodo.activo && (
            <span style={{
              fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 10,
              background: '#fef2f2', color: '#dc2626',
            }}>
              Inactivo
            </span>
          )}
        </div>
      </div>

      {/* Hijos */}
      {isExp && hasKids && (nodo.hijos ?? []).map((hijo: any) => (
        <NodoFila
          key={hijo.id}
          nodo={hijo} nivel={nivel + 1}
          expandidos={expandidos}
          onToggle={onToggle}
          onSelect={onSelect}
          selected={selected}
        />
      ))}
    </>
  )
}

export default function OrganigramaPage() {
  const qc = useQueryClient()
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set([1]))
  const [selected, setSelected]     = useState<any>(null)
  const [busqueda, setBusqueda]     = useState('')

  const { data: arbol, isLoading, refetch } = useQuery({
    queryKey: ['organigrama-arbol'],
    queryFn:  organizacionService.arbol,
  })

  const activar = useMutation({
    mutationFn: (id: number) => organizacionService.activar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organigrama-arbol'] })
      refetch()
    },
  })

  const desactivar = useMutation({
    mutationFn: (id: number) => organizacionService.desactivar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organigrama-arbol'] })
      refetch()
    },
  })

  const nodos = arbol ?? []

  const toggle = (id: number) => setExpandidos(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const expandirTodo = () => {
    const ids = new Set<number>()
    const rec = (ns: any[]) => ns.forEach(n => { ids.add(n.id); if (n.hijos) rec(n.hijos) })
    rec(nodos)
    setExpandidos(ids)
  }

  const contraerTodo = () => setExpandidos(new Set([nodos[0]?.id]))

  // Búsqueda flat
  const flatNodes: any[] = []
  const flatten = (ns: any[]) => ns.forEach(n => { flatNodes.push(n); if (n.hijos) flatten(n.hijos) })
  flatten(nodos)
  const filtrados = busqueda
    ? flatNodes.filter(n =>
        n.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (n.siglas ?? '').toLowerCase().includes(busqueda.toLowerCase()))
    : []

  // Contar por tipo
  const conteos: Record<string, number> = {}
  flatNodes.forEach(n => { conteos[n.tipo] = (conteos[n.tipo] ?? 0) + 1 })

  const cfg = selected ? (TIPO_COLORS[selected.tipo] ?? TIPO_COLORS.other) : null

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Organigrama institucional</h1>
          <p className="text-sm text-gray-400 mt-0.5">GAD Provincia de Cotopaxi — Estructura Orgánica por Procesos</p>
        </div>
      </div>

      {/* Stats por tipo */}
      <div className="flex flex-wrap gap-2 mb-5">
        {Object.entries(TIPO_COLORS).filter(([k]) => k !== 'other' && conteos[k]).map(([tipo, c]) => (
          <span key={tipo} style={{
            fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
            background: c.bg, color: c.text === '#fff' ? c.text : c.text,
            border: `1px solid ${c.border}`,
          }}>
            {tipo.charAt(0).toUpperCase() + tipo.slice(1)} ({conteos[tipo]})
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 240px)' }}>

        {/* Panel árbol */}
        <div style={{
          flex: 1, background: '#fff', borderRadius: 14,
          border: '0.5px solid #e5e7eb', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Toolbar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', borderBottom: '0.5px solid #f5f6f8',
            flexShrink: 0,
          }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
              <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#c4c9d4' }} />
              <input
                placeholder="Buscar unidad por nombre o siglas..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                style={{ width: '100%', padding: '6px 10px 6px 26px', fontSize: 12, border: '0.5px solid #e5e7eb', borderRadius: 8, outline: 'none', background: '#f9fafb', color: '#374151' }}
              />
            </div>
            <button onClick={expandirTodo}
              style={{ padding: '5px 12px', fontSize: 11, fontWeight: 600, borderRadius: 8, border: '0.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151' }}>
              Expandir todo
            </button>
            <button onClick={contraerTodo}
              style={{ padding: '5px 12px', fontSize: 11, fontWeight: 600, borderRadius: 8, border: '0.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151' }}>
              Contraer
            </button>
            <button onClick={() => refetch()}
              style={{ width: 30, height: 30, borderRadius: 8, border: '0.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
              <RefreshCw size={13} />
            </button>
            <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 4 }}>
              {flatNodes.length} unidades
            </span>
          </div>

          {/* Lista */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {isLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100, fontSize: 12, color: '#9ca3af' }}>
                Cargando organigrama...
              </div>
            ) : busqueda ? (
              // Vista búsqueda
              filtrados.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100, fontSize: 12, color: '#9ca3af' }}>
                  Sin resultados para "{busqueda}"
                </div>
              ) : filtrados.map(n => (
                <NodoFila
                  key={n.id} nodo={n} nivel={0}
                  expandidos={expandidos} onToggle={toggle}
                  onSelect={setSelected} selected={selected}
                />
              ))
            ) : (
              // Vista árbol
              nodos.map((n: any) => (
                <NodoFila
                  key={n.id} nodo={n} nivel={0}
                  expandidos={expandidos} onToggle={toggle}
                  onSelect={setSelected} selected={selected}
                />
              ))
            )}
          </div>
        </div>

        {/* Panel detalle */}
        <div style={{
          width: selected ? 300 : 0,
          minWidth: selected ? 300 : 0,
          background: '#fff', borderRadius: 14,
          border: selected ? '0.5px solid #e5e7eb' : 'none',
          overflow: 'hidden', transition: 'all .2s ease',
          display: 'flex', flexDirection: 'column',
        }}>
          {selected && cfg && (
            <>
              {/* Header detalle */}
              <div style={{ padding: '16px', borderBottom: '0.5px solid #f5f6f8' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                    background: cfg.bg, border: `1.5px solid ${cfg.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Building2 size={18} style={{ color: cfg.text === '#fff' ? '#fff' : cfg.text }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                      textTransform: 'capitalize', background: cfg.bg,
                      color: cfg.text === '#fff' ? cfg.text : cfg.text,
                      border: `1px solid ${cfg.border}`,
                    }}>
                      {selected.tipo}
                    </span>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#0a1628', marginTop: 4, marginBottom: 0, lineHeight: 1.3 }}>
                      {selected.nombre}
                    </p>
                  </div>
                  <button onClick={() => setSelected(null)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18, lineHeight: 1, flexShrink: 0 }}>
                    ×
                  </button>
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {selected.activo !== false ? (
                    <button
                      onClick={() => desactivar.mutate(selected.id)}
                      disabled={desactivar.isPending}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: '0.5px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      <XCircle size={13} /> Desactivar
                    </button>
                  ) : (
                    <button
                      onClick={() => activar.mutate(selected.id)}
                      disabled={activar.isPending}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: '0.5px solid #86efac', background: '#f0fdf4', color: '#15803d', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      <CheckCircle size={13} /> Activar
                    </button>
                  )}
                </div>
              </div>

              {/* Datos */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                  {[
                    { label: 'Siglas',       value: selected.siglas     || '—' },
                    { label: 'Código',       value: selected.codigo     || '—' },
                    { label: 'Subunidades',  value: (selected.hijos ?? []).length },
                    { label: 'Estado',       value: selected.activo !== false ? 'Activo' : 'Inactivo' },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ padding: '8px 10px', background: '#f8faff', borderRadius: 8 }}>
                      <p style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', margin: 0 }}>{label}</p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '3px 0 0' }}>{String(value)}</p>
                    </div>
                  ))}
                </div>

                {selected.responsable_nombre && (
                  <div style={{ marginBottom: 12 }}>
                    <p style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Responsable</p>
                    <p style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{selected.responsable_nombre}</p>
                  </div>
                )}

                {selected.email && (
                  <div style={{ marginBottom: 12 }}>
                    <p style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Email</p>
                    <p style={{ fontSize: 13, color: '#002f6c', fontWeight: 500 }}>{selected.email}</p>
                  </div>
                )}

                {selected.funciones && (
                  <div>
                    <p style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Funciones</p>
                    <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>{selected.funciones}</p>
                  </div>
                )}

                {/* Subunidades */}
                {(selected.hijos ?? []).length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <p style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
                      Subunidades ({(selected.hijos ?? []).length})
                    </p>
                    {(selected.hijos ?? []).map((h: any) => {
                      const hcfg = TIPO_COLORS[h.tipo] ?? TIPO_COLORS.other
                      return (
                        <div
                          key={h.id}
                          onClick={() => setSelected(h)}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 4, border: '0.5px solid #f5f6f8' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#f8faff')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div style={{ width: 24, height: 24, borderRadius: 6, background: hcfg.bg, border: `1px solid ${hcfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Building2 size={12} style={{ color: hcfg.text === '#fff' ? '#fff' : hcfg.text }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 12, fontWeight: 500, color: '#0a1628', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{h.nombre}</p>
                            <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>{h.siglas}</p>
                          </div>
                          <ChevronRight size={13} style={{ color: '#d1d5db', flexShrink: 0 }} />
                        </div>
                      )
                    })}
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