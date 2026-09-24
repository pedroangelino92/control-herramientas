import React from 'react';
import { Clock, ShieldAlert, LogOut, RefreshCw, Mail, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

export const PendingApprovalView: React.FC = () => {
  const { currentUser, userProfile, logout, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [checking, setChecking] = React.useState(false);

  const handleRefresh = async () => {
    setChecking(true);
    try {
      await refreshProfile();
      showToast('info', 'Estado verificado', 'Si un administrador ya actualizó tu cuenta, entrarás en breve.');
    } finally {
      setTimeout(() => setChecking(false), 800);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl text-center relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Icon status */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-inner">
          <Clock className="w-10 h-10 animate-pulse" />
        </div>

        <h2 className="text-2xl font-black text-white tracking-tight mb-3">
          Cuenta en Revisión
        </h2>

        {/* Exact text requested in instructions */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm font-medium mb-6 leading-relaxed">
          "Tu cuenta está pendiente de aprobación por un administrador"
        </div>

        <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
          Hola <strong className="text-zinc-200">{userProfile?.nombre || currentUser?.email}</strong>. Para garantizar la seguridad del inventario y las herramientas de la empresa, un administrador debe autorizar tu perfil y asignarte el rol de <span className="text-amber-400 font-semibold">Técnico</span> o <span className="text-amber-400 font-semibold">Administrador</span>.
        </p>

        <div className="p-3.5 bg-zinc-950/80 rounded-xl border border-zinc-800 text-left text-xs space-y-1.5 mb-6 text-zinc-300 font-mono">
          <div className="flex justify-between">
            <span className="text-zinc-500">Correo:</span>
            <span className="text-white truncate max-w-[200px]">{currentUser?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Estado:</span>
            <span className="text-amber-400 font-bold uppercase tracking-wider">Pendiente</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Fecha registro:</span>
            <span>{userProfile?.fechaCreacion ? new Date(userProfile.fechaCreacion).toLocaleDateString() : 'Hoy'}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleRefresh}
            disabled={checking}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-semibold transition-all border border-zinc-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Comprobando estado...' : 'Comprobar Aprobación'}
          </button>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-sm font-semibold transition-all"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
};
