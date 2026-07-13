export type ThemeId = 'clasico' | 'oscuro' | 'oceano' | 'natural' | 'cobre' | 'indigo' | 'pizarra' | 'salmon'

export interface ThemeVars {
  // Sidebar
  sbBg: string; sbText: string; sbTextOn: string; sbIcon: string; sbIconOn: string
  sbActive: string; sbHover: string; sbBorder: string; sbLabel: string; sbUser: string
  // Topbar
  tbBg: string; tbBorder: string; tbText: string; tbSub: string; tbShadow: string
  // Page / Content
  pageBg: string; ctBg: string; ctHdrBg: string; ctHdrBd: string
  statsBg: string; colBg: string; colBd: string; colTxt: string
  // Rows
  rowBg: string; rowNr: string; rowHv: string; rowHvNr: string
  rowSel: string; rowBd: string; rowBlNr: string; rowBlSel: string
  rowTxt: string; rowSub: string
  // Panel
  pnBd: string; pnSh: string; pnHdr: string; pnHTxt: string; pnHNum: string
  pnMeta: string; pnMetaBd: string; pnCmt: string; pnCmtBd: string
  // Accent
  accent: string; accentDk: string
  // Glass / Glassmorphism
  glassBackground: string
  glassBackdrop: string
  glassBorder: string
  glassShadow: string
  // Gradients
  gradientPrimary: string
  gradientSecondary: string
  // Background animation class
  bgAnimation: string
}

