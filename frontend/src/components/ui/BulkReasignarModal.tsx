import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRightLeft, Search, X } from 'lucide-react'
import { usuariosService } from '@/services/usuarios.service'
import type { ThemeVars } from '@/constants/themes'

interface Props {
  count: number
  pending: boolean
  error?: string
  onConfirm: (data: { usuario_id: number; unidad_id: number | null; instrucciones: string }) => void
  onCancel: () => void
  T: ThemeVars
}

/**
 * Reasignación MASIVA: UN solo modal para toda la selección — el usuario elige
 * una vez destinatario + instrucciones y se aplica a todos los documentos
 * seleccionados. No abre un modal por documento.
 */
export default function BulkReasignarModal({ count, pending, error, onConfirm, onCancel, T }: Props) {
  const [busqueda, setBusqueda] = useState('')
  const [usuarioId, setUsuarioId] = useState<number | null>(null)
  const [unidadId, setUnidadId] = useState<number | null>(null)
  const [instrucciones, setInstrucciones] = useState('')

  const { data: usuarios } = useQuery({
    queryKey: ['usuarios-bulk-reasignar', busqueda],
    queryFn: () => usuariosService.listar(busqueda ? { search: busqueda } : {}),
  })

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={() => !pending && onCancel()}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: T.ctHdrBg, border: `1px solid ${T.rowBd}`, borderRadius: 14, width: '100%', maxWidth: 460, maxHeight: '82vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,.25)' }}
      >
        <div style={{ padding: '14px 18px', borderBottom: `0.5px solid ${T.rowBd}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ArrowRightLeft size={15} style={{ color: T.accentDk }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: T.rowTxt }}>
            {count === 1 ? 'Reasignar documento' : `Reasignar ${count} documentos`}
          </span>
          <button onClick={onCancel} disabled={pending}
            style={{ marginLeft: 'auto', padding: 4, borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', color: T.rowSub }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '12px 18px 0' }}>
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: T.rowSub }} />
            <input
              placeholder="Buscar usuario por nombre…"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{ width: '100%', padding: '7px 10px 7px 28px', border: `0.5px solid ${T.rowBd}`, borderRadius: 8, fontSize: 12, outline: 'none', color: T.rowTxt, background: T.rowBg }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 4, minHeight: 120 }}>
          {usuarios?.results?.map(u => {
            const sel = usuarioId === u.id
            return (
              <div key={u.id}
                onClick={() => { setUsuarioId(u.id); setUnidadId((u as any).unidad_id ?? null) }}
                style={{
                  padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                  border: `0.5px solid ${sel ? T.accentDk : T.rowBd}`,
                  background: sel ? T.rowSel : T.rowBg,
                }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: T.rowTxt, margin: 0 }}>{u.nombre_completo}</p>
                <p style={{ fontSize: 10, color: T.rowSub, margin: '2px 0 0' }}>{u.cargo}{u.unidad_nombre ? ` · ${u.unidad_nombre}` : ''}</p>
              </div>
            )
          })}
          {usuarios && usuarios.results?.length === 0 && (
            <p style={{ fontSize: 11, color: T.rowSub, textAlign: 'center', padding: 16 }}>No se encontraron usuarios</p>
          )}
        </div>

        <div style={{ padding: '10px 18px' }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: T.rowSub, display: 'block', marginBottom: 4 }}>Instrucciones (opcional):</label>
          <textarea
            value={instrucciones}
            onChange={e => setInstrucciones(e.target.value)}
            placeholder="Indicaciones para el nuevo responsable…"
            rows={2}
            style={{ width: '100%', padding: '8px 10px', border: `0.5px solid ${T.rowBd}`, borderRadius: 8, fontSize: 12, fontFamily: 'inherit', resize: 'none', outline: 'none', color: T.rowTxt, background: T.rowBg }}
          />
          <p style={{ fontSize: 10.5, color: T.rowSub, margin: '8px 0 0' }}>
            La misma reasignación se aplicará a {count === 1 ? 'el documento seleccionado' : `los ${count} documentos seleccionados`}.
          </p>
          {error && (
            <p style={{ fontSize: 11, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '6px 10px', marginTop: 8 }}>{error}</p>
          )}
        </div>

        <div style={{ padding: '12px 18px', borderTop: `0.5px solid ${T.rowBd}`, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} disabled={pending}
            style={{ padding: '7px 14px', border: `0.5px solid ${T.rowBd}`, borderRadius: 9, fontSize: 11, fontWeight: 500, cursor: 'pointer', background: T.rowBg, color: T.rowSub }}>
            Cancelar
          </button>
          <button
            onClick={() => usuarioId && !pending && onConfirm({ usuario_id: usuarioId, unidad_id: unidadId, instrucciones: instrucciones.trim() })}
            disabled={!usuarioId || pending}
            style={{
              padding: '7px 14px', border: 'none', borderRadius: 9, fontSize: 11, fontWeight: 600,
              cursor: usuarioId && !pending ? 'pointer' : 'not-allowed',
              background: usuarioId ? T.accentDk : T.rowBd, color: '#fff',
            }}>
            {pending ? 'Reasignando…' : (count === 1 ? 'Reasignar' : `Reasignar ${count}`)}
          </button>
        </div>
      </div>
    </div>
  )
}
