import { AlertTriangle } from 'lucide-react'
import type { ThemeVars } from '@/constants/themes'

type Vars = ThemeVars

const TONO: Record<string, string> = {
  default: '#16a34a',
  warn: '#f97316',
  danger: '#da291c',
}

interface Props {
  open: boolean
  title: string
  body: string
  /** si true, exige un comentario no vacío para poder confirmar. */
  /** el comentario es obligatorio para confirmar. */
  needsComment?: boolean
  /** muestra el campo de comentario aunque NO sea obligatorio. */
  allowComment?: boolean
  comment: string
  onComment: (v: string) => void
  commentLabel?: string
  confirmLabel: string
  tone?: 'default' | 'warn' | 'danger'
  pending?: boolean
  error?: string
  onConfirm: () => void
  onCancel: () => void
  T: Vars
}

/**
 * Confirmación genérica para acciones de lote. Misma UX que el modal de
 * "Enviar a papelera" de "En Elaboración" (overlay fijo, comentario opcional,
 * lista de errores parciales). Reutilizable por cualquier bandeja.
 */
export default function BulkConfirmDialog({
  open, title, body, needsComment, allowComment, comment, onComment,
  commentLabel = 'Comentario (obligatorio):',
  confirmLabel, tone = 'warn', pending, error, onConfirm, onCancel, T,
}: Props) {
  if (!open) return null
  const color = TONO[tone] ?? TONO.warn
  const showComment = !!needsComment || !!allowComment
  const puedeConfirmar = (!needsComment || comment.trim().length > 0) && !pending

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={() => !pending && onCancel()}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: T.ctHdrBg, border: `1px solid ${T.rowBd}`, borderRadius: 14, width: '100%', maxWidth: 420, boxShadow: '0 20px 40px rgba(0,0,0,.25)' }}
      >
        <div style={{ padding: '14px 18px', borderBottom: `0.5px solid ${T.rowBd}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={15} style={{ color }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: T.rowTxt }}>{title}</span>
        </div>

        <div style={{ padding: '14px 18px' }}>
          <p style={{ fontSize: 12, color: T.rowSub, margin: '0 0 10px' }}>{body}</p>
          {showComment && (
            <>
              <label style={{ fontSize: 11, fontWeight: 600, color: T.rowSub, display: 'block', marginBottom: 4 }}>{commentLabel}</label>
              <textarea
                value={comment}
                onChange={e => onComment(e.target.value)}
                rows={3}
                placeholder="Motivo…"
                style={{ width: '100%', padding: '8px 10px', border: `0.5px solid ${T.rowBd}`, borderRadius: 8, fontSize: 12, fontFamily: 'inherit', resize: 'none', outline: 'none', color: T.rowTxt, background: T.rowBg }}
              />
            </>
          )}
          {error && (
            <p style={{ fontSize: 11, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '6px 10px', marginTop: 8 }}>{error}</p>
          )}
        </div>

        <div style={{ padding: '12px 18px', borderTop: `0.5px solid ${T.rowBd}`, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            disabled={pending}
            style={{ padding: '7px 14px', border: `0.5px solid ${T.rowBd}`, borderRadius: 9, fontSize: 11, fontWeight: 500, cursor: 'pointer', background: T.rowBg, color: T.rowSub }}
          >
            Cancelar
          </button>
          <button
            onClick={() => puedeConfirmar && onConfirm()}
            disabled={!puedeConfirmar}
            style={{
              padding: '7px 14px', border: 'none', borderRadius: 9, fontSize: 11, fontWeight: 600,
              cursor: puedeConfirmar ? 'pointer' : 'not-allowed',
              background: puedeConfirmar ? color : T.rowBd, color: '#fff',
            }}
          >
            {pending ? 'Procesando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
