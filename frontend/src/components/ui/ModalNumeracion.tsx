import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, ArrowUp, ArrowDown, Plus, Save, Hash, Copy, Check } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { THEMES } from '@/constants/themes'
import {
  numeracionService, ELEMENTOS_NUMERACION,
  type ConfigNumeracionTipo, type ConfigNumeracionInput, type ElementoNumeracion,
} from '@/services/numeracion.service'
import { organizacionService } from '@/services/organizacion.service'

interface Props {
  unidadId: number
  unidadSiglas: string
  onClose: () => void
}

const DIGITOS_ANIO = [2, 4]

export default function ModalNumeracion({ unidadId, unidadSiglas, onClose }: Props) {
  const { tema } = useThemeStore()
  const T = THEMES[tema].vars
  const qc = useQueryClient()
  const [editando, setEditando] = useState<ConfigNumeracionTipo | null>(null)
  const [copiando, setCopiando] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['numeracion', unidadId],
    queryFn: () => numeracionService.tabla(unidadId),
  })

  const invalidar = () => qc.invalidateQueries({ queryKey: ['numeracion', unidadId] })

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: T.ctHdrBg, borderRadius: 16, width: '100%', maxWidth: editando ? 620 : 860,
          maxHeight: '92vh', display: 'flex', flexDirection: 'column', border: `1px solid ${T.rowBd}`,
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 24px', borderBottom: `1px solid ${T.rowBd}`, flexShrink: 0 }}>
          <h3 style={{ fontWeight: 700, color: T.rowTxt, fontSize: 14, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Hash size={15} style={{ color: T.accentDk }} />
            {editando
              ? `Numeración · ${editando.tipo_nombre}`
              : `Numeración documental · ${unidadSiglas}`}
          </h3>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', color: T.rowSub }}>
            <X size={18} />
          </button>
        </div>

        {editando ? (
          <EditorTipo
            unidadId={unidadId} fila={editando} T={T}
            onVolver={() => setEditando(null)}
            onGuardado={() => { invalidar(); setEditando(null) }}
          />
        ) : copiando ? (
          <CopiarDeOtra unidadId={unidadId} unidadSiglas={unidadSiglas} T={T}
            onVolver={() => setCopiando(false)}
            onCopiado={() => { invalidar(); setCopiando(false) }} />
        ) : (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 24px' }}>
              {isLoading ? (
                <p style={{ textAlign: 'center', padding: 32, fontSize: 12, color: T.rowSub }}>Cargando…</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ color: T.rowSub, textAlign: 'left' }}>
                      <th style={{ padding: '8px 6px', fontWeight: 600 }}>Tipo</th>
                      <th style={{ padding: '8px 6px', fontWeight: 600 }}>Próximo número</th>
                      <th style={{ padding: '8px 6px', fontWeight: 600, textAlign: 'right' }}>Actual</th>
                      <th style={{ padding: '8px 6px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.tipos ?? []).map(f => (
                      <tr key={f.tipo_id} style={{ borderTop: `0.5px solid ${T.rowBd}` }}>
                        <td style={{ padding: '9px 6px' }}>
                          <span style={{ color: T.rowTxt, fontWeight: 600 }}>{f.tipo_nombre}</span>
                          {!f.configurado && (
                            <span style={{ marginLeft: 6, fontSize: 9, color: T.rowSub, border: `1px solid ${T.rowBd}`, borderRadius: 6, padding: '1px 5px' }}>
                              por defecto
                            </span>
                          )}
                          {!f.activo && (
                            <span style={{ marginLeft: 6, fontSize: 9, color: '#dc2626', background: '#fef2f2', borderRadius: 6, padding: '1px 5px' }}>
                              inactivo
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '9px 6px', fontFamily: 'monospace', color: T.accentDk }}>{f.proximo_numero}</td>
                        <td style={{ padding: '9px 6px', textAlign: 'right', color: T.rowSub }}>{f.secuencia_actual}</td>
                        <td style={{ padding: '9px 6px', textAlign: 'right' }}>
                          <button onClick={() => setEditando(f)}
                            style={{ fontSize: 11, fontWeight: 600, color: T.accentDk, background: 'none', border: 'none', cursor: 'pointer' }}>
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '14px 24px',
              borderTop: `1px solid ${T.rowBd}`, flexShrink: 0 }}>
              <button onClick={() => setCopiando(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 12, fontWeight: 600,
                  color: T.rowTxt, background: T.rowBg, border: `1px solid ${T.rowBd}`, borderRadius: 10, cursor: 'pointer' }}>
                <Copy size={13} /> Copiar de otra unidad
              </button>
              <button onClick={onClose}
                style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#fff', background: T.accentDk, border: 'none', borderRadius: 10, cursor: 'pointer' }}>
                Cerrar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
function EditorTipo({ unidadId, fila, T, onVolver, onGuardado }: {
  unidadId: number; fila: ConfigNumeracionTipo; T: any
  onVolver: () => void; onGuardado: () => void
}) {
  const [form, setForm] = useState<ConfigNumeracionInput>({
    abreviatura: fila.abreviatura,
    separador: fila.separador,
    digitos_anio: fila.digitos_anio,
    digitos_secuencia: fila.digitos_secuencia,
    estructura: [...fila.estructura],
    activo: fila.activo,
  })
  const [error, setError] = useState('')
  const [ajuste, setAjuste] = useState<{ nueva: string; motivo: string } | null>(null)

  const set = <K extends keyof ConfigNumeracionInput>(k: K, v: ConfigNumeracionInput[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const disponibles = useMemo(
    () => ELEMENTOS_NUMERACION.filter(e => !form.estructura.includes(e.id)),
    [form.estructura],
  )

  const { data: preview } = useQuery({
    queryKey: ['numeracion-preview', unidadId, fila.tipo_id, form],
    queryFn: () => numeracionService.preview(unidadId, fila.tipo_id, form),
    placeholderData: prev => prev,
  })

  const mover = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= form.estructura.length) return
    const e = [...form.estructura]
    ;[e[i], e[j]] = [e[j], e[i]]
    set('estructura', e)
  }

  const guardar = useMutation({
    mutationFn: () => numeracionService.guardarConfig(unidadId, fila.tipo_id, form),
    onSuccess: onGuardado,
    onError: (e: any) => setError(e.response?.data?.detail || 'No se pudo guardar.'),
  })

  const ajustar = useMutation({
    mutationFn: () => numeracionService.ajustarSecuencia(
      unidadId, fila.tipo_id, parseInt(ajuste!.nueva, 10), ajuste!.motivo),
    onSuccess: () => { setAjuste(null); onGuardado() },
    onError: (e: any) => setError(e.response?.data?.detail || 'No se pudo ajustar la secuencia.'),
  })

  const label = (id: ElementoNumeracion) => ELEMENTOS_NUMERACION.find(e => e.id === id)?.label ?? id
  const lblStyle = { display: 'block', fontSize: 10, fontWeight: 700, color: T.rowSub, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 4 }
  const inputStyle = { width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 10, outline: 'none', background: T.rowBg, color: T.rowTxt, border: `1px solid ${T.rowBd}` }

  return (
    <>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && <div style={{ fontSize: 12, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '8px 12px' }}>{error}</div>}

        {/* Preview */}
        <div style={{ background: T.rowBg, border: `1px solid ${T.rowBd}`, borderRadius: 12, padding: '10px 14px' }}>
          <span style={lblStyle}>Vista previa · próximo número</span>
          <span style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 700, color: T.accentDk }}>{preview ?? '…'}</span>
          <p style={{ fontSize: 10, color: T.rowSub, margin: '4px 0 0' }}>La vista previa no consume la secuencia.</p>
        </div>

        {/* Estructura */}
        <div>
          <span style={lblStyle}>Estructura del número</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {form.estructura.map((el, i) => (
              <div key={el} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', background: T.rowBg, border: `1px solid ${T.rowBd}`, borderRadius: 8 }}>
                <span style={{ flex: 1, fontSize: 12, color: T.rowTxt }}>{label(el)}</span>
                <button onClick={() => mover(i, -1)} disabled={i === 0} style={{ opacity: i === 0 ? 0.3 : 1, background: 'none', border: 'none', cursor: 'pointer', color: T.rowSub, padding: 2 }}><ArrowUp size={13} /></button>
                <button onClick={() => mover(i, 1)} disabled={i === form.estructura.length - 1} style={{ opacity: i === form.estructura.length - 1 ? 0.3 : 1, background: 'none', border: 'none', cursor: 'pointer', color: T.rowSub, padding: 2 }}><ArrowDown size={13} /></button>
                <button onClick={() => set('estructura', form.estructura.filter(x => x !== el))}
                  disabled={el === 'secuencial'} title={el === 'secuencial' ? 'El secuencial es obligatorio' : 'Quitar'}
                  style={{ opacity: el === 'secuencial' ? 0.3 : 1, background: 'none', border: 'none', cursor: 'pointer', color: T.rowSub, padding: 2 }}><X size={13} /></button>
              </div>
            ))}
          </div>
          {disponibles.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {disponibles.map(e => (
                <button key={e.id} onClick={() => set('estructura', [...form.estructura, e.id])}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: T.accentDk, background: T.rowBg, border: `1px dashed ${T.rowBd}`, borderRadius: 8, padding: '3px 8px', cursor: 'pointer' }}>
                  <Plus size={11} /> {e.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Params */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <span style={lblStyle}>Abreviatura</span>
            <input style={inputStyle} maxLength={8} value={form.abreviatura}
              onChange={e => set('abreviatura', e.target.value)} placeholder="M, Of, C…" />
          </div>
          <div>
            <span style={lblStyle}>Separador</span>
            <input style={inputStyle} maxLength={3} value={form.separador}
              onChange={e => set('separador', e.target.value)} placeholder="-" />
          </div>
          <div>
            <span style={lblStyle}>Dígitos del año</span>
            <select style={inputStyle} value={form.digitos_anio} onChange={e => set('digitos_anio', Number(e.target.value))}>
              {DIGITOS_ANIO.map(d => <option key={d} value={d}>{d} ({d === 2 ? 'AA' : 'AAAA'})</option>)}
            </select>
          </div>
          <div>
            <span style={lblStyle}>Dígitos del secuencial</span>
            <input type="number" min={1} max={8} style={inputStyle} value={form.digitos_secuencia}
              onChange={e => set('digitos_secuencia', Math.max(1, Math.min(8, Number(e.target.value) || 1)))} />
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.rowTxt, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.activo} onChange={e => set('activo', e.target.checked)} style={{ accentColor: T.accentDk }} />
          Tipo habilitado para esta unidad
        </label>

        {/* Ajustar secuencia */}
        <div style={{ borderTop: `1px solid ${T.rowBd}`, paddingTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: T.rowTxt }}>
              Secuencia actual: <b>{fila.secuencia_actual}</b> · próximo: <b>{fila.secuencia_actual + 1}</b>
            </span>
            {!ajuste && (
              <button onClick={() => setAjuste({ nueva: String(fila.secuencia_actual), motivo: '' })}
                style={{ fontSize: 11, fontWeight: 600, color: T.accentDk, background: 'none', border: 'none', cursor: 'pointer' }}>
                Ajustar secuencia
              </button>
            )}
          </div>
          {ajuste && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8, background: T.rowBg, border: `1px solid ${T.rowBd}`, borderRadius: 10, padding: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: T.rowSub }}>Nueva secuencia</span>
                <input type="number" min={0} style={inputStyle} value={ajuste.nueva}
                  onChange={e => setAjuste({ ...ajuste, nueva: e.target.value })} />
              </div>
              <input style={inputStyle} placeholder="Motivo (obligatorio)" value={ajuste.motivo}
                onChange={e => setAjuste({ ...ajuste, motivo: e.target.value })} />
              <p style={{ fontSize: 10, color: T.rowSub, margin: 0 }}>
                El próximo documento usará el número siguiente al valor configurado
                {ajuste.nueva !== '' && ` (→ ${(parseInt(ajuste.nueva, 10) || 0) + 1})`}. No renumera documentos existentes.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setAjuste(null)} style={{ fontSize: 12, color: T.rowSub, background: 'none', border: 'none', cursor: 'pointer' }}>Cancelar</button>
                <button onClick={() => ajustar.mutate()}
                  disabled={ajuste.motivo.trim() === '' || ajuste.nueva === '' || ajustar.isPending}
                  style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: T.accentDk, border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', opacity: (ajuste.motivo.trim() === '' || ajuste.nueva === '') ? 0.5 : 1 }}>
                  Confirmar ajuste
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '14px 24px', borderTop: `1px solid ${T.rowBd}`, flexShrink: 0 }}>
        <button onClick={onVolver} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: T.rowSub, background: T.rowBg, border: `1px solid ${T.rowBd}`, borderRadius: 10, cursor: 'pointer' }}>
          ← Volver
        </button>
        <button onClick={() => guardar.mutate()} disabled={guardar.isPending}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', fontSize: 13, fontWeight: 700, color: '#fff', background: T.accentDk, border: 'none', borderRadius: 10, cursor: 'pointer' }}>
          <Save size={14} /> {guardar.isPending ? 'Guardando…' : 'Guardar configuración'}
        </button>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────
