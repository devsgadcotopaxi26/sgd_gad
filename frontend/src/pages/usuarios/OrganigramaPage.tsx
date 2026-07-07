import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { organizacionService, Unidad } from '@/services/organizacion.service'
import {
  ChevronRight, ChevronDown, Building2,
  Search, CheckCircle, XCircle, RefreshCw,
  Plus, Save, X, Edit2,
} from 'lucide-react'

const TIPO_CHOICES = [
  'prefectura', 'viceprefectura', 'consejo', 'secretaria',
  'direccion', 'coordinacion', 'unidad', 'asesoria', 'procuraduria', 'zona',
]

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
  procuraduria:   { bg: '#fce7f3', border: '#f9a8d4',  text: '#831843' },
  zona:           { bg: '#ecfdf5', border: '#6ee7b7',  text: '#065f46' },
  other:          { bg: '#f9fafb', border: '#e5e7eb',  text: '#4b5563' },
}

const INPUT = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#002f6c] focus:ring-2 focus:ring-[#002f6c]/10 bg-white'
const LABEL = 'block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1'

// ─── Formulario de unidad (crear / editar) ────────────────────────────────────
interface FormUnidad {
  nombre: string; nombre_corto: string; siglas: string; codigo: string
  tipo: string; padre: string; nivel: string; email_oficial: string
  telefono: string; piso_ubicacion: string; mision: string; orden_display: string
  activo: boolean
}

const FORM_VACIO: FormUnidad = {
  nombre: '', nombre_corto: '', siglas: '', codigo: '',
  tipo: 'unidad', padre: '', nivel: '', email_oficial: '',
  telefono: '', piso_ubicacion: '', mision: '', orden_display: '99', activo: true,
}

