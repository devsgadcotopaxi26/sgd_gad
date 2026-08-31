import { useThemeStore } from '@/store/themeStore'
import { THEMES } from '@/constants/themes'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  abierto: boolean
  titulo: string
  mensaje: string
  textoConfirmar?: string
  textoCancelar?: string
  tono?: 'peligro' | 'normal'
  onConfirmar: () => void
  onCancelar: () => void
}

/**
 * Confirmación modal integrada con la paleta del SGD. Reutilizable para
 * cualquier acción destructiva o con pérdida de datos (p. ej. abandonar el
 * editor con cambios sin guardar). No usa window.confirm.
 */
export default function ConfirmDialog({
  abierto,
  titulo,
  mensaje,
  textoConfirmar = 'Continuar',
  textoCancelar = 'Cancelar',
  tono = 'normal',
  onConfirmar,
  onCancelar,
}: ConfirmDialogProps) {
  const { tema } = useThemeStore()
  const T = THEMES[tema].vars
  if (!abierto) return null

  const c = tono === 'peligro' ? '#da291c' : '#002f6c'

  return (
    <div
      onClick={onCancelar}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 400, maxWidth: '92vw', background: T.ctHdrBg,
          borderRadius: 16, overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.28)',
        }}
      >
        <div style={{ padding: '16px 18px 12px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
            background: `${c}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle size={16} style={{ color: c }} />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: T.rowTxt, margin: '2px 0 4px' }}>{titulo}</p>
            <p style={{ fontSize: 12, color: T.rowSub, lineHeight: 1.5, margin: 0 }}>{mensaje}</p>
          </div>
        </div>
        <div style={{
          padding: '10px 14px', borderTop: `0.5px solid ${T.pnMetaBd}`,
          display: 'flex', gap: 8, justifyContent: 'flex-end',
        }}>
          <button
            onClick={onCancelar}
            style={{
              padding: '7px 14px', border: `0.5px solid ${T.rowBd}`, borderRadius: 9,
              fontSize: 12, fontWeight: 600, cursor: 'pointer', background: T.rowBg, color: T.rowTxt,
            }}
          >
            {textoCancelar}
          </button>
          <button
            onClick={onConfirmar}
            autoFocus
            style={{
              padding: '7px 14px', border: 'none', borderRadius: 9,
              fontSize: 12, fontWeight: 700, cursor: 'pointer', background: c, color: '#fff',
            }}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}
