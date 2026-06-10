import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/authStore'
import { Eye, EyeOff, LogIn, FileText, ClipboardList, PenTool, BarChart2, ShieldCheck, User, ArrowRight } from 'lucide-react'

const schema = z.object({
  email: z.string().email('Email inválido'),
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

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: LoginForm) => {
    clearError()
    try {
      await login(data.email, data.password)
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

      <div className="min-h-screen flex items-stretch font-sans bg-white">
        
        {/* ── Panel Izquierdo: Visual & Branding (45%) ── */}
        <div className="hidden lg:flex flex-col justify-between p-14 relative overflow-hidden lg:w-[45%] bg-[#002f6c]">
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#da291c] rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#0052cc] rounded-full mix-blend-multiply filter blur-[128px] opacity-60" />
          <div className="absolute top-[40%] right-[20%] w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-[90px] opacity-10" />

          <div className="relative z-10">
            {/* Logo Desktop Ajustado: Más grande y con mejor proporción tipográfica */}
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
            <p className="text-sm text-white/50 font-medium">
              SGD v2.0 · Cotopaxi Digital
            </p>
            <div className="flex gap-2">
              <span className="w-2 h-2 rounded-full bg-[#da291c] animate-pulse"></span>
              <span className="w-2 h-2 rounded-full bg-white"></span>
              <span className="w-2 h-2 rounded-full bg-[#002f6c] border border-white/30"></span>
            </div>
          </div>
        </div>

        {/* ── Panel Derecho: Formulario de Login (55%) ── */}
        <div className="flex flex-col justify-center px-8 sm:px-16 py-12 w-full lg:w-[55%] shadow-[-20px_0_40px_-15px_rgba(0,0,0,0.05)] z-20 relative overflow-y-auto bg-white bg-[radial-gradient(#f1f5f9_2px,transparent_2px)] [background-size:24px_24px]">
          
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#002f6c] via-[#da291c] to-[#002f6c]"></div>

          <div className="w-full max-w-[480px] mx-auto animate-slide-up relative z-10 bg-white/60 backdrop-blur-3xl rounded-3xl p-2 sm:p-4" style={{ animationDelay: '0.2s' }}>
            
            {/* Logo Mobile Ajustado: Se usa el escudo real, centrado en fila para no usar tanta altura */}
            <div className="flex lg:hidden items-center gap-4 sm:gap-6 mb-10">
              <div className="w-20 h-20 sm:w-24 sm:h-24 p-3 shrink-0 rounded-2xl flex items-center justify-center bg-[#002f6c] border border-[#002f6c]/10 shadow-lg">
                <img
                  src="https://cotopaxi.gob.ec/wp-content/uploads/2026/02/Prefectura-de-Cotopaxi-0062d2.svg"
                  alt="Escudo GAD Cotopaxi"
                  className="w-full h-auto brightness-0 invert drop-shadow-sm object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
              </div>
              <div>
                <p className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">Gobierno Autónomo Descentralizado</p>
                <p className="text-sm font-medium text-gray-500 mt-1">de la Provincia de Cotopaxi</p>
              </div>
            </div>

            <div className="mb-10">
              <div className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase rounded-full px-3.5 py-1.5 mb-6 bg-blue-50 text-[#002f6c] border border-blue-100 shadow-sm">
                <ShieldCheck size={14} className="text-[#da291c]" /> Acceso Seguro Institucional
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">
                {greeting}
              </h2>
              <p className="text-base text-gray-500">Ingresa tus credenciales para acceder a tu panel de control.</p>
            </div>

            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-5 py-4 mb-8 text-sm text-red-700 animate-shake shadow-sm">
                <span className="flex-shrink-0 bg-red-100 p-1.5 rounded-full text-[#da291c] mt-0.5">
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </span>
                <span className="font-medium leading-relaxed">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">
                  Correo institucional
                </label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#002f6c] transition-colors">
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  </span>
                  <input
                    {...register('email')}
                    type="email"
                    autoComplete="email"
                    placeholder="usuario@cotopaxi.gob.ec"
                    className={`w-full pl-12 pr-4 py-4 rounded-xl text-sm text-gray-900 bg-white border shadow-sm transition-all duration-300 outline-none
                      ${errors.email 
                        ? 'border-red-300 focus:border-[#da291c] focus:ring-4 focus:ring-red-500/10' 
                        : 'border-gray-200 focus:border-[#002f6c] focus:ring-4 focus:ring-[#002f6c]/10 hover:border-gray-300'}`}
                  />
                </div>
                {errors.email && <p className="text-xs text-[#da291c] font-medium animate-in slide-in-from-top-1">{errors.email.message}</p>}
              </div>

              <div className="space-y-2.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">
                  Contraseña
                </label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#002f6c] transition-colors">
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </span>
                  <input
                    {...register('password')}
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={`w-full pl-12 pr-12 py-4 rounded-xl text-sm text-gray-900 bg-white border shadow-sm transition-all duration-300 outline-none
                      ${errors.password 
                        ? 'border-red-300 focus:border-[#da291c] focus:ring-4 focus:ring-red-500/10' 
                        : 'border-gray-200 focus:border-[#002f6c] focus:ring-4 focus:ring-[#002f6c]/10 hover:border-gray-300'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-[#da291c] font-medium animate-in slide-in-from-top-1">{errors.password.message}</p>}
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-3 text-sm text-gray-600 cursor-pointer select-none hover:text-gray-900 transition-colors">
                  <div className="relative flex items-center justify-center">
                    <input {...register('remember')} type="checkbox" className="peer w-4 h-4 appearance-none border-2 border-gray-300 rounded-md checked:bg-[#002f6c] checked:border-[#002f6c] transition-all cursor-pointer" />
                    <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                  </div>
                  Mantener sesión activa
                </label>
                <a href="#" className="text-sm font-semibold text-[#002f6c] hover:text-[#da291c] transition-colors">
                  ¿Olvidaste tu clave?
                </a>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="group w-full flex items-center justify-center gap-3 py-4 rounded-xl text-base font-bold text-white bg-[#002f6c] hover:bg-[#00224f] active:scale-[0.98] transition-all duration-300 shadow-xl shadow-[#002f6c]/20 disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100 mt-6"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 rounded-full animate-spin border-white/30 border-t-white" />
                ) : (
                  <LogIn size={20} className="transition-transform duration-300 group-hover:translate-x-1" />
                )}
                {isLoading ? 'Autenticando credenciales...' : 'Ingresar al Sistema'}
              </button>
            </form>

            <div className="flex items-center gap-4 my-8">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">¿No eres funcionario?</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <button
              className="group w-full flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-200 hover:border-[#002f6c] hover:bg-blue-50/50 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center group-hover:border-[#002f6c]/30 transition-colors">
                  <User size={18} className="text-gray-500 group-hover:text-[#002f6c] transition-colors" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-gray-900 group-hover:text-[#002f6c] transition-colors">Portal Ciudadano</p>
                  <p className="text-xs text-gray-500">Consulta de trámites públicos en línea</p>
                </div>
              </div>
              <ArrowRight size={18} className="text-gray-400 group-hover:text-[#002f6c] group-hover:translate-x-1 transition-all duration-300" />
            </button>

            <p className="text-center text-xs text-gray-400 mt-12 font-medium">
              &copy; {new Date().getFullYear()} G.A.D. Provincia de Cotopaxi<br />
              Desarrollado con altos estándares de seguridad
            </p>
          </div>
        </div>
      </div>
    </>
  )
}