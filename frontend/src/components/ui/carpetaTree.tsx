import { useMemo, useState } from 'react'
import { ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react'
import type { CarpetaNodo } from '@/services/carpeta.service'
import type { ThemeVars } from '@/constants/themes'

export interface CarpetaTreeNode extends CarpetaNodo {
  hijos: CarpetaTreeNode[]
}

/** Construye la jerarquía a partir de la lista plana (campo `padre`). */
export function construirArbol(planas: CarpetaNodo[]): CarpetaTreeNode[] {
  const byId = new Map<number, CarpetaTreeNode>()
  planas.forEach(c => byId.set(c.id, { ...c, hijos: [] }))
  const raices: CarpetaTreeNode[] = []
  byId.forEach(n => {
    if (n.padre != null && byId.has(n.padre)) byId.get(n.padre)!.hijos.push(n)
    else raices.push(n)
  })
  const ordenar = (ns: CarpetaTreeNode[]) => {
    ns.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    ns.forEach(n => ordenar(n.hijos))
  }
  ordenar(raices)
  return raices
}

interface TreeProps {
  nodos: CarpetaTreeNode[]
  seleccionada: number | null
  onSeleccionar: (id: number | null) => void
  T: ThemeVars
  /** contenido extra por fila (acciones de gestión) */
  acciones?: (n: CarpetaTreeNode) => React.ReactNode
  /** muestra el conteo de documentos directos */
  mostrarConteo?: boolean
}

export function CarpetaTree({ nodos, seleccionada, onSeleccionar, T, acciones, mostrarConteo }: TreeProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {nodos.map(n => (
        <Rama key={n.id} n={n} nivel={0} seleccionada={seleccionada}
          onSeleccionar={onSeleccionar} T={T} acciones={acciones} mostrarConteo={mostrarConteo} />
      ))}
    </div>
  )
}

function Rama({ n, nivel, seleccionada, onSeleccionar, T, acciones, mostrarConteo }: {
  n: CarpetaTreeNode; nivel: number
} & Omit<TreeProps, 'nodos'>) {
  const [abierta, setAbierta] = useState(nivel < 1)
  const tieneHijos = n.hijos.length > 0
  const sel = seleccionada === n.id
  return (
    <div>
      <div
        onClick={() => onSeleccionar(sel ? null : n.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '5px 6px', borderRadius: 7,
          marginLeft: nivel * 14, cursor: 'pointer',
          background: sel ? T.rowSel : 'transparent',
          border: `0.5px solid ${sel ? T.accentDk : 'transparent'}`,
        }}
        onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLElement).style.background = T.rowHv }}
        onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        <span onClick={e => { e.stopPropagation(); if (tieneHijos) setAbierta(a => !a) }}
          style={{ width: 14, display: 'flex', flexShrink: 0, color: T.rowSub }}>
          {tieneHijos ? (abierta ? <ChevronDown size={13} /> : <ChevronRight size={13} />) : null}
        </span>
        {sel || abierta ? <FolderOpen size={13} style={{ color: T.accentDk, flexShrink: 0 }} />
                        : <Folder size={13} style={{ color: T.rowSub, flexShrink: 0 }} />}
        <span style={{ fontSize: 12, color: T.rowTxt, fontWeight: sel ? 700 : 500, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {n.nombre}
        </span>
        {mostrarConteo && n.n_docs > 0 && (
          <span style={{ fontSize: 10, color: T.rowSub, background: T.rowBg, borderRadius: 10, padding: '0 6px', flexShrink: 0 }}>{n.n_docs}</span>
        )}
        {acciones?.(n)}
      </div>
      {tieneHijos && abierta && n.hijos.map(h => (
        <Rama key={h.id} n={h} nivel={nivel + 1} seleccionada={seleccionada}
          onSeleccionar={onSeleccionar} T={T} acciones={acciones} mostrarConteo={mostrarConteo} />
      ))}
    </div>
  )
}

/** Ruta legible "A > B > C" de un nodo dentro de la lista plana. */
export function rutaDe(id: number | null, planas: CarpetaNodo[]): string {
  if (id == null) return ''
  const byId = new Map(planas.map(c => [c.id, c]))
  const partes: string[] = []
  let actual = byId.get(id)
  let n = 0
  while (actual && n < 50) {
    partes.unshift(actual.nombre)
    actual = actual.padre != null ? byId.get(actual.padre) : undefined
    n++
  }
  return partes.join(' > ')
}

export function useArbol(planas: CarpetaNodo[] | undefined) {
  return useMemo(() => construirArbol(planas ?? []), [planas])
}