export const THEMES: Record<ThemeId, { id: ThemeId; nombre: string; color: string; vars: ThemeVars }> = {
  clasico: {
    id: 'clasico', nombre: 'Clásico', color: '#0d2040',
    vars: {
      sbBg: 'linear-gradient(180deg,#0a1628 0%,#0d2040 100%)',
      sbText: 'rgba(255,255,255,.65)', sbTextOn: '#fff',
      sbIcon: 'rgba(255,255,255,.45)', sbIconOn: '#ffd166',
      sbActive: 'rgba(255,255,255,.13)', sbHover: 'rgba(255,255,255,.08)',
      sbBorder: 'rgba(255,255,255,.07)', sbLabel: 'rgba(255,255,255,.3)',
      sbUser: 'rgba(0,0,0,.15)',
      tbBg: '#fff', tbBorder: '#dce7f3', tbText: '#0a1628', tbSub: '#9ca3af',
      tbShadow: '0 2px 8px rgba(0,47,108,.08)',
      pageBg: 'linear-gradient(135deg,#c7d2fe 0%,#ddd6fe 100%)',
      ctBg: '#f2f6fc', ctHdrBg: '#fff', ctHdrBd: '#d8e4f0',
      statsBg: '#edf2fa',
      colBg: 'linear-gradient(90deg,#e2ecf8 0%,#eaf2ff 100%)', colBd: '#c8d9ee', colTxt: '#3d5a80',
      rowBg: '#fff', rowNr: 'rgba(0,47,108,.035)', rowHv: '#f0f5fc', rowHvNr: 'rgba(0,47,108,.07)',
      rowSel: '#dbeafe', rowBd: '#e8eef7', rowBlNr: '#4a90d9', rowBlSel: '#002f6c',
      rowTxt: '#0a1628', rowSub: '#9ca3af',
      pnBd: '#002f6c', pnSh: '-4px 0 20px rgba(0,47,108,.12)',
      pnHdr: 'linear-gradient(135deg,#002f6c 0%,#0047a8 100%)',
      pnHTxt: '#fff', pnHNum: '#ffd166',
      pnMeta: '#f7faff', pnMetaBd: '#e0eaf7', pnCmt: '#f7faff', pnCmtBd: '#c8d9ee',
      accent: '#ffd166', accentDk: '#002f6c',
      glassBackground: 'rgba(255,255,255,0.58)',
      glassBackdrop: 'blur(16px)',
      glassBorder: '1px solid rgba(255,255,255,0.50)',
      glassShadow: '0 8px 32px rgba(0,47,108,0.14)',
      gradientPrimary: 'linear-gradient(135deg,#c7d2fe 0%,#ddd6fe 100%)',
      gradientSecondary: 'linear-gradient(135deg,#ddd6fe 0%,#ede9fe 100%)',
      bgAnimation: 'none',
    }
  },
  oscuro: {
    id: 'oscuro', nombre: 'Oscuro', color: '#1e1b4b',
    vars: {
      sbBg: 'linear-gradient(180deg,#0f172a 0%,#1e1b4b 100%)',
      sbText: 'rgba(226,232,240,.65)', sbTextOn: '#f1f5f9',
      sbIcon: 'rgba(226,232,240,.35)', sbIconOn: '#a78bfa',
      sbActive: 'rgba(167,139,250,.2)', sbHover: 'rgba(255,255,255,.06)',
      sbBorder: 'rgba(255,255,255,.08)', sbLabel: 'rgba(226,232,240,.3)',
      sbUser: 'rgba(0,0,0,.3)',
      tbBg: '#1e293b', tbBorder: '#334155', tbText: '#f1f5f9', tbSub: '#64748b',
      tbShadow: '0 2px 8px rgba(0,0,0,.3)',
      pageBg: '#0f172a',
      ctBg: '#1e293b', ctHdrBg: '#1e293b', ctHdrBd: '#334155',
      statsBg: '#253347',
      colBg: 'linear-gradient(90deg,#1e3a5f 0%,#253347 100%)', colBd: '#334155', colTxt: '#94a3b8',
      rowBg: '#1e293b', rowNr: 'rgba(167,139,250,.08)', rowHv: '#253347', rowHvNr: 'rgba(167,139,250,.14)',
      rowSel: 'rgba(167,139,250,.22)', rowBd: '#334155', rowBlNr: '#a78bfa', rowBlSel: '#a78bfa',
      rowTxt: '#e2e8f0', rowSub: '#64748b',
      pnBd: '#a78bfa', pnSh: '-4px 0 20px rgba(0,0,0,.4)',
      pnHdr: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 100%)',
      pnHTxt: '#f1f5f9', pnHNum: '#a78bfa',
      pnMeta: '#253347', pnMetaBd: '#334155', pnCmt: '#253347', pnCmtBd: '#475569',
      accent: '#a78bfa', accentDk: '#4c1d95',
      glassBackground: 'rgba(30,41,59,0.75)',
      glassBackdrop: 'blur(16px)',
      glassBorder: '1px solid rgba(255,255,255,0.08)',
      glassShadow: '0 8px 32px rgba(0,0,0,0.45)',
      gradientPrimary: 'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)',
      gradientSecondary: 'linear-gradient(135deg,#1e293b 0%,#253347 100%)',
      bgAnimation: 'gradientShift',
    }
  },
  oceano: {
    id: 'oceano', nombre: 'Océano', color: '#0a4f6e',
    vars: {
      sbBg: 'linear-gradient(180deg,#0c3547 0%,#0a4f6e 100%)',
      sbText: 'rgba(255,255,255,.65)', sbTextOn: '#fff',
      sbIcon: 'rgba(255,255,255,.4)', sbIconOn: '#7dd3fc',
      sbActive: 'rgba(125,211,252,.2)', sbHover: 'rgba(255,255,255,.08)',
      sbBorder: 'rgba(255,255,255,.08)', sbLabel: 'rgba(255,255,255,.35)',
      sbUser: 'rgba(0,0,0,.2)',
      tbBg: '#fff', tbBorder: '#bae6fd', tbText: '#0c4a6e', tbSub: '#64a0bc',
      tbShadow: '0 2px 8px rgba(12,74,110,.1)',
      pageBg: 'linear-gradient(135deg,#7dd3fc 0%,#a5f3fc 100%)',
      ctBg: '#f0f9ff', ctHdrBg: '#fff', ctHdrBd: '#bae6fd',
      statsBg: '#e0f2fe',
      colBg: 'linear-gradient(90deg,#cce7f5 0%,#d9f0fc 100%)', colBd: '#9fcce0', colTxt: '#0c4a6e',
      rowBg: '#fff', rowNr: 'rgba(12,74,110,.04)', rowHv: '#e8f4fb', rowHvNr: 'rgba(12,74,110,.08)',
      rowSel: '#bae6fd', rowBd: '#daedf7', rowBlNr: '#38bdf8', rowBlSel: '#0284c7',
      rowTxt: '#0c4a6e', rowSub: '#64a0bc',
      pnBd: '#0284c7', pnSh: '-4px 0 20px rgba(12,74,110,.15)',
      pnHdr: 'linear-gradient(135deg,#0c3547 0%,#0a6fa0 100%)',
      pnHTxt: '#fff', pnHNum: '#7dd3fc',
      pnMeta: '#f0f9ff', pnMetaBd: '#bae6fd', pnCmt: '#f0f9ff', pnCmtBd: '#9fcce0',
      accent: '#7dd3fc', accentDk: '#0c3547',
      glassBackground: 'rgba(255,255,255,0.55)',
      glassBackdrop: 'blur(16px)',
      glassBorder: '1px solid rgba(255,255,255,0.50)',
      glassShadow: '0 8px 32px rgba(12,74,110,0.14)',
      gradientPrimary: 'linear-gradient(135deg,#7dd3fc 0%,#a5f3fc 100%)',
      gradientSecondary: 'linear-gradient(135deg,#a5f3fc 0%,#cffafe 100%)',
      bgAnimation: 'none',
    }
  },
  natural: {
    id: 'natural', nombre: 'Natural', color: '#166534',
    vars: {
      sbBg: 'linear-gradient(180deg,#14532d 0%,#166534 100%)',
      sbText: 'rgba(255,255,255,.65)', sbTextOn: '#fff',
      sbIcon: 'rgba(255,255,255,.4)', sbIconOn: '#6ee7b7',
      sbActive: 'rgba(110,231,183,.2)', sbHover: 'rgba(255,255,255,.08)',
      sbBorder: 'rgba(255,255,255,.07)', sbLabel: 'rgba(255,255,255,.35)',
      sbUser: 'rgba(0,0,0,.15)',
      tbBg: '#fff', tbBorder: '#a7f3d0', tbText: '#14532d', tbSub: '#6b9e88',
      tbShadow: '0 2px 8px rgba(20,83,45,.08)',
      pageBg: 'linear-gradient(135deg,#6ee7b7 0%,#a7f3d0 100%)',
      ctBg: '#f0fdf6', ctHdrBg: '#fff', ctHdrBd: '#a7f3d0',
      statsBg: '#dcfce7',
      colBg: 'linear-gradient(90deg,#c0ead4 0%,#d1fae5 100%)', colBd: '#86efac', colTxt: '#14532d',
      rowBg: '#fff', rowNr: 'rgba(20,83,45,.04)', rowHv: '#ecfdf5', rowHvNr: 'rgba(20,83,45,.08)',
      rowSel: '#bbf7d0', rowBd: '#d1fae5', rowBlNr: '#34d399', rowBlSel: '#16a34a',
      rowTxt: '#14532d', rowSub: '#6b9e88',
      pnBd: '#16a34a', pnSh: '-4px 0 20px rgba(20,83,45,.15)',
      pnHdr: 'linear-gradient(135deg,#14532d 0%,#2d6a4f 100%)',
      pnHTxt: '#fff', pnHNum: '#6ee7b7',
      pnMeta: '#f0fdf6', pnMetaBd: '#a7f3d0', pnCmt: '#f0fdf6', pnCmtBd: '#86efac',
      accent: '#6ee7b7', accentDk: '#14532d',
      glassBackground: 'rgba(255,255,255,0.55)',
      glassBackdrop: 'blur(16px)',
      glassBorder: '1px solid rgba(255,255,255,0.50)',
      glassShadow: '0 8px 32px rgba(20,83,45,0.14)',
      gradientPrimary: 'linear-gradient(135deg,#6ee7b7 0%,#a7f3d0 100%)',
      gradientSecondary: 'linear-gradient(135deg,#a7f3d0 0%,#d1fae5 100%)',
      bgAnimation: 'none',
    }
  },
  cobre: {
    id: 'cobre', nombre: 'Cobre', color: '#7c2d12',
    vars: {
      sbBg: 'linear-gradient(180deg,#431407 0%,#7c2d12 100%)',
      sbText: 'rgba(255,255,255,.65)', sbTextOn: '#fff',
      sbIcon: 'rgba(255,255,255,.4)', sbIconOn: '#fbbf24',
      sbActive: 'rgba(251,191,36,.2)', sbHover: 'rgba(255,255,255,.08)',
      sbBorder: 'rgba(255,255,255,.07)', sbLabel: 'rgba(255,255,255,.35)',
      sbUser: 'rgba(0,0,0,.2)',
      tbBg: '#fff', tbBorder: '#fed7aa', tbText: '#431407', tbSub: '#9a7562',
      tbShadow: '0 2px 8px rgba(67,20,7,.08)',
      pageBg: 'linear-gradient(135deg,#fdba74 0%,#fde8d0 100%)',
      ctBg: '#fff7ed', ctHdrBg: '#fff', ctHdrBd: '#fed7aa',
      statsBg: '#fde8d0',
      colBg: 'linear-gradient(90deg,#fcd8ad 0%,#fde8d0 100%)', colBd: '#fdba74', colTxt: '#7c2d12',
      rowBg: '#fff', rowNr: 'rgba(67,20,7,.04)', rowHv: '#fff3e6', rowHvNr: 'rgba(67,20,7,.08)',
      rowSel: '#fed7aa', rowBd: '#fde8d0', rowBlNr: '#fb923c', rowBlSel: '#c2410c',
      rowTxt: '#431407', rowSub: '#9a7562',
      pnBd: '#c2410c', pnSh: '-4px 0 20px rgba(67,20,7,.15)',
      pnHdr: 'linear-gradient(135deg,#431407 0%,#9a3412 100%)',
      pnHTxt: '#fff', pnHNum: '#fbbf24',
      pnMeta: '#fff7ed', pnMetaBd: '#fed7aa', pnCmt: '#fff7ed', pnCmtBd: '#fdba74',
      accent: '#fbbf24', accentDk: '#431407',
      glassBackground: 'rgba(255,255,255,0.55)',
      glassBackdrop: 'blur(16px)',
      glassBorder: '1px solid rgba(255,255,255,0.50)',
      glassShadow: '0 8px 32px rgba(67,20,7,0.14)',
      gradientPrimary: 'linear-gradient(135deg,#fdba74 0%,#fde8d0 100%)',
      gradientSecondary: 'linear-gradient(135deg,#fde8d0 0%,#fff7ed 100%)',
      bgAnimation: 'none',
    }
  },
  indigo: {
    id: 'indigo', nombre: 'Índigo', color: '#312e81',
    vars: {
      sbBg: 'linear-gradient(180deg,#1e1b4b 0%,#312e81 100%)',
      sbText: 'rgba(199,210,254,.65)', sbTextOn: '#e0e7ff',
      sbIcon: 'rgba(199,210,254,.35)', sbIconOn: '#818cf8',
      sbActive: 'rgba(99,102,241,.25)', sbHover: 'rgba(255,255,255,.07)',
      sbBorder: 'rgba(255,255,255,.09)', sbLabel: 'rgba(199,210,254,.3)',
      sbUser: 'rgba(0,0,0,.3)',
      tbBg: '#1e1b4b', tbBorder: '#3730a3', tbText: '#e0e7ff', tbSub: '#818cf8',
      tbShadow: '0 2px 8px rgba(0,0,0,.4)',
      pageBg: '#1e1b4b',
      ctBg: '#2d2b69', ctHdrBg: '#252369', ctHdrBd: '#3730a3',
      statsBg: '#312e81',
      colBg: 'linear-gradient(90deg,#3730a3 0%,#312e81 100%)', colBd: '#4338ca', colTxt: '#a5b4fc',
      rowBg: '#2d2b69', rowNr: 'rgba(99,102,241,.1)', rowHv: '#312e81', rowHvNr: 'rgba(99,102,241,.18)',
      rowSel: 'rgba(99,102,241,.3)', rowBd: '#3730a3', rowBlNr: '#818cf8', rowBlSel: '#6366f1',
      rowTxt: '#e0e7ff', rowSub: '#818cf8',
      pnBd: '#6366f1', pnSh: '-4px 0 20px rgba(0,0,0,.5)',
      pnHdr: 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 100%)',
      pnHTxt: '#e0e7ff', pnHNum: '#818cf8',
      pnMeta: '#312e81', pnMetaBd: '#3730a3', pnCmt: '#312e81', pnCmtBd: '#4338ca',
      accent: '#818cf8', accentDk: '#4338ca',
      glassBackground: 'rgba(30,27,75,0.75)',
      glassBackdrop: 'blur(16px)',
      glassBorder: '1px solid rgba(99,102,241,0.2)',
      glassShadow: '0 8px 32px rgba(0,0,0,0.5)',
      gradientPrimary: 'linear-gradient(135deg,#1e1b4b 0%,#2d2b69 100%)',
      gradientSecondary: 'linear-gradient(135deg,#2d2b69 0%,#312e81 100%)',
      bgAnimation: 'gradientShift',
    }
  },
  pizarra: {
    id: 'pizarra', nombre: 'Pizarra', color: '#374151',
    vars: {
      sbBg: 'linear-gradient(180deg,#111827 0%,#374151 100%)',
      sbText: 'rgba(255,255,255,.65)', sbTextOn: '#fff',
      sbIcon: 'rgba(255,255,255,.4)', sbIconOn: '#d1d5db',
      sbActive: 'rgba(209,213,219,.18)', sbHover: 'rgba(255,255,255,.08)',
      sbBorder: 'rgba(255,255,255,.07)', sbLabel: 'rgba(255,255,255,.35)',
      sbUser: 'rgba(0,0,0,.15)',
      tbBg: '#fff', tbBorder: '#d1d5db', tbText: '#111827', tbSub: '#6b7280',
      tbShadow: '0 2px 8px rgba(0,0,0,.06)',
      pageBg: 'linear-gradient(135deg,#c4c9d4 0%,#e0e3e8 100%)',
      ctBg: '#f3f4f6', ctHdrBg: '#fff', ctHdrBd: '#d1d5db',
      statsBg: '#f9fafb',
      colBg: 'linear-gradient(90deg,#e5e7eb 0%,#f3f4f6 100%)', colBd: '#d1d5db', colTxt: '#374151',
      rowBg: '#fff', rowNr: 'rgba(0,0,0,.03)', rowHv: '#f9fafb', rowHvNr: 'rgba(0,0,0,.06)',
      rowSel: '#e5e7eb', rowBd: '#e5e7eb', rowBlNr: '#6b7280', rowBlSel: '#374151',
      rowTxt: '#111827', rowSub: '#6b7280',
      pnBd: '#4b5563', pnSh: '-4px 0 20px rgba(0,0,0,.10)',
      pnHdr: 'linear-gradient(135deg,#111827 0%,#4b5563 100%)',
      pnHTxt: '#fff', pnHNum: '#d1d5db',
      pnMeta: '#f9fafb', pnMetaBd: '#e5e7eb', pnCmt: '#f9fafb', pnCmtBd: '#d1d5db',
      accent: '#9ca3af', accentDk: '#374151',
      glassBackground: 'rgba(255,255,255,0.62)',
      glassBackdrop: 'blur(16px)',
      glassBorder: '1px solid rgba(255,255,255,0.50)',
      glassShadow: '0 8px 32px rgba(0,0,0,0.10)',
      gradientPrimary: 'linear-gradient(135deg,#c4c9d4 0%,#e0e3e8 100%)',
      gradientSecondary: 'linear-gradient(135deg,#e0e3e8 0%,#f3f4f6 100%)',
      bgAnimation: 'none',
    }
  },
  salmon: {
    id: 'salmon', nombre: 'Salmón', color: '#9b2335',
    vars: {
      sbBg: 'linear-gradient(180deg,#5a1020 0%,#9b2335 100%)',
      sbText: 'rgba(255,255,255,.65)', sbTextOn: '#fff',
      sbIcon: 'rgba(255,255,255,.4)', sbIconOn: '#fca5a5',
      sbActive: 'rgba(252,165,165,.2)', sbHover: 'rgba(255,255,255,.08)',
      sbBorder: 'rgba(255,255,255,.07)', sbLabel: 'rgba(255,255,255,.35)',
      sbUser: 'rgba(0,0,0,.15)',
      tbBg: '#fff', tbBorder: '#fecdd3', tbText: '#5a1020', tbSub: '#b07880',
      tbShadow: '0 2px 8px rgba(90,16,32,.08)',
      pageBg: 'linear-gradient(135deg,#fda4af 0%,#fecdd3 100%)',
      ctBg: '#fff5f5', ctHdrBg: '#fff', ctHdrBd: '#fecdd3',
      statsBg: '#ffd5d8',
      colBg: 'linear-gradient(90deg,#fbbcbc 0%,#fecdd3 100%)', colBd: '#fca5a5', colTxt: '#7f1d1d',
      rowBg: '#fff', rowNr: 'rgba(90,16,32,.04)', rowHv: '#fff5f5', rowHvNr: 'rgba(90,16,32,.08)',
      rowSel: '#fecdd3', rowBd: '#ffd5d8', rowBlNr: '#f87171', rowBlSel: '#b91c1c',
      rowTxt: '#5a1020', rowSub: '#b07880',
      pnBd: '#e11d48', pnSh: '-4px 0 20px rgba(90,16,32,.15)',
      pnHdr: 'linear-gradient(135deg,#5a1020 0%,#9b2335 100%)',
      pnHTxt: '#fff', pnHNum: '#fca5a5',
      pnMeta: '#fff5f5', pnMetaBd: '#fecdd3', pnCmt: '#fff5f5', pnCmtBd: '#fca5a5',
      accent: '#fca5a5', accentDk: '#5a1020',
      glassBackground: 'rgba(255,255,255,0.55)',
      glassBackdrop: 'blur(16px)',
      glassBorder: '1px solid rgba(255,255,255,0.50)',
      glassShadow: '0 8px 32px rgba(90,16,32,0.14)',
      gradientPrimary: 'linear-gradient(135deg,#fda4af 0%,#fecdd3 100%)',
      gradientSecondary: 'linear-gradient(135deg,#fecdd3 0%,#fff5f5 100%)',
      bgAnimation: 'none',
    }
  },
}

export const THEME_ORDER: ThemeId[] = ['clasico', 'oscuro', 'oceano', 'natural', 'cobre', 'indigo', 'pizarra', 'salmon']
