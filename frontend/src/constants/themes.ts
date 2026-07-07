export type ThemeId = 'clasico' | 'oscuro' | 'oceano' | 'natural' | 'cobre'

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
      pageBg: 'linear-gradient(135deg,#eef3fc 0%,#e8f0f9 100%)',
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
      pageBg: 'linear-gradient(135deg,#e0f7ff 0%,#c8edf9 100%)',
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
      pageBg: 'linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%)',
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
      pageBg: 'linear-gradient(135deg,#fff7ed 0%,#fde8d0 100%)',
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
    }
  },
}

export const THEME_ORDER: ThemeId[] = ['clasico', 'oscuro', 'oceano', 'natural', 'cobre']
