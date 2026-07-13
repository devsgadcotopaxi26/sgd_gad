import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { archivoService, Seccion, Serie } from '@/services/archivo.service'
import { organizacionService } from '@/services/organizacion.service'
import { useThemeStore } from '@/store/themeStore'
import { THEMES } from '@/constants/themes'
import {
  ChevronRight, ChevronDown, FolderTree, FileText,
  Plus, X, Edit3, Search, Lock, Globe, EyeOff
} from 'lucide-react'

// ACCESO_CONFIG: colores semánticos fijos de permisos de acceso
const ACCESO_CONFIG: Record<string, { bg: string; text: string; icon: any; label: string }> = {
  publico:      { bg: '#f0fdf4', text: '#15803d', icon: Globe,  label: 'Público' },
  confidencial: { bg: '#fef9c3', text: '#854f0b', icon: EyeOff, label: 'Confidencial' },
  reservado:    { bg: '#fef2f2', text: '#dc2626', icon: Lock,   label: 'Reservado' },
}

function useTheme() {
  const { tema } = useThemeStore()
  const T = THEMES[tema].vars
  const inputStyle: React.CSSProperties = { background: T.rowBg, color: T.rowTxt, border: `0.5px solid ${T.rowBd}`, outline: 'none', borderRadius: 10, padding: '9px 12px', fontSize: 13, width: '100%', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.rowSub, marginBottom: 6 }
  return { T, inputStyle, labelStyle }
}