function ModalUnidad({
  modo, inicial, padreId, onClose,
}: {
  modo: 'crear' | 'editar'
  inicial?: Unidad | null
  padreId?: number | null
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState<FormUnidad>(FORM_VACIO)
  const [error, setError] = useState('')

  const { data: niveles } = useQuery({ queryKey: ['niveles'], queryFn: organizacionService.niveles })
  const { data: unidades } = useQuery({ queryKey: ['unidades-select'], queryFn: () => organizacionService.select() })

  useEffect(() => {
    if (modo === 'editar' && inicial) {
      setForm({
        nombre: inicial.nombre ?? '',
        nombre_corto: inicial.nombre_corto ?? '',
        siglas: inicial.siglas ?? '',
        codigo: inicial.codigo ?? '',
        tipo: inicial.tipo ?? 'unidad',
        padre: String(inicial.padre ?? ''),
        nivel: '',
        email_oficial: inicial.email_oficial ?? '',
        telefono: inicial.telefono ?? '',
        piso_ubicacion: (inicial as any).piso_ubicacion ?? '',
        mision: (inicial as any).mision ?? '',
        orden_display: String((inicial as any).orden_display ?? 99),
        activo: inicial.activo ?? true,
      })
    } else if (padreId) {
      setForm(f => ({ ...f, padre: String(padreId) }))
    }
  }, [inicial, modo, padreId])

  const set = (k: keyof FormUnidad, v: any) => setForm(f => ({ ...f, [k]: v }))

  const guardar = useMutation({
    mutationFn: () => {
      const payload: any = {
        nombre: form.nombre.trim(),
        nombre_corto: form.nombre_corto.trim(),
        siglas: form.siglas.trim().toUpperCase(),
        codigo: form.codigo.trim().toUpperCase(),
        tipo: form.tipo,
        email_oficial: form.email_oficial.trim(),
        telefono: form.telefono.trim(),
        piso_ubicacion: form.piso_ubicacion.trim(),
        mision: form.mision.trim(),
        orden_display: parseInt(form.orden_display) || 99,
        activo: form.activo,
      }
      if (form.padre) payload.padre = parseInt(form.padre)
      if (form.nivel) payload.nivel = parseInt(form.nivel)
      return modo === 'crear'
        ? organizacionService.crear(payload)
        : organizacionService.actualizar(inicial!.id, payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organigrama-arbol'] })
      qc.invalidateQueries({ queryKey: ['unidades-select'] })
      onClose()
    },
    onError: (e: any) => {
      const d = e.response?.data
      setError(typeof d === 'object' ? Object.values(d).flat().join(' ') : 'Error al guardar')
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-bold text-gray-900">{modo === 'crear' ? 'Nueva unidad' : 'Editar unidad'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} className="text-gray-500" /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3">
          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>}

          <div><label className={LABEL}>Nombre completo *</label><input className={INPUT} value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej: Dirección de Gestión Ambiental" /></div>
          <div><label className={LABEL}>Nombre corto</label><input className={INPUT} value={form.nombre_corto} onChange={e => set('nombre_corto', e.target.value)} placeholder="Ej: Dir. Ambiental" /></div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className={LABEL}>Siglas</label><input className={INPUT} value={form.siglas} onChange={e => set('siglas', e.target.value.toUpperCase())} placeholder="Ej: DGA" /></div>
            <div><label className={LABEL}>Código *</label><input className={INPUT} value={form.codigo} onChange={e => set('codigo', e.target.value.toUpperCase())} placeholder="Ej: DGA-001" /></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className={LABEL}>Tipo *</label>
              <select className={INPUT} value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                {TIPO_CHOICES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div><label className={LABEL}>Nivel jerárquico</label>
              <select className={INPUT} value={form.nivel} onChange={e => set('nivel', e.target.value)}>
                <option value="">— Seleccionar —</option>
                {(niveles ?? []).map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
              </select>
            </div>
          </div>

          <div><label className={LABEL}>Unidad padre (depende de)</label>
            <select className={INPUT} value={form.padre} onChange={e => set('padre', e.target.value)}>
              <option value="">— Sin unidad padre (raíz) —</option>
              {(unidades ?? []).filter(u => modo === 'editar' ? u.id !== inicial?.id : true).map(u => (
                <option key={u.id} value={u.id}>{u.siglas ? `[${u.siglas}] ` : ''}{u.nombre}</option>
              ))}
            </select>
          </div>

          <div><label className={LABEL}>Email oficial</label><input className={INPUT} type="email" value={form.email_oficial} onChange={e => set('email_oficial', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={LABEL}>Teléfono</label><input className={INPUT} value={form.telefono} onChange={e => set('telefono', e.target.value)} /></div>
            <div><label className={LABEL}>Piso / Ubicación</label><input className={INPUT} value={form.piso_ubicacion} onChange={e => set('piso_ubicacion', e.target.value)} /></div>
          </div>
          <div><label className={LABEL}>Misión / Funciones</label>
            <textarea className={INPUT} rows={3} value={form.mision} onChange={e => set('mision', e.target.value)} style={{ resize: 'vertical' }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={LABEL}>Orden de visualización</label><input className={INPUT} type="number" min={1} value={form.orden_display} onChange={e => set('orden_display', e.target.value)} /></div>
            <div className="flex items-end pb-1">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#374151' }}>
                <input type="checkbox" checked={form.activo} onChange={e => set('activo', e.target.checked)} className="w-4 h-4 rounded" />
                Activa
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancelar</button>
          <button onClick={() => { if (!form.nombre.trim() || !form.codigo.trim()) { setError('Nombre y código son obligatorios.'); return } guardar.mutate() }}
            disabled={guardar.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-xl"
            style={{ background: '#002f6c' }}>
            <Save size={14} /> {guardar.isPending ? 'Guardando…' : (modo === 'crear' ? 'Crear unidad' : 'Guardar cambios')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Nodo árbol ───────────────────────────────────────────────────────────────
function NodoFila({ nodo, nivel, expandidos, onToggle, onSelect, selected }: {
  nodo: any; nivel: number
  expandidos: Set<number>
  onToggle: (id: number) => void
  onSelect: (n: any) => void
  selected: any
}) {
  const cfg     = TIPO_COLORS[nodo.tipo] ?? TIPO_COLORS.other
  const isExp   = expandidos.has(nodo.id)
  const hasKids = (nodo.hijos ?? []).length > 0
  const isSel   = selected?.id === nodo.id

  return (
    <>
      <div onClick={() => onSelect(nodo)} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 14px', paddingLeft: 14 + nivel * 24,
        background: isSel ? '#e8f1fd' : 'transparent',
        borderLeft: `3px solid ${isSel ? '#002f6c' : 'transparent'}`,
        borderBottom: '0.5px solid #f5f6f8',
        cursor: 'pointer', transition: 'background .1s',
      }}
        onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#f8faff' }}
        onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent' }}
      >
        <div onClick={e => { e.stopPropagation(); if (hasKids) onToggle(nodo.id) }}
          style={{ width: 18, height: 18, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: hasKids ? '#9ca3af' : 'transparent', cursor: hasKids ? 'pointer' : 'default' }}>
          {hasKids ? (isExp ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : null}
        </div>
        <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: cfg.bg, border: `1.5px solid ${isSel ? '#002f6c' : cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Building2 size={14} style={{ color: cfg.text === '#fff' ? '#fff' : cfg.text }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: isSel ? 600 : 500, color: isSel ? '#002f6c' : '#0a1628', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{nodo.nombre}</p>
          <p style={{ fontSize: 10, color: '#9ca3af', margin: '1px 0 0' }}>{nodo.tipo?.charAt(0).toUpperCase() + nodo.tipo?.slice(1)}{nodo.siglas ? ` · ${nodo.siglas}` : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {hasKids && <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 10, background: '#f3f4f6', color: '#6b7280' }}>{(nodo.hijos ?? []).length} sub</span>}
          {!nodo.activo && <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 10, background: '#fef2f2', color: '#dc2626' }}>Inactivo</span>}
        </div>
      </div>
      {isExp && hasKids && (nodo.hijos ?? []).map((h: any) => (
        <NodoFila key={h.id} nodo={h} nivel={nivel + 1} expandidos={expandidos} onToggle={onToggle} onSelect={onSelect} selected={selected} />
      ))}
    </>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function OrganigramaPage() {
  const qc = useQueryClient()
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set([1]))
  const [selected, setSelected] = useState<any>(null)
  const [busqueda, setBusqueda] = useState('')
  const [modalConfig, setModalConfig] = useState<{ modo: 'crear' | 'editar'; inicial?: Unidad; padreId?: number } | null>(null)

  const { data: arbol, isLoading, refetch } = useQuery({ queryKey: ['organigrama-arbol'], queryFn: organizacionService.arbol })

  const activar = useMutation({
    mutationFn: (id: number) => organizacionService.activar(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['organigrama-arbol'] }); refetch() },
  })
  const desactivar = useMutation({
    mutationFn: (id: number) => organizacionService.desactivar(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['organigrama-arbol'] }); refetch() },
  })

  const nodos = arbol ?? []
  const toggle = (id: number) => setExpandidos(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const expandirTodo = () => { const ids = new Set<number>(); const rec = (ns: any[]) => ns.forEach(n => { ids.add(n.id); if (n.hijos) rec(n.hijos) }); rec(nodos); setExpandidos(ids) }
  const contraerTodo = () => setExpandidos(new Set([nodos[0]?.id]))

  const flatNodes: any[] = []
  const flatten = (ns: any[]) => ns.forEach(n => { flatNodes.push(n); if (n.hijos) flatten(n.hijos) })
  flatten(nodos)

  const filtrados = busqueda
    ? flatNodes.filter(n => n.nombre.toLowerCase().includes(busqueda.toLowerCase()) || (n.siglas ?? '').toLowerCase().includes(busqueda.toLowerCase()))
    : []

  const conteos: Record<string, number> = {}
  flatNodes.forEach(n => { conteos[n.tipo] = (conteos[n.tipo] ?? 0) + 1 })
  const cfg = selected ? (TIPO_COLORS[selected.tipo] ?? TIPO_COLORS.other) : null

  const onSelectNodo = (n: any) => { setSelected(n) }

  return (
    <div>
      {modalConfig && (
        <ModalUnidad
          modo={modalConfig.modo}
          inicial={modalConfig.inicial}
          padreId={modalConfig.padreId}
          onClose={() => { setModalConfig(null); refetch() }}
        />
      )}

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Organigrama institucional</h1>
          <p className="text-sm text-gray-400 mt-0.5">GAD Provincia de Cotopaxi — Estructura Orgánica</p>
        </div>
        <button onClick={() => setModalConfig({ modo: 'crear' })}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: '#002f6c', color: '#fff' }}>
          <Plus size={14} /> Nueva unidad
        </button>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-2 mb-5">
        {Object.entries(TIPO_COLORS).filter(([k]) => k !== 'other' && conteos[k]).map(([tipo, c]) => (
          <span key={tipo} style={{ fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: c.bg, color: c.text === '#fff' ? c.text : c.text, border: `1px solid ${c.border}` }}>
            {tipo.charAt(0).toUpperCase() + tipo.slice(1)} ({conteos[tipo]})
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 260px)' }}>
        {/* Panel árbol */}
        <div style={{ flex: 1, background: '#fff', borderRadius: 14, border: '0.5px solid #e5e7eb', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '0.5px solid #f5f6f8', flexShrink: 0 }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
              <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#c4c9d4' }} />
              <input placeholder="Buscar unidad…" value={busqueda} onChange={e => setBusqueda(e.target.value)}
                style={{ width: '100%', padding: '6px 10px 6px 26px', fontSize: 12, border: '0.5px solid #e5e7eb', borderRadius: 8, outline: 'none', background: '#f9fafb', color: '#374151', boxSizing: 'border-box' }} />
            </div>
            <button onClick={expandirTodo} style={{ padding: '5px 12px', fontSize: 11, fontWeight: 600, borderRadius: 8, border: '0.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151' }}>Expandir</button>
            <button onClick={contraerTodo} style={{ padding: '5px 12px', fontSize: 11, fontWeight: 600, borderRadius: 8, border: '0.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151' }}>Contraer</button>
            <button onClick={() => refetch()} style={{ width: 30, height: 30, borderRadius: 8, border: '0.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
              <RefreshCw size={13} />
            </button>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>{flatNodes.length} unidades</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {isLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100, fontSize: 12, color: '#9ca3af' }}>Cargando...</div>
            ) : busqueda ? (
              filtrados.length === 0
                ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100, fontSize: 12, color: '#9ca3af' }}>Sin resultados</div>
                : filtrados.map(n => <NodoFila key={n.id} nodo={n} nivel={0} expandidos={expandidos} onToggle={toggle} onSelect={onSelectNodo} selected={selected} />)
            ) : (
              nodos.map((n: any) => <NodoFila key={n.id} nodo={n} nivel={0} expandidos={expandidos} onToggle={toggle} onSelect={onSelectNodo} selected={selected} />)
            )}
          </div>
        </div>

        {/* Panel detalle */}
        {selected && cfg && (
          <div style={{ width: 320, minWidth: 320, background: '#fff', borderRadius: 14, border: '0.5px solid #e5e7eb', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: 14, borderBottom: '0.5px solid #f5f6f8', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, flexShrink: 0, background: cfg.bg, border: `1.5px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={18} style={{ color: cfg.text === '#fff' ? '#fff' : cfg.text }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10, textTransform: 'capitalize', background: cfg.bg, color: cfg.text === '#fff' ? cfg.text : cfg.text, border: `1px solid ${cfg.border}` }}>
                    {selected.tipo}
                  </span>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0a1628', marginTop: 4, marginBottom: 0, lineHeight: 1.3 }}>{selected.nombre}</p>
                </div>
                <button onClick={() => setSelected(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18, lineHeight: 1, flexShrink: 0 }}>×</button>
              </div>

              {/* Acciones */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button onClick={() => setModalConfig({ modo: 'editar', inicial: selected })}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 11px', borderRadius: 8, border: '0.5px solid #93c5fd', background: '#eff6ff', color: '#1e40af', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                  <Edit2 size={12} /> Editar
                </button>
                <button onClick={() => setModalConfig({ modo: 'crear', padreId: selected.id })}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 11px', borderRadius: 8, border: '0.5px solid #86efac', background: '#f0fdf4', color: '#15803d', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                  <Plus size={12} /> Subunidad
                </button>
                {selected.activo !== false ? (
                  <button onClick={() => desactivar.mutate(selected.id)} disabled={desactivar.isPending}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 11px', borderRadius: 8, border: '0.5px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                    <XCircle size={12} /> Desactivar
                  </button>
                ) : (
                  <button onClick={() => activar.mutate(selected.id)} disabled={activar.isPending}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 11px', borderRadius: 8, border: '0.5px solid #86efac', background: '#f0fdf4', color: '#15803d', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                    <CheckCircle size={12} /> Activar
                  </button>
                )}
              </div>
            </div>

            {/* Datos */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                {[
                  { label: 'Siglas',      value: selected.siglas      || '—' },
                  { label: 'Código',      value: selected.codigo      || '—' },
                  { label: 'Subunidades', value: (selected.hijos ?? []).length },
                  { label: 'Estado',      value: selected.activo !== false ? 'Activo' : 'Inactivo' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: '8px 10px', background: '#f8faff', borderRadius: 8 }}>
                    <p style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', margin: 0 }}>{label}</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '3px 0 0' }}>{String(value)}</p>
                  </div>
                ))}
              </div>

              {selected.email_oficial && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>Email oficial</p>
                  <p style={{ fontSize: 12, color: '#002f6c' }}>{selected.email_oficial}</p>
                </div>
              )}

              {selected.mision && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>Misión</p>
                  <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>{selected.mision}</p>
                </div>
              )}

              {/* Subunidades */}
              {(selected.hijos ?? []).length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <p style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Subunidades ({(selected.hijos ?? []).length})</p>
                  {(selected.hijos ?? []).map((h: any) => {
                    const hcfg = TIPO_COLORS[h.tipo] ?? TIPO_COLORS.other
                    return (
                      <div key={h.id} onClick={() => onSelectNodo(h)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 4, border: '0.5px solid #f5f6f8' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f8faff')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
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
          </div>
        )}
      </div>
    </div>
  )
}
