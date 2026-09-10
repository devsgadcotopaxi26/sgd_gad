import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { GitBranch, CornerDownRight, X, Plus } from 'lucide-react'
import { documentosService, DocumentoAsociado } from '@/services/documentos.service'
import type { ThemeVars } from '@/constants/themes'

const EST: Record<string, string> = {
  borrador: '#6b7280', en_revision: '#7e22ce', aprobado: '#15803d', firmado: '#0f6e56',
  enviado: '#1d4ed8', recibido: '#0369a1', archivado: '#374151', anulado: '#dc2626',
}

interface Props {
  documentoId: number
  /** true = el usuario puede editar la asociación de ESTE documento (borrador propio, etc.) */
  puedeEditar: boolean
  onAbrir?: (id: number) => void
  onAsociar?: () => void
  T: ThemeVars
}

/**
 * "Documentos asociados": cadena antecedente → actual → consecuentes.
 * NO reproduce la duplicación por destinatario de QUIPUX: cada documento
 * lógico aparece UNA vez. Abrir un nodo usa la auth normal (la lista no
 * concede acceso).
 */
export default function DocumentosAsociadosPanel({ documentoId, puedeEditar, onAbrir, onAsociar, T }: Props) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['doc-asociados', documentoId],
    queryFn: () => documentosService.asociados(documentoId),
  })

  const desasociar = useMutation({
    mutationFn: () => documentosService.desasociar(documentoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doc-asociados', documentoId] })
      qc.invalidateQueries({ queryKey: ['doc-detalle', documentoId] })
    },
  })

  if (isLoading || !data) return null
  const cadena = data.cadena
  const consecuentes = data.consecuentes
  const tieneAlgo = cadena.length > 1 || consecuentes.length > 0

  const fila = (d: DocumentoAsociado, sangria: number, marca?: 'antecedente' | 'actual' | 'consecuente') => {
    const clickable = !d.es_actual && !d.restringido && !!onAbrir
    return (
      <div key={`${marca}-${d.id}`}
        onClick={() => clickable && onAbrir!(d.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 8,
          marginLeft: sangria * 16, cursor: clickable ? 'pointer' : 'default',
          background: d.es_actual ? T.rowSel : T.rowBg,
          border: `0.5px solid ${d.es_actual ? T.accentDk : T.rowBd}`,
          opacity: d.restringido ? 0.65 : 1,
        }}>
        {sangria > 0 && <CornerDownRight size={11} style={{ color: T.rowSub, flexShrink: 0 }} />}
        {d.restringido ? (
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: 11, margin: 0, color: T.rowSub, fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Documento relacionado — acceso restringido
              {d.es_actual && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: T.accentDk }}>● actual</span>}
            </p>
          </div>
        ) : (
          <>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: 11, margin: 0, color: T.rowTxt, fontWeight: d.es_actual ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {d.tipo && <span style={{ fontFamily: 'monospace', color: T.rowSub }}>{d.tipo} </span>}
                {d.numero_documento || '(borrador)'}
                {d.es_actual && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: T.accentDk }}>● actual</span>}
              </p>
              <p style={{ fontSize: 10, margin: '1px 0 0', color: T.rowSub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {d.asunto}
              </p>
            </div>
            <span style={{ fontSize: 9, fontWeight: 700, color: EST[d.estado ?? ''] ?? T.rowSub, flexShrink: 0 }}>{d.estado}</span>
          </>
        )}
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <GitBranch size={12} style={{ color: T.pnBd }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: T.rowTxt, textTransform: 'uppercase', letterSpacing: '.04em' }}>
          Cadena documental
        </span>
        {puedeEditar && onAsociar && (
          <button onClick={onAsociar}
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600, color: T.accentDk, background: 'none', border: 'none', cursor: 'pointer' }}>
            <Plus size={11} /> Asociar
          </button>
        )}
      </div>

      {!tieneAlgo ? (
        <p style={{ fontSize: 10.5, color: T.rowSub, margin: 0 }}>Este documento no tiene antecedente ni respuestas.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {cadena.map((d, i) => fila(d, i, d.es_actual ? 'actual' : 'antecedente'))}
          {consecuentes.map(d => fila(d, cadena.length, 'consecuente'))}
        </div>
      )}

      {puedeEditar && cadena.length > 1 && (
        <button onClick={() => desasociar.mutate()} disabled={desasociar.isPending}
          style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: '#c2410c', background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={11} /> {desasociar.isPending ? 'Quitando…' : 'Quitar antecedente'}
        </button>
      )}
    </div>
  )
}