function ModalSeccion({ seccion, onClose }: { seccion?: Seccion; onClose: () => void }) {
  const { T, inputStyle, labelStyle } = useTheme()
  const qc = useQueryClient()
  const [form, setForm] = useState<Partial<Seccion>>(seccion ?? { codigo: '', nombre: '' })
  const [error, setError] = useState('')

  const { data: unidades } = useQuery({ queryKey: ['unidades-select'], queryFn: () => organizacionService.select() })
  const { data: fondos }   = useQuery({ queryKey: ['fondos'], queryFn: archivoService.listarFondos })

  const mutation = useMutation({
    mutationFn: (data: Partial<Seccion>) =>
      seccion ? archivoService.actualizarSeccion(seccion.id, data) : archivoService.crearSeccion(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['secciones-arbol'] }); onClose() },
    onError: (e: any) => setError(Object.values(e.response?.data ?? {}).flat().join(' ') || 'Error'),
  })

  const set = (k: keyof Seccion, v: any) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div style={{ background: T.ctHdrBg, borderRadius: 20, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: `0.5px solid ${T.rowBd}` }}>
          <h3 style={{ fontWeight: 700, color: T.rowTxt, fontSize: 14, margin: 0 }}>{seccion ? 'Editar sección' : 'Nueva sección'}</h3>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8, background: T.rowHv, border: 'none', cursor: 'pointer', color: T.rowSub }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#dc2626' }}>{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Código *</label>
              <input style={inputStyle} placeholder="Ej: DAD" value={form.codigo ?? ''} onChange={e => set('codigo', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Fondo</label>
              <select style={inputStyle} value={form.fondo ?? ''} onChange={e => set('fondo', Number(e.target.value))}>
                <option value="">— Selecciona —</option>
                {fondos?.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Nombre *</label>
            <input style={inputStyle} placeholder="Nombre de la sección" value={form.nombre ?? ''} onChange={e => set('nombre', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Unidad administrativa</label>
            <select style={inputStyle} value={form.unidad ?? ''} onChange={e => set('unidad', Number(e.target.value))}>
              <option value="">— Selecciona —</option>
              {unidades?.map(u => <option key={u.id} value={u.id}>{u.siglas ? `[${u.siglas}] ` : ''}{u.nombre}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: '14px 24px', borderTop: `0.5px solid ${T.rowBd}` }}>
          <button onClick={onClose}
            style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, color: T.rowSub, background: T.rowHv, border: `0.5px solid ${T.rowBd}`, borderRadius: 10, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button
            onClick={() => { if (!form.codigo || !form.nombre) { setError('Completa los campos obligatorios'); return }; mutation.mutate(form) }}
            disabled={mutation.isPending}
            style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, color: '#fff', background: T.accentDk, border: 'none', borderRadius: 10, cursor: 'pointer' }}>
            {seccion ? 'Guardar cambios' : 'Crear sección'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalSerie({ serie, seccionId, onClose }: { serie?: Serie; seccionId?: number; onClose: () => void }) {
  const { T, inputStyle, labelStyle } = useTheme()
  const qc = useQueryClient()
  const [form, setForm] = useState<Partial<Serie>>(serie ?? {
    seccion: seccionId, codigo: '', nombre: '',
    origen_documentacion: 'digital', condicion_acceso: 'publico',
    anos_gestion: 2, anos_central: 13, disposicion_final: 'conservacion', tecnica_seleccion: 'na',
  })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: (data: Partial<Serie>) =>
      serie ? archivoService.actualizarSerie(serie.id, data) : archivoService.crearSerie(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['secciones-arbol'] }); qc.invalidateQueries({ queryKey: ['series'] }); onClose() },
    onError: (e: any) => setError(Object.values(e.response?.data ?? {}).flat().join(' ') || 'Error'),
  })

  const set = (k: keyof Serie, v: any) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div style={{ background: T.ctHdrBg, borderRadius: 20, width: '100%', maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: `0.5px solid ${T.rowBd}` }}>
          <h3 style={{ fontWeight: 700, color: T.rowTxt, fontSize: 14, margin: 0 }}>{serie ? 'Editar serie documental' : 'Nueva serie documental'}</h3>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8, background: T.rowHv, border: 'none', cursor: 'pointer', color: T.rowSub }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#dc2626' }}>{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Código *</label>
              <input style={inputStyle} placeholder="Ej: SER-013" value={form.codigo ?? ''} onChange={e => set('codigo', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Condición de acceso</label>
              <select style={inputStyle} value={form.condicion_acceso} onChange={e => set('condicion_acceso', e.target.value)}>
                <option value="publico">Público</option>
                <option value="confidencial">Confidencial</option>
                <option value="reservado">Reservado</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Nombre *</label>
            <input style={inputStyle} placeholder="Nombre de la serie documental" value={form.nombre ?? ''} onChange={e => set('nombre', e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>Descripción</label>
            <textarea style={{ ...inputStyle, resize: 'none' }} rows={2} placeholder="Breve explicación del contenido de la serie"
              value={form.descripcion ?? ''} onChange={e => set('descripcion', e.target.value)} />
          </div>

          <div>
            <label style={labelStyle}>Origen de la documentación</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['digital','Digital'],['fisico','Físico'],['hibrido','Híbrido']].map(([v, l]) => (
                <button key={v} type="button" onClick={() => set('origen_documentacion', v)}
                  style={{ flex: 1, padding: '8px 10px', fontSize: 12, fontWeight: 600, borderRadius: 10, border: `1px solid ${form.origen_documentacion === v ? T.accentDk : T.rowBd}`, background: form.origen_documentacion === v ? T.rowSel : T.rowBg, color: form.origen_documentacion === v ? T.accentDk : T.rowSub, cursor: 'pointer' }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: T.rowHv, border: `0.5px solid ${T.rowBd}`, borderRadius: 10, padding: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: T.rowSub, marginBottom: 12 }}>Tabla de plazos de conservación</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ ...labelStyle, fontSize: 10 }}>Años en Archivo de Gestión</label>
                <input type="number" style={inputStyle} value={form.anos_gestion ?? 2} onChange={e => set('anos_gestion', Number(e.target.value))} />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 10 }}>Años en Archivo Central</label>
                <input type="number" style={inputStyle} value={form.anos_central ?? 13} onChange={e => set('anos_central', Number(e.target.value))} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ ...labelStyle, fontSize: 10 }}>Base legal</label>
              <input style={inputStyle} placeholder="Ley y artículo que determina el plazo" value={form.base_legal ?? ''} onChange={e => set('base_legal', e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ ...labelStyle, fontSize: 10 }}>Disposición final</label>
                <select style={inputStyle} value={form.disposicion_final} onChange={e => set('disposicion_final', e.target.value)}>
                  <option value="conservacion">Conservación permanente</option>
                  <option value="eliminacion">Eliminación</option>
                </select>
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 10 }}>Técnica de selección</label>
                <select style={inputStyle} value={form.tecnica_seleccion} onChange={e => set('tecnica_seleccion', e.target.value)}>
                  <option value="na">No aplica</option>
                  <option value="completa">Conservación completa</option>
                  <option value="parcial">Conservación parcial / muestreo</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: '14px 24px', borderTop: `0.5px solid ${T.rowBd}` }}>
          <button onClick={onClose}
            style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, color: T.rowSub, background: T.rowHv, border: `0.5px solid ${T.rowBd}`, borderRadius: 10, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button
            onClick={() => { if (!form.codigo || !form.nombre) { setError('Completa los campos obligatorios'); return }; mutation.mutate(form) }}
            disabled={mutation.isPending}
            style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, color: '#fff', background: T.accentDk, border: 'none', borderRadius: 10, cursor: 'pointer' }}>
            {serie ? 'Guardar cambios' : 'Crear serie'}
          </button>
        </div>
      </div>
    </div>
  )
}

