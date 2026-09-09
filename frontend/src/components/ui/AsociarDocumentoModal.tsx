import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { GitBranch, Search, X } from 'lucide-react'
import { documentosService, DocumentoAsociado } from '@/services/documentos.service'
import type { ThemeVars } from '@/constants/themes'

interface Props {
  documentoId: number
  pending: boolean
  error?: string
  onConfirm: (antecedenteId: number, observacion: string) => void
  onCancel: () => void
  T: ThemeVars
}

/**
 * Elige el ANTECEDENTE de un documento. La búsqueda está ACOTADA en backend a
 * documentos con los que el usuario tiene relación (§16): no permite enumerar
 * documentos ajenos.
 */
export default function AsociarDocumentoModal({ documentoId, pending, error, onConfirm, onCancel, T }: Props) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<DocumentoAsociado | null>(null)
  const [obs, setObs] = useState('')

  const { data: resultados } = useQuery({
    queryKey: ['asociables', documentoId, q],
    queryFn: () => documentosService.asociables(q, documentoId),
    enabled: q.trim().length >= 2,
  })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={() => !pending && onCancel()}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: T.ctHdrBg, border: `1px solid ${T.rowBd}`, borderRadius: 14, width: '100%', maxWidth: 460, maxHeight: '84vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,.25)' }}>
        <div style={{ padding: '14px 18px', borderBottom: `0.5px solid ${T.rowBd}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <GitBranch size={15} style={{ color: T.accentDk }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: T.rowTxt }}>Asociar a un documento antecedente</span>
          <button onClick={onCancel} disabled={pending} style={{ marginLeft: 'auto', padding: 4, borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', color: T.rowSub }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '12px 18px 0' }}>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: T.rowSub }} />
            <input placeholder="Buscar por número o asunto…" value={q} onChange={e => { setQ(e.target.value); setSel(null) }}
              style={{ width: '100%', padding: '7px 10px 7px 28px', border: `0.5px solid ${T.rowBd}`, borderRadius: 8, fontSize: 12, outline: 'none', color: T.rowTxt, background: T.rowBg }} />
          </div>
          <p style={{ fontSize: 9.5, color: T.rowSub, margin: '4px 0 0' }}>Solo aparecen documentos con los que usted tiene relación.</p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 18px 0', display: 'flex', flexDirection: 'column', gap: 4, minHeight: 100 }}>
          {resultados?.map(d => (
            <div key={d.id} onClick={() => setSel(d)}
              style={{ padding: '8px 10px', borderRadius: 8, cursor: 'pointer', border: `0.5px solid ${sel?.id === d.id ? T.accentDk : T.rowBd}`, background: sel?.id === d.id ? T.rowSel : T.rowBg }}>
              <p style={{ fontSize: 11.5, fontWeight: 600, color: T.rowTxt, margin: 0 }}>
                {d.tipo && <span style={{ fontFamily: 'monospace', color: T.rowSub }}>{d.tipo} </span>}{d.numero_documento || '(borrador)'}
              </p>
              <p style={{ fontSize: 10, color: T.rowSub, margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.asunto}</p>
            </div>
          ))}
          {q.trim().length >= 2 && resultados && resultados.length === 0 && (
            <p style={{ fontSize: 11, color: T.rowSub, textAlign: 'center', padding: 14 }}>Sin resultados</p>
          )}
        </div>

        <div style={{ padding: '10px 18px' }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: T.rowSub, display: 'block', marginBottom: 4 }}>Observación (opcional):</label>
          <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2}
            style={{ width: '100%', padding: '8px 10px', border: `0.5px solid ${T.rowBd}`, borderRadius: 8, fontSize: 12, fontFamily: 'inherit', resize: 'none', outline: 'none', color: T.rowTxt, background: T.rowBg }} />
          {error && <p style={{ fontSize: 11, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '6px 10px', marginTop: 8 }}>{error}</p>}
        </div>

        <div style={{ padding: '12px 18px', borderTop: `0.5px solid ${T.rowBd}`, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} disabled={pending}
            style={{ padding: '7px 14px', border: `0.5px solid ${T.rowBd}`, borderRadius: 9, fontSize: 11, fontWeight: 500, cursor: 'pointer', background: T.rowBg, color: T.rowSub }}>Cancelar</button>
          <button onClick={() => sel && !pending && onConfirm(sel.id, obs.trim())} disabled={!sel || pending}
            style={{ padding: '7px 14px', border: 'none', borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: sel && !pending ? 'pointer' : 'not-allowed', background: sel ? T.accentDk : T.rowBd, color: '#fff' }}>
            {pending ? 'Asociando…' : 'Asociar'}
          </button>
        </div>
      </div>
    </div>
  )
}
