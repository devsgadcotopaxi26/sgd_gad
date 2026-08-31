import { useEffect, useRef } from 'react'
import { useThemeStore } from '@/store/themeStore'
import { THEMES } from '@/constants/themes'

interface ModalDetalleDocumentoProps {
  onClose: () => void
  children: React.ReactNode
}

/**
 * Contenedor modal amplio y centrado para CONSULTAR el detalle de un
 * documento (SGD o Quipux histórico) desde cualquier bandeja. Reemplaza el
 * panel lateral absoluto que antes tapaba parte del listado — el contenido
 * (PanelDetalle / PanelDetalleQuipux) no cambia, solo el contenedor que lo
 * presenta. No se usa para Crear/Editar: eso sigue ocupando el workspace.
 */
export default function ModalDetalleDocumento({ onClose, children }: ModalDetalleDocumentoProps) {
  const { tema } = useThemeStore()
  const T = THEMES[tema].vars
  const cajaRef = useRef<HTMLDivElement>(null)

  // Escape cierra; el foco entra a la caja al abrir y vuelve a lo que tenía
  // el foco antes (p. ej. el body, ya que las filas no son focoables) al cerrar.
  useEffect(() => {
    const previoFoco = document.activeElement as HTMLElement | null
    cajaRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      previoFoco?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 70,
        background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        ref={cajaRef}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        style={{
          width: 'min(1300px, 90vw)', height: 'min(900px, 88vh)',
          background: T.ctHdrBg, borderRadius: 18,
          border: `0.5px solid ${T.rowBd}`,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.35)',
          outline: 'none',
        }}
      >
        {children}
      </div>
    </div>
  )
}