function NodoSeccion({ nodo, nivel, expandidos, onToggle, onSelect, selected, T }: any) {
  const isExp   = expandidos.has(`s-${nodo.id}`)
  const hasKids = (nodo.hijos ?? []).length > 0
  const isSel   = selected?.tipo === 'seccion' && selected?.id === nodo.id

  return (
    <>
      <div
        onClick={() => onSelect({ tipo: 'seccion', id: nodo.id, data: nodo })}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 14px', paddingLeft: 14 + nivel * 22,
          background: isSel ? T.rowSel : 'transparent',
          borderLeft: `3px solid ${isSel ? T.accentDk : 'transparent'}`,
          borderBottom: `0.5px solid ${T.rowBd}`,
          cursor: 'pointer',
        }}
        onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = T.rowHv }}
        onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent' }}>
        <div onClick={e => { e.stopPropagation(); if (hasKids) onToggle(`s-${nodo.id}`) }}
          style={{ width: 16, display: 'flex', color: hasKids ? T.rowSub : 'transparent', cursor: hasKids ? 'pointer' : 'default' }}>
          {hasKids ? (isExp ? <ChevronDown size={13} /> : <ChevronRight size={13} />) : null}
        </div>
        <FolderTree size={14} style={{ color: T.accentDk, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: isSel ? 600 : 500, color: isSel ? T.accentDk : T.rowTxt, flex: 1 }}>
          {nodo.nombre}
        </span>
        <span style={{ fontSize: 9, fontWeight: 700, color: T.rowSub, fontFamily: 'monospace' }}>{nodo.codigo}</span>
        {nodo.total_series > 0 && (
          <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 10, background: T.rowHv, color: T.rowSub }}>
            {nodo.total_series} series
          </span>
        )}
      </div>
      {isExp && hasKids && nodo.hijos.map((h: any) => (
        <NodoSeccion key={h.id} nodo={h} nivel={nivel + 1} expandidos={expandidos} onToggle={onToggle} onSelect={onSelect} selected={selected} T={T} />
      ))}
    </>
  )
}

