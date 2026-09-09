import type { BandejaAccionDef } from '@/constants/bandejaAcciones'
import type { BandejaItem } from '@/services/bandeja.service'
import type { ThemeVars } from '@/constants/themes'

type Vars = ThemeVars

const TONO: Record<string, { border: string; bg: string; color: string }> = {
  default: { border: '#86efac', bg: '#f0fdf4', color: '#15803d' },
  warn:    { border: '#f97316', bg: '#fff7ed', color: '#c2410c' },
  danger:  { border: '#fecaca', bg: '#fef2f2', color: '#b91c1c' },
}

interface Props {
  count: number
  acciones: BandejaAccionDef[]
  /** documentos actualmente seleccionados — para evaluar compatibilidad (§9). */
  selectedItems: BandejaItem[]
  onAccion: (key: string) => void
  onLimpiar: () => void
  T: Vars
}

/**
 * Barra contextual de acciones de lote. NO se renderiza sin selección (el
 * consumidor la monta solo con `count > 0`). Muestra TODAS las acciones válidas
 * para la bandeja + selección directamente — sin menú "Más". Si no caben en una
 * línea, hacen wrap (flex-wrap) a una segunda línea; nunca se ocultan.
 */
export default function BulkActionBar({ count, acciones, selectedItems, onAccion, onLimpiar, T }: Props) {
  const incompatibilidad = (a: BandejaAccionDef): string | null => {
    if (!a.aplicableA) return null
    return selectedItems.some(i => !a.aplicableA!(i))
      ? (a.incompatibleMsg || 'La selección incluye documentos que no admiten esta acción.')
      : null
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8,
      padding: '8px 14px', background: T.rowSel,
      borderBottom: `1px solid ${T.ctHdrBd}`, flexShrink: 0,
    }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: T.rowTxt, whiteSpace: 'nowrap' }}>
        {count} seleccionado{count !== 1 ? 's' : ''}
      </span>

      {acciones.map(a => {
        const incompat = incompatibilidad(a)
        const t = TONO[a.tone] ?? TONO.default
        return (
          <button
            key={a.key}
            onClick={() => { if (!incompat) onAccion(a.key) }}
            disabled={!!incompat}
            title={incompat || undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600,
              cursor: incompat ? 'not-allowed' : 'pointer',
              opacity: incompat ? 0.45 : 1,
              border: `1px solid ${t.border}`, background: t.bg, color: t.color,
              whiteSpace: 'nowrap',
            }}
          >
            <a.icon size={12} /> {a.label(count)}
          </button>
        )
      })}

      <button
        onClick={onLimpiar}
        style={{
          marginLeft: 'auto', fontSize: 11, color: T.rowSub,
          background: 'none', border: 'none', cursor: 'pointer',
          textDecoration: 'underline', whiteSpace: 'nowrap',
        }}
      >
        Limpiar selección
      </button>
    </div>
  )
}
