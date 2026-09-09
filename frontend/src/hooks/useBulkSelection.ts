import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export interface BulkSelection {
  /** ids seleccionados (Set inmutable-por-render). */
  selected: Set<number>
  count: number
  ids: number[]
  isSelected: (id: number) => boolean
  toggle: (id: number) => void
  /** Selecciona los ids dados si no están todos; si ya lo están, limpia. */
  toggleAll: (ids: number[]) => void
  clear: () => void
  /** true = todos los `selectableIds` están seleccionados. */
  allChecked: boolean
  /** true = hay selección pero no es total → checkbox maestro en estado `[-]`. */
  indeterminate: boolean
}

/**
 * Selección múltiple genérica para listados de bandeja.
 *
 * - `selectableIds`: ids VISIBLES de la página actual que pueden participar en
 *   alguna acción de lote de la bandeja (el resto de filas no lleva checkbox).
 *   Debe venir memoizado por el consumidor para no re-ejecutar los efectos en
 *   cada render.
 * - `resetKey`: cualquier cambio de contexto (bandeja, filtros, búsqueda,
 *   usuario visto) limpia la selección para que no queden ids "colgados".
 */
export function useBulkSelection(selectableIds: number[], resetKey: string): BulkSelection {
  const [selected, setSelected] = useState<Set<number>>(new Set())

  // 1) Reset total al cambiar de contexto.
  const prevKey = useRef(resetKey)
  useEffect(() => {
    if (prevKey.current !== resetKey) {
      prevKey.current = resetKey
      setSelected(new Set())
    }
  }, [resetKey])

  // 2) Poda de ids que dejaron de ser visibles (p. ej. tras un refetch): la
  //    selección nunca puede contener algo que el usuario ya no ve.
  useEffect(() => {
    setSelected(prev => {
      if (prev.size === 0) return prev
      const visibles = new Set(selectableIds)
      const next = new Set<number>()
      prev.forEach(id => { if (visibles.has(id)) next.add(id) })
      return next.size === prev.size ? prev : next
    })
  }, [selectableIds])

  const toggle = useCallback((id: number) => setSelected(prev => {
    const n = new Set(prev)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  }), [])

  const toggleAll = useCallback((ids: number[]) => setSelected(prev => {
    const todos = ids.length > 0 && ids.every(id => prev.has(id))
    return todos ? new Set() : new Set(ids)
  }), [])

  const clear = useCallback(() => setSelected(new Set()), [])

  const ids = useMemo(() => [...selected], [selected])
  const allChecked = selectableIds.length > 0 && selectableIds.every(id => selected.has(id))
  const indeterminate = selected.size > 0 && !allChecked

  return {
    selected,
    count: selected.size,
    ids,
    isSelected: useCallback((id: number) => selected.has(id), [selected]),
    toggle,
    toggleAll,
    clear,
    allChecked,
    indeterminate,
  }
}
