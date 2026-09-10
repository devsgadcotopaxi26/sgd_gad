import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookUser, Search, X } from 'lucide-react'
import { usuariosService } from '@/services/usuarios.service'
import type { ThemeVars } from '@/constants/themes'

interface Props {
  count: number
  pending: boolean
  error?: string
  onConfirm: (data: { usuarios: number[]; comentario: string }) => void
  onCancel: () => void
  T: ThemeVars
}

/**
 * "Informar" — poner uno o varios documentos EN CONOCIMIENTO de uno o varios
 * usuarios. Un solo modal para toda la selección: los mismos usuarios y el
 * mismo comentario se aplican a todos los documentos.
 */
export default function BulkInformarModal({ count, pending, error, onConfirm, onCancel, T }: Props) {
  const [busqueda, setBusqueda] = useState('')
  const [sel, setSel] = useState<{ id: number; nombre: string }[]>([])
  const [comentario, setComentario] = useState('')

  const { data: usuarios } = useQuery({
    queryKey: ['usuarios-bulk-informar', busqueda],
    queryFn: () => usuariosService.listar(busqueda ? { search: busqueda } : {}),
  })

  const toggle = (id: number, nombre: string) =>
    setSel(prev => prev.some(u => u.id === id) ? prev.filter(u => u.id !== id) : [...prev, { id, nombre }])

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={() => !pending && onCancel()}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: T.ctHdrBg, border: `1px solid ${T.rowBd}`, borderRadius: 14, width: '100%', maxWidth: 480, maxHeight: '84vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,.25)' }}
      >
        <div style={{ padding: '14px 18px', borderBottom: `0.5px solid ${T.rowBd}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookUser size={15} style={{ color: T.accentDk }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: T.rowTxt }}>
            {count === 1 ? 'Informar documento' : `Informar ${count} documentos`}
          </span>
          <button onClick={onCancel} disabled={pending}
            style={{ marginLeft: 'auto', padding: 4, borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', color: T.rowSub }}>
            <X size={14} />
          </button>
        </div>

        {sel.length > 0 && (
          <div style={{ padding: '8px 18px 0', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {sel.map(u => (
              <span key={u.id}
                style={{ fontSize: 10.5, fontWeight: 600, background: T.rowSel, color: T.accentDk, borderRadius: 10, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                {u.nombre}
                <button onClick={() => toggle(u.id, u.nombre)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: T.accentDk, padding: 0, lineHeight: 1 }}>×</button>
              </span>
            ))}
          </div>
        )}

        <div style={{ padding: '10px 18px 0' }}>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: T.rowSub }} />
            <input
              placeholder="Buscar usuario a informar…"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{ width: '100%', padding: '7px 10px 7px 28px', border: `0.5px solid ${T.rowBd}`, borderRadius: 8, fontSize: 12, outline: 'none', color: T.rowTxt, background: T.rowBg }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 18px 0', display: 'flex', flexDirection: 'column', gap: 4, minHeight: 110 }}>
          {usuarios?.results?.map(u => {
            const on = sel.some(s => s.id === u.id)
            return (
              <div key={u.id}
                onClick={() => toggle(u.id, u.nombre_completo)}
                style={{
                  padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                  border: `0.5px solid ${on ? T.accentDk : T.rowBd}`,
                  background: on ? T.rowSel : T.rowBg, display: 'flex', alignItems: 'center', gap: 8,
                }}>
                <div style={{ width: 15, height: 15, borderRadius: 4, flexShrink: 0, border: `1.5px solid ${on ? T.accentDk : T.rowBd}`, background: on ? T.accentDk : T.rowBg, color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {on ? '✓' : ''}
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 500, color: T.rowTxt, margin: 0 }}>{u.nombre_completo}</p>
                  <p style={{ fontSize: 10, color: T.rowSub, margin: '2px 0 0' }}>{u.cargo}{u.unidad_nombre ? ` · ${u.unidad_nombre}` : ''}</p>
                </div>
              </div>
            )
          })}
          {usuarios && usuarios.results?.length === 0 && (
            <p style={{ fontSize: 11, color: T.rowSub, textAlign: 'center', padding: 16 }}>No se encontraron usuarios</p>
          )}
        </div>

        <div style={{ padding: '10px 18px' }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: T.rowSub, display: 'block', marginBottom: 4 }}>Comentario / instrucción (opcional):</label>
          <textarea
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            placeholder="Para su conocimiento…"
            rows={2}
            style={{ width: '100%', padding: '8px 10px', border: `0.5px solid ${T.rowBd}`, borderRadius: 8, fontSize: 12, fontFamily: 'inherit', resize: 'none', outline: 'none', color: T.rowTxt, background: T.rowBg }}
          />
          <p style={{ fontSize: 10.5, color: T.rowSub, margin: '8px 0 0' }}>
            No cambia el responsable ni saca el documento de tu bandeja. Los usuarios lo verán en su bandeja <strong>Informados</strong>.
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
            onClick={() => sel.length > 0 && !pending && onConfirm({ usuarios: sel.map(u => u.id), comentario: comentario.trim() })}
            disabled={sel.length === 0 || pending}
            style={{
              padding: '7px 14px', border: 'none', borderRadius: 9, fontSize: 11, fontWeight: 600,
              cursor: sel.length > 0 && !pending ? 'pointer' : 'not-allowed',
              background: sel.length > 0 ? T.accentDk : T.rowBd, color: '#fff',
            }}>
            {pending ? 'Informando…' : `Informar (${sel.length})`}
          </button>
        </div>
      </div>
    </div>
  )
}
