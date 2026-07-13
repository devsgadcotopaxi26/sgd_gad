import { ReactNode } from 'react'
import { useThemeStore } from '@/store/themeStore'
import { THEMES } from '@/constants/themes'

interface GlassCardProps {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
  padding?: string
  onClick?: () => void
  hover?: boolean
}

export default function GlassCard({ children, className = '', style, padding = '20px', onClick, hover = false }: GlassCardProps) {
  const { tema } = useThemeStore()
  const T = THEMES[tema].vars

  return (
    <div
      className={`animate-fade-in-up${hover ? ' btn-liquid' : ''} ${className}`}
      onClick={onClick}
      style={{
        background: T.glassBackground,
        backdropFilter: T.glassBackdrop,
        WebkitBackdropFilter: T.glassBackdrop,
        border: T.glassBorder,
        boxShadow: T.glassShadow,
        borderRadius: 18,
        padding,
        transition: 'box-shadow 0.25s ease, transform 0.2s ease',
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