export default function CuadroClasificacionPage() {
  const { T } = useTheme()
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  const [selected, setSelected]     = useState<any>(null)
  const [busqueda, setBusqueda]     = useState('')
  const [modalSeccion, setModalSeccion] = useState<{ open: boolean; seccion?: Seccion }>({ open: false })
  const [modalSerie, setModalSerie]     = useState<{ open: boolean; serie?: Serie }>({ open: false })

  const { data: arbol, isLoading } = useQuery({
    queryKey: ['secciones-arbol'],
    queryFn:  archivoService.arbolSecciones,
  })

  const { data: seriesData } = useQuery({
    queryKey: ['series', selected?.id],
    queryFn:  () => archivoService.listarSeries({ seccion: selected?.id }),
    enabled:  selected?.tipo === 'seccion',
  })

  const toggle = (key: string) => setExpandidos(prev => {
    const next = new Set(prev)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })

  const expandirTodo = () => {
    const keys = new Set<string>()
    const rec = (ns: any[]) => ns.forEach(n => { keys.add(`s-${n.id}`); if (n.hijos) rec(n.hijos) })
    if (arbol) rec(arbol)
    setExpandidos(keys)
  }

  const series = seriesData?.results ?? []

  return (
    <div>
      {modalSeccion.open && <ModalSeccion seccion={modalSeccion.seccion} onClose={() => setModalSeccion({ open: false })} />}
      {modalSerie.open && <ModalSerie serie={modalSerie.serie} seccionId={selected?.id} onClose={() => setModalSerie({ open: false })} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: T.rowTxt, margin: 0 }}>Cuadro General de Clasificación Documental</h1>
          <p style={{ fontSize: 12, color: T.rowSub, marginTop: 4 }}>Fondo → Sección → Serie/Subserie, conforme a la Regla Técnica Nacional de Archivos</p>
        </div>
        <button onClick={() => setModalSeccion({ open: true })}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13, fontWeight: 700, color: '#fff', background: T.accentDk, border: 'none', borderRadius: 10, cursor: 'pointer' }}>
          <Plus size={15} /> Nueva sección
        </button>
      </div>

      <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 220px)' }}>

        {/* Árbol secciones */}
        <div style={{ flex: 1, background: T.ctHdrBg, borderRadius: 14, border: `0.5px solid ${T.rowBd}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: `0.5px solid ${T.rowBd}` }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
              <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: T.rowSub }} />
              <input placeholder="Buscar sección..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
                style={{ width: '100%', padding: '6px 10px 6px 26px', fontSize: 11, border: `0.5px solid ${T.rowBd}`, borderRadius: 8, background: T.rowBg, color: T.rowTxt, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <button onClick={expandirTodo}
              style={{ padding: '5px 10px', fontSize: 11, fontWeight: 600, borderRadius: 8, border: `0.5px solid ${T.rowBd}`, background: T.rowBg, cursor: 'pointer', color: T.rowTxt }}>
              Expandir todo
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {isLoading ? (
              <div style={{ padding: 40, textAlign: 'center', fontSize: 12, color: T.rowSub }}>Cargando...</div>
            ) : (arbol ?? []).map((nodo: any) => (
              <NodoSeccion key={nodo.id} nodo={nodo} nivel={0} expandidos={expandidos} onToggle={toggle} onSelect={setSelected} selected={selected} T={T} />
            ))}
          </div>
        </div>

        {/* Panel series */}
        {selected?.tipo === 'seccion' && (
          <div style={{ width: 420, flexShrink: 0, background: T.ctHdrBg, borderRadius: 14, border: `0.5px solid ${T.rowBd}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 16px', borderBottom: `0.5px solid ${T.rowBd}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: T.rowTxt, margin: 0 }}>{selected.data.nombre}</p>
                  <p style={{ fontSize: 10, color: T.rowSub, marginTop: 2 }}>{selected.data.unidad_siglas} · Código: {selected.data.codigo}</p>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => setModalSeccion({ open: true, seccion: selected.data })}
                    style={{ width: 28, height: 28, borderRadius: 7, border: `0.5px solid ${T.rowBd}`, background: T.rowBg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.rowSub }}>
                    <Edit3 size={13} />
                  </button>
                  <button onClick={() => setSelected(null)}
                    style={{ width: 28, height: 28, borderRadius: 7, border: `0.5px solid ${T.rowBd}`, background: T.rowBg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.rowSub }}>
                    <X size={13} />
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: `0.5px solid ${T.rowBd}` }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: T.rowTxt }}>Series documentales ({series.length})</span>
              <button onClick={() => setModalSerie({ open: true })}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, background: T.accentDk, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none' }}>
                <Plus size={12} /> Nueva serie
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
              {series.length === 0 ? (
                <p style={{ fontSize: 11, color: T.rowSub, textAlign: 'center', padding: 20 }}>Sin series documentales en esta sección</p>
              ) : series.map((serie: Serie) => {
                const acceso = ACCESO_CONFIG[serie.condicion_acceso]
                const AccesoIcon = acceso.icon
                return (
                  <div key={serie.id} style={{ padding: '10px 12px', borderRadius: 10, border: `0.5px solid ${T.rowBd}`, marginBottom: 6, background: T.ctHdrBg }}
                    onMouseEnter={e => (e.currentTarget.style.background = T.rowHv)}
                    onMouseLeave={e => (e.currentTarget.style.background = T.ctHdrBg)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <FileText size={12} style={{ color: T.accentDk, flexShrink: 0 }} />
                          <p style={{ fontSize: 12, fontWeight: 600, color: T.rowTxt, margin: 0 }}>{serie.nombre}</p>
                        </div>
                        <p style={{ fontSize: 9, color: T.rowSub, marginTop: 2, fontFamily: 'monospace' }}>{serie.codigo}</p>
                      </div>
                      <button onClick={() => setModalSerie({ open: true, serie })}
                        style={{ width: 24, height: 24, borderRadius: 6, border: `0.5px solid ${T.rowBd}`, background: T.rowBg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.rowSub }}>
                        <Edit3 size={11} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: acceso.bg, color: acceso.text }}>
                        <AccesoIcon size={9} /> {acceso.label}
                      </span>
                      <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: T.rowHv, color: T.rowSub }}>
                        {serie.anos_gestion}a gestión + {serie.anos_central}a central
                      </span>
                      <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: serie.disposicion_final === 'conservacion' ? '#f0fdf4' : '#fef2f2', color: serie.disposicion_final === 'conservacion' ? '#15803d' : '#dc2626' }}>
                        {serie.disposicion_final === 'conservacion' ? 'Conservación' : 'Eliminación'}
                      </span>
                      {serie.total_expedientes > 0 && (
                        <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: T.rowSel, color: T.accentDk }}>
                          {serie.total_expedientes} expedientes
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
