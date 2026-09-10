import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, Play, CheckCircle, XCircle } from 'lucide-react'
import { tareaService, Tarea } from '@/services/tarea.service'
import type { ThemeVars } from '@/constants/themes'

const ESTADO: Record<string, { label: string; bg: string; color: string }> = {
  pendiente:  { label: 'Pendiente',  bg: '#fef9c3', color: '#854d0e' },
  en_proceso: { label: 'En proceso', bg: '#dbeafe', color: '#1d4ed8' },
  completada: { label: 'Completada', bg: '#dcfce7', color: '#15803d' },
  cancelada:  { label: 'Cancelada',  bg: '#f3f4f6', color: '#6b7280' },
}
const PRIORIDAD: Record<string, string> = { normal: 'Normal', urgente: 'Urgente', muy_urgente: 'Muy urgente' }

interface Props {
  documentoId: number
  /** 'recibidas' = soy el asignado · 'enviadas' = yo la creé */
  rol: 'recibidas' | 'enviadas'
  usuarioActualId: number
  T: ThemeVars
}

/**
 * Panel de tareas de un documento dentro del detalle. Las acciones operan
 * SOBRE LA TAREA (tarea.id), nunca sobre el documento. Puede haber varias
 * tareas por documento.
 */
export default function TareaPanel({ documentoId, rol, usuarioActualId, T }: Props) {
  const qc = useQueryClient()
  const [respModal, setRespModal] = useState<{ tarea: Tarea; texto: string } | null>(null)
  const [cancelModal, setCancelModal] = useState<{ tarea: Tarea; motivo: string } | null>(null)
  const [err, setErr] = useState('')

  const { data: tareas, isLoading } = useQuery({
    queryKey: ['tareas', documentoId, rol],
    queryFn: () => tareaService.listar({ documento: documentoId, rol }),
  })

  const refetchTodo = () => {
    qc.invalidateQueries({ queryKey: ['tareas', documentoId] })
    qc.invalidateQueries({ queryKey: ['bandeja'] })
    qc.invalidateQueries({ queryKey: ['bandeja-conteos'] })
    qc.invalidateQueries({ queryKey: ['doc-detalle', documentoId] })
  }
  const onErr = (e: any) => setErr(e.response?.data?.detail || 'No se pudo actualizar la tarea.')

  const iniciar  = useMutation({ mutationFn: (id: number) => tareaService.iniciar(id), onSuccess: refetchTodo, onError: onErr })
  const completar = useMutation({
    mutationFn: (v: { id: number; respuesta: string }) => tareaService.completar(v.id, v.respuesta),
    onSuccess: () => { setRespModal(null); refetchTodo() }, onError: onErr,
  })
  const cancelar = useMutation({
    mutationFn: (v: { id: number; motivo: string }) => tareaService.cancelar(v.id, v.motivo),
    onSuccess: () => { setCancelModal(null); refetchTodo() }, onError: onErr,
  })

  if (isLoading) return null
  if (!tareas || tareas.length === 0) return null

  const btn = (label: string, Icon: any, tone: string, onClick: () => void, disabled = false) => (
    <button onClick={onClick} disabled={disabled}
      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, fontSize: 10.5, fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
        border: `1px solid ${tone}`, background: 'transparent', color: tone }}>
      <Icon size={11} /> {label}
    </button>
  )

  return (
    <div style={{ borderTop: `0.5px solid ${T.pnMetaBd}`, padding: '10px 14px', background: T.pnMeta }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <ClipboardList size={12} style={{ color: T.pnBd }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: T.rowTxt, textTransform: 'uppercase', letterSpacing: '.04em' }}>
          Tareas {rol === 'recibidas' ? 'recibidas' : 'enviadas'} ({tareas.length})
        </span>
      </div>

      {err && <p style={{ fontSize: 10.5, color: '#b91c1c', marginBottom: 6 }}>{err}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {tareas.map(t => {
          const e = ESTADO[t.estado] ?? ESTADO.pendiente
          const soyAsignado = t.asignada_a === usuarioActualId
          const soyCreador  = t.asignada_por === usuarioActualId
          const activa = t.estado === 'pendiente' || t.estado === 'en_proceso'
          return (
            <div key={t.id} style={{ border: `0.5px solid ${T.rowBd}`, borderRadius: 9, padding: '8px 10px', background: T.rowBg }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{ fontSize: 9.5, fontWeight: 700, padding: '1px 7px', borderRadius: 9, background: e.bg, color: e.color }}>{e.label}</span>
                {t.prioridad !== 'normal' && (
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: '#da291c' }}>{PRIORIDAD[t.prioridad]}</span>
                )}
                {t.fecha_limite && <span style={{ fontSize: 9.5, color: T.rowSub }}>Límite: {new Date(t.fecha_limite).toLocaleDateString('es-EC')}</span>}
              </div>
              <p style={{ fontSize: 11.5, color: T.rowTxt, margin: '2px 0' }}>{t.descripcion}</p>
              <p style={{ fontSize: 9.5, color: T.rowSub, margin: 0 }}>
                {rol === 'recibidas' ? `De: ${t.asignada_por_nombre}` : `Para: ${t.asignada_a_nombre}`}
                {' · '}{new Date(t.creado_en).toLocaleDateString('es-EC')}
              </p>
              {t.respuesta && (
                <p style={{ fontSize: 10.5, color: T.rowTxt, margin: '4px 0 0', padding: '5px 8px', background: T.pnMeta, borderRadius: 6 }}>
                  <strong>Respuesta:</strong> {t.respuesta}
                </p>
              )}

              {activa && (soyAsignado || soyCreador) && (
                <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
                  {soyAsignado && t.estado === 'pendiente' && btn('Iniciar', Play, '#1d4ed8', () => { setErr(''); iniciar.mutate(t.id) }, iniciar.isPending)}
                  {soyAsignado && btn('Completar', CheckCircle, '#15803d', () => { setErr(''); setRespModal({ tarea: t, texto: '' }) })}
                  {soyCreador && btn('Cancelar', XCircle, '#c2410c', () => { setErr(''); setCancelModal({ tarea: t, motivo: '' }) })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Completar → exige respuesta */}
      {respModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => !completar.isPending && setRespModal(null)}>
          <div onClick={ev => ev.stopPropagation()} style={{ background: T.ctHdrBg, border: `1px solid ${T.rowBd}`, borderRadius: 14, width: '100%', maxWidth: 400 }}>
            <div style={{ padding: '14px 18px', borderBottom: `0.5px solid ${T.rowBd}`, fontSize: 13, fontWeight: 700, color: T.rowTxt }}>Completar tarea</div>
            <div style={{ padding: '14px 18px' }}>
              <p style={{ fontSize: 11.5, color: T.rowSub, margin: '0 0 8px' }}>{respModal.tarea.descripcion}</p>
              <label style={{ fontSize: 11, fontWeight: 600, color: T.rowSub, display: 'block', marginBottom: 4 }}>Respuesta (obligatoria):</label>
              <textarea value={respModal.texto} onChange={ev => setRespModal({ ...respModal, texto: ev.target.value })} rows={3}
                placeholder="Ej. Informe elaborado y adjuntado al expediente."
                style={{ width: '100%', padding: '8px 10px', border: `0.5px solid ${T.rowBd}`, borderRadius: 8, fontSize: 12, fontFamily: 'inherit', resize: 'none', outline: 'none', color: T.rowTxt, background: T.rowBg }} />
              {err && <p style={{ fontSize: 10.5, color: '#b91c1c', marginTop: 6 }}>{err}</p>}
            </div>
            <div style={{ padding: '12px 18px', borderTop: `0.5px solid ${T.rowBd}`, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setRespModal(null)} disabled={completar.isPending}
                style={{ padding: '7px 14px', border: `0.5px solid ${T.rowBd}`, borderRadius: 9, fontSize: 11, fontWeight: 500, cursor: 'pointer', background: T.rowBg, color: T.rowSub }}>Cancelar</button>
              <button onClick={() => respModal.texto.trim() && completar.mutate({ id: respModal.tarea.id, respuesta: respModal.texto.trim() })}
                disabled={!respModal.texto.trim() || completar.isPending}
                style={{ padding: '7px 14px', border: 'none', borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: respModal.texto.trim() ? 'pointer' : 'not-allowed', background: respModal.texto.trim() ? '#15803d' : T.rowBd, color: '#fff' }}>
                {completar.isPending ? 'Guardando…' : 'Completar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancelar → motivo opcional */}
      {cancelModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => !cancelar.isPending && setCancelModal(null)}>
          <div onClick={ev => ev.stopPropagation()} style={{ background: T.ctHdrBg, border: `1px solid ${T.rowBd}`, borderRadius: 14, width: '100%', maxWidth: 400 }}>
            <div style={{ padding: '14px 18px', borderBottom: `0.5px solid ${T.rowBd}`, fontSize: 13, fontWeight: 700, color: T.rowTxt }}>Cancelar tarea</div>
            <div style={{ padding: '14px 18px' }}>
              <p style={{ fontSize: 11.5, color: T.rowSub, margin: '0 0 8px' }}>{cancelModal.tarea.descripcion}</p>
              <label style={{ fontSize: 11, fontWeight: 600, color: T.rowSub, display: 'block', marginBottom: 4 }}>Motivo (opcional):</label>
              <textarea value={cancelModal.motivo} onChange={ev => setCancelModal({ ...cancelModal, motivo: ev.target.value })} rows={2}
                style={{ width: '100%', padding: '8px 10px', border: `0.5px solid ${T.rowBd}`, borderRadius: 8, fontSize: 12, fontFamily: 'inherit', resize: 'none', outline: 'none', color: T.rowTxt, background: T.rowBg }} />
              {err && <p style={{ fontSize: 10.5, color: '#b91c1c', marginTop: 6 }}>{err}</p>}
            </div>
            <div style={{ padding: '12px 18px', borderTop: `0.5px solid ${T.rowBd}`, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setCancelModal(null)} disabled={cancelar.isPending}
                style={{ padding: '7px 14px', border: `0.5px solid ${T.rowBd}`, borderRadius: 9, fontSize: 11, fontWeight: 500, cursor: 'pointer', background: T.rowBg, color: T.rowSub }}>Volver</button>
              <button onClick={() => cancelar.mutate({ id: cancelModal.tarea.id, motivo: cancelModal.motivo.trim() })}
                disabled={cancelar.isPending}
                style={{ padding: '7px 14px', border: 'none', borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: '#c2410c', color: '#fff' }}>
                {cancelar.isPending ? 'Cancelando…' : 'Cancelar tarea'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
