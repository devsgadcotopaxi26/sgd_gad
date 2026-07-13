import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { THEMES } from '@/constants/themes'
import { Eye, EyeOff, LogIn, FileText, ClipboardList, PenTool, BarChart2, ShieldCheck, User, ArrowRight } from 'lucide-react'

const schema = z.object({
  username: z.string().min(1, 'Ingresa tu cédula o correo electrónico'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
  remember: z.boolean().optional(),
})

type LoginForm = z.infer<typeof schema>

const FEATURES = [
  { icon: FileText,      text: 'Oficios, memorandos y circulares' },
  { icon: ClipboardList, text: 'Trámites ciudadanos en línea' },
  { icon: PenTool,       text: 'Firma electrónica BCE integrada' },
  { icon: BarChart2,     text: 'Reportería y KPIs en tiempo real' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, isLoading, error, clearError } = useAuthStore()
  const [showPw, setShowPw] = useState(false)
  const { tema } = useThemeStore()
  const T = THEMES[tema].vars

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: LoginForm) => {
    clearError()
    try {
      await login(data.username, data.password)
      navigate('/dashboard')
    } catch { /* error en store */ }
  }

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos días'
    if (hour < 19) return 'Buenas tardes'
    return 'Buenas noches'
  }, [])

  return (
    <>
      <style>{`
        @keyframes slideUp {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-slide-up { animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-shake { animation: shake 0.4s ease-in-out; }
      `}</style>

      <div className="min-h-screen flex items-stretch font-sans" style={{ background: T.rowHv }}>

        {/* Panel izquierdo: siempre azul institucional (branding fijo) */}
        <div className="hidden lg:flex flex-col justify-between p-14 relative overflow-hidden lg:w-[45%] bg-[#002f6c]">
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#da291c] rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#0052cc] rounded-full mix-blend-multiply filter blur-[128px] opacity-60" />
          <div className="absolute top-[40%] right-[20%] w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-[90px] opacity-10" />

          <div className="relative z-10">
            <div className="flex flex-col xl:flex-row xl:items-center gap-6 xl:gap-8 mb-16 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="w-36 h-36 xl:w-44 xl:h-44 p-6 shrink-0 rounded-[2rem] flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl animate-float">
                <img
                  src="https://cotopaxi.gob.ec/wp-content/uploads/2026/02/Prefectura-de-Cotopaxi-0062d2.svg"
                  alt="Escudo GAD Cotopaxi"
                  className="w-full h-auto brightness-0 invert drop-shadow-md object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
              </div>
              <div className="max-w-sm">
                <h2 className="text-white text-xl xl:text-2xl font-bold tracking-wide leading-tight drop-shadow-sm">
                  Gobierno Autónomo Descentralizado
                </h2>
                <h3 className="text-white/80 text-base xl:text-lg font-medium tracking-wider uppercase mt-2">
                  de la Provincia de Cotopaxi
                </h3>
              </div>
            </div>

            <h1 className="text-5xl 2xl:text-6xl font-extrabold text-white leading-[1.1] mb-6 tracking-tight animate-slide-up" style={{ animationDelay: '0.2s' }}>
              Sistema de<br />Gestión <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-[#ffd166]">Documental</span>
            </h1>
            <p className="text-lg text-white/80 max-w-lg leading-relaxed font-light animate-slide-up" style={{ animationDelay: '0.3s' }}>
              Plataforma institucional para la gestión eficiente, control y seguimiento de documentos, trámites y archivo digital.
            </p>

            <div className="flex flex-col gap-4 mt-12 max-w-md">
              {FEATURES.map(({ icon: Icon, text }, index) => (
                <div
                  key={text}
                  className="group flex items-center gap-4 rounded-2xl px-5 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 backdrop-blur-sm transition-all duration-300 cursor-default animate-slide-up hover:-translate-y-1"
                  style={{ animationDelay: `${0.4 + (index * 0.1)}s` }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#da291c] to-[#a01a12] shadow-lg group-hover:shadow-[#da291c]/50 transition-all duration-300">
                    <Icon size={18} className="text-white" />
                  </div>
                  <span className="text-sm font-medium text-white/90 group-hover:text-white transition-colors">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between w-full border-t border-white/10 pt-6 mt-12 animate-slide-up" style={{ animationDelay: '0.8s' }}>
            <p className="text-sm text-white/50 font-medium">SGD v2.0 · Cotopaxi Digital</p>
            <div className="flex gap-2">
              <span className="w-2 h-2 rounded-full bg-[#da291c] animate-pulse"></span>
              <span className="w-2 h-2 rounded-full bg-white"></span>
              <span className="w-2 h-2 rounded-full bg-[#002f6c] border border-white/30"></span>
            </div>
          </div>
        </div>

        {/* Panel derecho: formulario — responde al tema */}
        <div className="flex flex-col justify-center px-8 sm:px-16 py-12 w-full lg:w-[55%] z-20 relative overflow-y-auto"
          style={{ background: T.ctHdrBg }}>

          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: 'linear-gradient(to right, #002f6c, #da291c, #002f6c)' }} />

          <div className="w-full max-w-[480px] mx-auto animate-slide-up relative z-10" style={{ animationDelay: '0.2s' }}>

            {/* Logo móvil */}
            <div className="flex lg:hidden items-center gap-4 sm:gap-6 mb-10">
              <div className="w-20 h-20 sm:w-24 sm:h-24 p-3 shrink-0 rounded-2xl flex items-center justify-center bg-[#002f6c] shadow-lg">
                <img
                  src="https://cotopaxi.gob.ec/wp-content/uploads/2026/02/Prefectura-de-Cotopaxi-0062d2.svg"
                  alt="Escudo GAD Cotopaxi"
                  className="w-full h-auto brightness-0 invert drop-shadow-sm object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
              </div>
              <div>
                <p style={{ fontSize: 17, fontWeight: 700, color: T.rowTxt, margin: 0 }}>Gobierno Autónomo Descentralizado</p>
                <p style={{ fontSize: 13, color: T.rowSub, marginTop: 3 }}>de la Provincia de Cotopaxi</p>
              </div>
            </div>

            <div style={{ marginBottom: 40 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', borderRadius: 20, padding: '5px 12px', marginBottom: 20, background: T.rowHv, color: '#002f6c', border: `0.5px solid ${T.rowBd}` }}>
                <ShieldCheck size={14} style={{ color: '#da291c' }} /> Acceso Seguro Institucional
              </div>
              <h2 style={{ fontSize: 32, fontWeight: 800, color: T.rowTxt, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                {greeting}
              </h2>
              <p style={{ fontSize: 15, color: T.rowSub }}>Ingresa tus credenciales para acceder a tu panel de control.</p>
            </div>

            {error && (
              <div className="animate-shake" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 12, padding: '14px 16px', marginBottom: 28, fontSize: 13, color: '#dc2626' }}>
                <span style={{ flexShrink: 0, background: '#fee2e2', borderRadius: '50%', padding: 5, marginTop: 1 }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </span>
                <span style={{ fontWeight: 500, lineHeight: 1.5 }}>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.rowSub, marginBottom: 8 }}>
                  Cédula o correo electrónico
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: T.rowSub }}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </span>
                  <input
                    {...register('username')}
                    type="text"
                    autoComplete="username"
                    placeholder="Ingrese su número de cédula o email"
                    style={{ width: '100%', paddingLeft: 44, paddingRight: 14, paddingTop: 14, paddingBottom: 14, borderRadius: 12, fontSize: 13, color: T.rowTxt, background: T.rowBg, border: `1.5px solid ${errors.username ? '#fca5a5' : T.rowBd}`, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                {errors.username && <p style={{ fontSize: 12, color: '#da291c', fontWeight: 500, marginTop: 5 }}>{errors.username.message}</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.rowSub, marginBottom: 8 }}>
                  Contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: T.rowSub }}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </span>
                  <input
                    {...register('password')}
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    style={{ width: '100%', paddingLeft: 44, paddingRight: 44, paddingTop: 14, paddingBottom: 14, borderRadius: 12, fontSize: 13, color: T.rowTxt, background: T.rowBg, border: `1.5px solid ${errors.password ? '#fca5a5' : T.rowBd}`, outline: 'none', boxSizing: 'border-box' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: T.rowSub, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.password && <p style={{ fontSize: 12, color: '#da291c', fontWeight: 500, marginTop: 5 }}>{errors.password.message}</p>}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: T.rowTxt, cursor: 'pointer' }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <input {...register('remember')} type="checkbox"
                      style={{ width: 16, height: 16, accentColor: '#002f6c', cursor: 'pointer' }} />
                  </div>
                  Mantener sesión activa
                </label>
                <a href="#" style={{ fontSize: 13, fontWeight: 600, color: '#002f6c', textDecoration: 'none' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#da291c')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#002f6c')}>
                  ¿Olvidaste tu clave?
                </a>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '14px 20px', borderRadius: 12, fontSize: 15, fontWeight: 700, color: '#fff', background: '#002f6c', border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.75 : 1, marginTop: 4 }}
              >
                {isLoading ? (
                  <span style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' }} className="animate-spin" />
                ) : (
                  <LogIn size={20} />
                )}
                {isLoading ? 'Autenticando credenciales...' : 'Ingresar al Sistema'}
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0' }}>
              <div style={{ flex: 1, height: 1, background: T.rowBd }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: T.rowSub, textTransform: 'uppercase', letterSpacing: '0.1em' }}>¿No eres funcionario?</span>
              <div style={{ flex: 1, height: 1, background: T.rowBd }} />
            </div>

            <button
              onClick={() => navigate('/portal')}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 16, background: T.rowHv, border: `0.5px solid ${T.rowBd}`, cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.background = T.rowSel; e.currentTarget.style.borderColor = T.accentDk }}
              onMouseLeave={e => { e.currentTarget.style.background = T.rowHv; e.currentTarget.style.borderColor = T.rowBd }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: T.ctHdrBg, border: `0.5px solid ${T.rowBd}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={18} style={{ color: T.rowSub }} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: T.rowTxt, margin: 0 }}>Portal Ciudadano</p>
                  <p style={{ fontSize: 11, color: T.rowSub, margin: '2px 0 0' }}>Consulta de trámites públicos en línea</p>
                </div>
              </div>
              <ArrowRight size={18} style={{ color: T.rowSub }} />
            </button>

            <p style={{ textAlign: 'center', fontSize: 11, color: T.rowSub, marginTop: 40 }}>
              &copy; {new Date().getFullYear()} G.A.D. Provincia de Cotopaxi<br />
              Desarrollado con altos estándares de seguridad
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