function CopiarDeOtra({ unidadId, unidadSiglas, T, onVolver, onCopiado }: {
  unidadId: number; unidadSiglas: string; T: any; onVolver: () => void; onCopiado: () => void
}) {
  const [origen, setOrigen] = useState<number | ''>('')
  const [error, setError] = useState('')
  const { data: unidades } = useQuery({ queryKey: ['unidades-select'], queryFn: () => organizacionService.select() })

  const copiar = useMutation({
    mutationFn: () => numeracionService.copiarDe(unidadId, origen as number),
    onSuccess: onCopiado,
    onError: (e: any) => setError(e.response?.data?.detail || 'No se pudo copiar.'),
  })

  return (
    <>
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {error && <div style={{ fontSize: 12, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '8px 12px' }}>{error}</div>}
        <p style={{ fontSize: 13, color: T.rowTxt, margin: 0 }}>
          Copiar la configuración de formato (estructura, abreviatura, separador, dígitos) de otra
          unidad a <b>{unidadSiglas}</b>.
        </p>
        <select value={origen} onChange={e => setOrigen(e.target.value ? Number(e.target.value) : '')}
          style={{ width: '100%', padding: '8px 10px', fontSize: 13, borderRadius: 10, background: T.rowBg, color: T.rowTxt, border: `1px solid ${T.rowBd}`, outline: 'none' }}>
          <option value="">— Selecciona la unidad origen —</option>
          {(unidades ?? []).filter(u => u.id !== unidadId).map(u => (
            <option key={u.id} value={u.id}>{u.siglas ? `[${u.siglas}] ` : ''}{u.nombre}</option>
          ))}
        </select>
        <div style={{ fontSize: 11, color: T.rowSub, background: T.rowBg, border: `1px solid ${T.rowBd}`, borderRadius: 10, padding: '8px 12px', display: 'flex', gap: 6 }}>
          <Check size={13} style={{ flexShrink: 0, marginTop: 1, color: '#0f6e56' }} />
          Las secuencias (contadores) de {unidadSiglas} <b>no se modifican</b>: cada unidad mantiene su propia numeración.
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '14px 24px', borderTop: `1px solid ${T.rowBd}`, flexShrink: 0 }}>
        <button onClick={onVolver} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: T.rowSub, background: T.rowBg, border: `1px solid ${T.rowBd}`, borderRadius: 10, cursor: 'pointer' }}>← Volver</button>
        <button onClick={() => copiar.mutate()} disabled={!origen || copiar.isPending}
          style={{ padding: '8px 18px', fontSize: 13, fontWeight: 700, color: '#fff', background: T.accentDk, border: 'none', borderRadius: 10, cursor: 'pointer', opacity: !origen ? 0.5 : 1 }}>
          {copiar.isPending ? 'Copiando…' : 'Copiar formato'}
        </button>
      </div>
    </>
  )
}
