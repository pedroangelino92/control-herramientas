import React, { useState } from 'react';
import { 
  Wrench, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  ArrowRight, 
  KeyRound, 
  AlertCircle,
  CheckCircle2,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { PWAInstallButton } from '../common/PWAInstallButton';

type AuthMode = 'login' | 'register' | 'forgot';

export const AuthView: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isInvalidCredential, setIsInvalidCredential] = useState(false);
  const [isOperationNotAllowed, setIsOperationNotAllowed] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const { loginWithEmail, registerWithEmail, loginWithGoogle, resetPassword, quickAdminAccess } = useAuth();
  const { showToast } = useToast();

  const handleAuthError = (err: any) => {
    console.error('Auth error:', err);
    let message = 'Ocurrió un error inesperado al procesar la solicitud.';
    const code = err.code || '';

    setIsInvalidCredential(false);
    setIsOperationNotAllowed(false);

    if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
      setIsInvalidCredential(true);
      message = 'Credenciales no reconocidas. Si aún no has registrado tu cuenta con contraseña, puedes crearla ahora o acceder con Google.';
    } else if (code === 'auth/email-already-in-use') {
      message = 'Este correo ya se encuentra registrado. Inicia sesión con tu contraseña.';
    } else if (code === 'auth/weak-password') {
      message = 'La contraseña debe tener al menos 6 caracteres.';
    } else if (code === 'auth/invalid-email') {
      message = 'El formato del correo electrónico es inválido.';
    } else if (code === 'auth/operation-not-allowed') {
      setIsOperationNotAllowed(true);
      message = 'El proveedor de inicio con correo/contraseña no está activado en la consola de Firebase. Utiliza el botón "Iniciar con cuenta de Google" o actívalo en Firebase Console > Authentication.';
    } else if (code === 'auth/popup-closed-by-user') {
      return; // Closed popup is normal
    } else if (err.message) {
      message = err.message;
    }

    setErrorMsg(message);
    showToast('error', 'Aviso de autenticación', message);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsInvalidCredential(false);
    setIsOperationNotAllowed(false);
    setSubmitting(true);

    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
        showToast('success', 'Bienvenido', 'Has iniciado sesión correctamente.');
      } else if (mode === 'register') {
        if (!nombre.trim()) {
          setErrorMsg('Por favor ingresa tu nombre completo.');
          setSubmitting(false);
          return;
        }
        await registerWithEmail(email, password, nombre, telefono);
        showToast('success', 'Cuenta creada', 'Tu cuenta fue registrada exitosamente.');
      } else if (mode === 'forgot') {
        await resetPassword(email);
        setResetSuccess(true);
        showToast('info', 'Correo enviado', 'Revisa tu bandeja para restablecer la contraseña.');
      }
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickRegisterFromError = async () => {
    if (!email || !password) {
      setMode('register');
      return;
    }
    setErrorMsg(null);
    setIsInvalidCredential(false);
    setSubmitting(true);

    try {
      const defaultName = nombre.trim() || (email.split('@')[0] ? email.split('@')[0].replace(/[._]/g, ' ') : 'Usuario');
      await registerWithEmail(email, password, defaultName, telefono);
      showToast('success', 'Cuenta registrada', 'Tu cuenta ha sido creada y configurada correctamente.');
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setIsInvalidCredential(false);
    setIsOperationNotAllowed(false);
    setSubmitting(true);
    try {
      await loginWithGoogle();
      showToast('success', 'Acceso correcto', 'Sesión iniciada con Google.');
    } catch (err: any) {
      handleAuthError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-zinc-950">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 shadow-xl shadow-amber-500/20 ring-1 ring-amber-400/40 mb-4">
            <Wrench className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Control de Herramientas
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Gestión inteligente de inventario, préstamos y trazabilidad
          </p>
          <div className="flex justify-center mt-3">
            <PWAInstallButton />
          </div>
        </div>

        {/* Auth Card */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          {/* Subtle glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Quick Google Sign In */}
          <div className="mb-6">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={submitting}
              className="w-full py-3 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800/90 border border-zinc-700/80 text-zinc-100 text-xs font-bold transition-all flex items-center justify-center gap-3 shadow-md hover:border-amber-500/50 group disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Acceder con Google</span>
              <span className="text-[10px] py-0.5 px-2 rounded-full bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/30 ml-auto hidden sm:inline-block">
                1 clic
              </span>
            </button>
          </div>

          {/* Social or Google login divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-zinc-900 px-3 text-zinc-500 font-medium tracking-wider text-[11px]">
                O accede con Correo y Contraseña
              </span>
            </div>
          </div>

          {/* Navigation tabs */}
          {mode !== 'forgot' && (
            <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                  setIsInvalidCredential(false);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  mode === 'login'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMsg(null);
                  setIsInvalidCredential(false);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  mode === 'register'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Crear Cuenta
              </button>
            </div>
          )}

          {/* Forgot header */}
          {mode === 'forgot' && (
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400">
                <KeyRound className="w-5 h-5" />
                <h3 className="font-bold text-white text-base">Restablecer Contraseña</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                  setResetSuccess(false);
                }}
                className="text-xs text-zinc-400 hover:text-white underline"
              >
                Volver a Iniciar Sesión
              </button>
            </div>
          )}

          {/* Error notice with contextual quick resolution */}
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <div className="flex-1">
                  <p className="font-medium text-rose-200 leading-relaxed">{errorMsg}</p>

                  {/* If invalid credential, offer to register or Google sign-in */}
                  {isInvalidCredential && (
                    <div className="mt-3 pt-3 border-t border-rose-500/20 flex flex-col gap-2">
                      <p className="text-[11px] text-zinc-300">
                        ¿Es la primera vez que ingresas con esta cuenta? Puedes registrarla ahora:
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleQuickRegisterFromError}
                          disabled={submitting}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors flex items-center gap-1.5 shadow"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Crear y Registrar esta cuenta</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleGoogleLogin}
                          disabled={submitting}
                          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs transition-colors border border-zinc-700"
                        >
                          <span>Iniciar con Google</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* If email provider is disabled on Firebase */}
                  {isOperationNotAllowed && (
                    <div className="mt-3 pt-3 border-t border-rose-500/20">
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors flex items-center justify-center gap-2"
                      >
                        <span>Entrar directamente con Google</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Reset success notice */}
          {resetSuccess && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Se ha enviado un enlace de recuperación a tu correo. Revisa tu bandeja de entrada o spam.</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Nombre Completo *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      required
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej: Pedro Angelino"
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-700/80 rounded-xl text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Teléfono de Contacto (opcional)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="tel"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="+54 9 11 1234 5678"
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-700/80 rounded-xl text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-start gap-2">
                  <UserCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <span>
                    <strong>Perfil predeterminado: Técnico.</strong> Toda cuenta nueva queda registrada en estado <strong>Pendiente</strong> y requerirá la aprobación de un Administrador para ingresar al sistema.
                  </span>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Correo Electrónico *
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pedroangelino92@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-700/80 rounded-xl text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-zinc-300">
                    Contraseña *
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setErrorMsg(null);
                        setIsInvalidCredential(false);
                      }}
                      className="text-xs text-amber-400 hover:text-amber-300 hover:underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-700/80 rounded-xl text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <span>Procesando...</span>
              ) : mode === 'login' ? (
                <>
                  <span>Ingresar al Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : mode === 'register' ? (
                <>
                  <span>Registrar Cuenta</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Enviar Enlace de Restablecimiento</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
