import React, { useState } from 'react';
import { 
  RotateCcw, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  X, 
  Trash2, 
  ShieldAlert 
} from 'lucide-react';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { purgeAllTestDataExceptAdmin, PurgeResult } from '../../services/toolService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface ResetDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: PurgeResult) => void;
}

export const ResetDatabaseModal: React.FC<ResetDatabaseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    if (loading) return;
    setPassword('');
    setErrorMsg(null);
    setShowPassword(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('Por favor ingresa tu contraseña para confirmar.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('No hay una sesión de usuario activa.');
      }

      // Re-authenticate with entered user password
      const credential = EmailAuthProvider.credential(user.email, password.trim());
      await reauthenticateWithCredential(user, credential);

      // Password verified! Execute full purge
      const result = await purgeAllTestDataExceptAdmin(user.email);

      showToast(
        'success',
        '¡Sistema Restablecido a Cero!',
        `Se eliminaron ${result.usuariosEliminados} usuarios, ${result.herramientasEliminadas} herramientas, ${result.prestamosEliminados} préstamos y ${result.solicitudesEliminadas} solicitudes.`
      );

      if (onSuccess) {
        onSuccess(result);
      }

      handleClose();
    } catch (err: any) {
      console.error('Error during database reset:', err);
      if (
        err.code === 'auth/wrong-password' || 
        err.code === 'auth/invalid-credential' || 
        err.code === 'auth/invalid-password'
      ) {
        setErrorMsg('Contraseña incorrecta. Por seguridad, no se modificaron los datos.');
        showToast('error', 'Contraseña incorrecta', 'Verifica tu clave de usuario e intenta nuevamente.');
      } else {
        setErrorMsg(err.message || 'Error al validar credenciales o restablecer la base de datos.');
        showToast('error', 'Error en el restablecimiento', err.message || 'Ocurrió un problema.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div 
        className="bg-zinc-900 border border-rose-500/40 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden p-5 sm:p-6 space-y-4 my-6 text-zinc-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                Restablecer Todo a Cero
              </h3>
              <p className="text-xs text-zinc-400">
                Solo administrador principal: <strong className="text-zinc-200">{currentUser?.email}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning & Scope Description */}
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-rose-200">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>Acción Destructiva de Reinicio Total</span>
          </div>
          <p className="text-rose-200/90 leading-relaxed">
            Esta opción dejará el sistema completamente limpio para empezar tus pruebas desde cero:
          </p>
          <ul className="space-y-1 list-disc list-inside text-rose-300/90 text-[11px]">
            <li>Elimina todos los usuarios registrados (<strong>a excepción de tu cuenta {currentUser?.email}</strong>).</li>
            <li>Elimina todas las herramientas del inventario.</li>
            <li>Elimina todos los movimientos, préstamos y devoluciones.</li>
            <li>Elimina todas las solicitudes de retiro y transferencias.</li>
          </ul>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-200 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Ingresa tu contraseña de usuario para confirmar *</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                disabled={loading}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Tu contraseña de inicio de sesión"
                className="w-full pl-3.5 pr-10 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 disabled:opacity-50"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 p-1"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errorMsg && (
              <p className="mt-2 text-xs text-rose-400 font-semibold flex items-center gap-1 animate-in fade-in duration-100">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg shadow-rose-950/50 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              <span>{loading ? 'Restableciendo todo a cero...' : 'Confirmar y Restablecer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
