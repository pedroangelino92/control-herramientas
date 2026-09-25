import React from 'react';
import { 
  Wrench, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  ArrowRight, 
  Plus, 
  Layers, 
  Database,
  ScanBarcode,
  TrendingUp,
  ShieldCheck,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { Herramienta, Prestamo, Usuario, SolicitudRetiro, SUPERADMIN_EMAIL } from '../../types';
import { AdminTab } from './AdminDashboard';
import { seedSampleToolsIfEmpty, purgeAllTestDataExceptAdmin } from '../../services/toolService';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { ConfirmationModal } from '../common/ConfirmationModal';

interface AdminSummaryProps {
  herramientas: Herramienta[];
  prestamos: Prestamo[];
  usuarios: Usuario[];
  solicitudes: SolicitudRetiro[];
  onNavigateTab: (tab: AdminTab) => void;
  onOpenNewToolModal: () => void;
  onOpenNewLoanModal: () => void;
  onOpenQuickScanner?: () => void;
}

export const AdminSummary: React.FC<AdminSummaryProps> = ({
  herramientas,
  prestamos,
  usuarios,
  solicitudes = [],
  onNavigateTab,
  onOpenNewToolModal,
  onOpenNewLoanModal,
  onOpenQuickScanner,
}) => {
  const { userProfile, currentUser } = useAuth();
  const { showToast } = useToast();
  const [seeding, setSeeding] = React.useState(false);

  const isSuperAdmin = 
    currentUser?.email?.toLowerCase().trim() === SUPERADMIN_EMAIL.toLowerCase().trim() ||
    Boolean(currentUser?.email?.toLowerCase().includes('pedroangelino92'));

  const [isPurging, setIsPurging] = React.useState(false);
  const [showPurgeModal, setShowPurgeModal] = React.useState(false);

  const totalTools = herramientas.length;
  const availableTools = herramientas.filter((h) => h.estado === 'Disponible').length;
  const loanedTools = herramientas.filter((h) => h.estado === 'Prestada').length;
  const maintenanceTools = herramientas.filter((h) => h.estado === 'En Mantenimiento').length;
  const outOfServiceTools = herramientas.filter((h) => h.estado === 'Fuera de servicio').length;

  const pendingSolicitudes = solicitudes.filter((s) => s.estado === 'Pendiente');
  const pendingUsers = usuarios.filter((u) => u.estado === 'pendiente');
  const activeTechnicians = usuarios.filter((u) => u.rol === 'tecnico' && u.estado === 'activo');

  const testUsersCount = usuarios.filter(
    (u) => 
      (u.email || '').toLowerCase().trim() !== (currentUser?.email || '').toLowerCase().trim() &&
      !(u.email || '').toLowerCase().includes('pedroangelino92')
  ).length;

  const now = new Date();
  const overdueLoans = prestamos.filter(
    (p) => p.estado === 'Activo' && p.fechaEstimadaDevolucion && new Date(p.fechaEstimadaDevolucion) < now
  );

  const recentActiveLoans = prestamos.filter((p) => p.estado === 'Activo').slice(0, 5);

  const handleSeedTools = async () => {
    setSeeding(true);
    try {
      const added = await seedSampleToolsIfEmpty(
        userProfile?.nombre || currentUser?.email || 'Administrador'
      );
      if (added > 0) {
        showToast('success', 'Inventario Sembrado', `Se agregaron ${added} herramientas de demostración.`);
      } else {
        showToast('info', 'Inventario existente', 'Ya tienes herramientas registradas en el sistema.');
      }
    } catch (err: any) {
      showToast('error', 'Error al sembrar datos', err.message || 'Error en la operación.');
    } finally {
      setSeeding(false);
    }
  };

  const handleExecutePurge = async () => {
    if (!isSuperAdmin) {
      showToast('error', 'Permiso denegado', 'Solo el administrador principal puede realizar esta acción.');
      return;
    }
    setIsPurging(true);
    try {
      const adminEmail = currentUser?.email || 'pedroangelino92@gmail.com';
      const result = await purgeAllTestDataExceptAdmin(adminEmail);
      showToast(
        'success',
        '¡Sistema restablecido a cero!',
        `Se eliminaron ${result.usuariosEliminados} usuarios, ${result.herramientasEliminadas} herramientas, ${result.prestamosEliminados} préstamos y ${result.solicitudesEliminadas} solicitudes.`
      );
      setShowPurgeModal(false);
    } catch (err: any) {
      console.error('Error purging data:', err);
      showToast('error', 'Error en la purga', err.message || 'No se pudieron eliminar todos los registros.');
    } finally {
      setIsPurging(false);
    }
  };

  const usagePercent = totalTools > 0 ? Math.round((loanedTools / totalTools) * 100) : 0;
  const availablePercent = totalTools > 0 ? Math.round((availableTools / totalTools) * 100) : 0;

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {/* SUPERADMIN PURGE BANNER / ACTION CARD */}
      {isSuperAdmin && (
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-zinc-900 via-zinc-900 to-rose-950/20 border border-rose-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400">
                <Trash2 className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                Limpieza de Datos de Prueba (Empezar de cero)
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Solo Superadmin
                </span>
              </h3>
            </div>
            <p className="text-xs text-zinc-400">
              Elimina todos los usuarios de prueba (conservando únicamente tu cuenta <strong className="text-zinc-200">{currentUser?.email}</strong>), todas las herramientas y registros de movimientos.
            </p>
            <div className="flex items-center gap-2 sm:gap-3 pt-1 text-[11px] text-zinc-400 flex-wrap">
              <span>Usuarios a borrar: <strong className="text-rose-400 font-bold">{testUsersCount}</strong></span>
              <span>•</span>
              <span>Herramientas: <strong className="text-rose-400 font-bold">{totalTools}</strong></span>
              <span>•</span>
              <span>Préstamos: <strong className="text-rose-400 font-bold">{prestamos.length}</strong></span>
              <span>•</span>
              <span>Solicitudes: <strong className="text-rose-400 font-bold">{solicitudes.length}</strong></span>
            </div>
          </div>

          <button
            onClick={() => setShowPurgeModal(true)}
            disabled={isPurging}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-950/50 flex items-center justify-center gap-2 shrink-0 active:scale-95 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isPurging ? 'Borrando datos...' : 'Restablecer Todo a Cero'}</span>
          </button>
        </div>
      )}

      {totalTools === 0 && (
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between gap-3 shadow-lg">
          <div>
            <h3 className="text-sm font-bold text-white">Inventario de herramientas vacío</h3>
            <p className="text-xs text-zinc-400">Puedes cargar un catálogo demo inicial para comenzar a operar.</p>
          </div>
          <button
            onClick={handleSeedTools}
            disabled={seeding}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-md shadow-amber-500/20"
          >
            {seeding ? 'Cargando...' : 'Cargar Herramientas Demo'}
          </button>
        </div>
      )}

      {/* 2. SOLICITUDES DE RETIRO PENDIENTES - HIGH PRIORITY ALERT CARD */}
      {pendingSolicitudes.length > 0 && (
        <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-amber-200 space-y-2.5 shadow-lg shadow-amber-500/5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>{pendingSolicitudes.length} {pendingSolicitudes.length === 1 ? 'Solicitud de Retiro Pendiente' : 'Solicitudes de Retiro Pendientes'}</span>
              </h3>
              <span className="text-[10px] bg-amber-400 text-black font-black px-1.5 py-0.2 rounded-full">
                Requiere tu autorización
              </span>
            </div>

            <button
              onClick={() => onNavigateTab('solicitudes')}
              className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow flex items-center gap-1"
            >
              <span>Ver y Autorizar Todo</span>
              <ArrowRight className="w-3 h-3 stroke-[2.5]" />
            </button>
          </div>

          {/* Quick list of pending solicitudes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {pendingSolicitudes.slice(0, 3).map((sol) => (
              <div
                key={sol.id || sol.nroSolicitud}
                onClick={() => onNavigateTab('solicitudes')}
                className="p-2 sm:p-2.5 rounded-xl bg-zinc-950/95 border border-zinc-800 hover:border-amber-500/50 cursor-pointer transition-all space-y-1 group"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                    {sol.nroSolicitud}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {new Date(sol.fechaSolicitud).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                    {sol.tecnicoNombre}
                  </p>
                  <p className="text-[10px] text-zinc-400 truncate">
                    {sol.cantidadTotal} {sol.cantidadTotal === 1 ? 'equipo' : 'equipos'}: {sol.herramientas.map(h => h.nombre).join(', ')}
                  </p>
                </div>

                <div className="pt-1 border-t border-zinc-900 flex items-center justify-between text-[10px]">
                  <span className="text-amber-400 font-bold group-hover:underline flex items-center gap-1">
                    Autorizar Retiro →
                  </span>
                  {sol.motivoUso && (
                    <span className="text-zinc-500 truncate max-w-[120px]">
                      {sol.motivoUso}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. PENDING USERS ALERT (COMPACT) */}
      {pendingUsers.length > 0 && (
        <div className="p-2.5 sm:p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="text-xs font-bold text-white">
              {pendingUsers.length} usuario(s) pendiente(s) de aprobación para acceder al sistema
            </span>
          </div>

          <button
            onClick={() => onNavigateTab('users')}
            className="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold transition-all flex items-center gap-1"
          >
            <span>Revisar Cuentas</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* 4. COMPACT METRICS GRID (2x2 on Mobile, 4-col on Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {/* Total Herramientas */}
        <div 
          onClick={() => onNavigateTab('inventory')}
          className="p-3 sm:p-3.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl shadow transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 truncate">Total Inventario</span>
            <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300 group-hover:text-amber-400 transition-colors shrink-0">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-white">{totalTools}</span>
            <span className="text-[10px] text-zinc-500">equipos</span>
          </div>
          <p className="mt-1 text-[10px] text-zinc-400 flex items-center gap-1 group-hover:text-amber-400 transition-colors truncate">
            <span>Ver catálogo</span>
            <ArrowRight className="w-2.5 h-2.5" />
          </p>
        </div>

        {/* Herramientas Prestadas */}
        <div 
          onClick={() => onNavigateTab('loans')}
          className="p-3 sm:p-3.5 bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 rounded-xl shadow transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400 truncate">En Uso / Préstamo</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-amber-400">{loanedTools}</span>
            <span className="text-[10px] text-zinc-500 font-medium">({usagePercent}%)</span>
          </div>
          <p className="mt-1 text-[10px] text-amber-300 flex items-center gap-1 truncate">
            <span>{overdueLoans.length > 0 ? `${overdueLoans.length} atrasadas` : 'Activas en campo'}</span>
            <ArrowRight className="w-2.5 h-2.5" />
          </p>
        </div>

        {/* Herramientas Disponibles */}
        <div 
          onClick={() => onNavigateTab('inventory')}
          className="p-3 sm:p-3.5 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 rounded-xl shadow transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400 truncate">Disponibles</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-emerald-400">{availableTools}</span>
            <span className="text-[10px] text-zinc-500 font-medium">({availablePercent}%)</span>
          </div>
          <p className="mt-1 text-[10px] text-emerald-300 flex items-center gap-1 truncate">
            <span>Listas en almacén</span>
            <ArrowRight className="w-2.5 h-2.5" />
          </p>
        </div>

        {/* En Mantenimiento */}
        <div 
          onClick={() => onNavigateTab('inventory')}
          className="p-3 sm:p-3.5 bg-zinc-900 border border-zinc-800 hover:border-orange-500/40 rounded-xl shadow transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-orange-400 truncate">Mantenimiento</span>
            <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-orange-400">{maintenanceTools}</span>
            {outOfServiceTools > 0 && (
              <span className="text-[10px] text-zinc-500">({outOfServiceTools} baja)</span>
            )}
          </div>
          <p className="mt-1 text-[10px] text-orange-300 flex items-center gap-1 truncate">
            <span>Requieren servicio</span>
            <ArrowRight className="w-2.5 h-2.5" />
          </p>
        </div>
      </div>

      {/* 5. ACTIVE LOANS FEED & TEAM OVERVIEW (COMPACT ROWS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Active loans feed (2 cols) */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 sm:p-4 shadow space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs sm:text-sm font-black text-white">Préstamos Activos Recientes</h3>
            </div>
            <button
              onClick={() => onNavigateTab('loans')}
              className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
            >
              <span>Ver todos ({prestamos.filter((p) => p.estado === 'Activo').length})</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {recentActiveLoans.length === 0 ? (
            <div className="p-6 text-center bg-zinc-950 rounded-xl border border-dashed border-zinc-800">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-1.5 opacity-80" />
              <p className="text-xs font-bold text-zinc-200">No hay herramientas en préstamo activo</p>
              <p className="text-[10px] text-zinc-500">Todos los equipos están resguardados en el almacén central.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {recentActiveLoans.map((loan) => {
                const isOverdue = loan.fechaEstimadaDevolucion ? new Date(loan.fechaEstimadaDevolucion) < now : false;

                return (
                  <div
                    key={loan.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-colors ${
                      isOverdue
                        ? 'bg-rose-950/20 border-rose-800/40 text-rose-100'
                        : 'bg-zinc-950/80 border-zinc-800/80 text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700">
                        <Wrench className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">
                          <span className="text-amber-400 font-mono mr-1.5">[{loan.herramientaCodigo}]</span>
                          {loan.herramientaNombre}
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate">
                          Técnico: <strong className="text-zinc-200">{loan.tecnicoNombre}</strong> • Prestado: {new Date(loan.fechaPrestamo).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full inline-block ${
                          isOverdue
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {isOverdue ? 'Atrasado' : 'Activo'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Team Status summary (1 col) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 sm:p-4 shadow space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs sm:text-sm font-black text-white">Estado del Personal</h3>
            </div>
            <button
              onClick={() => onNavigateTab('users')}
              className="text-[10px] text-zinc-400 hover:text-white"
            >
              Ver usuarios
            </button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-1 gap-2 text-xs">
            <div className="p-2 sm:p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row justify-between items-center text-center sm:text-left">
              <span className="text-[11px] text-zinc-400 font-medium">Técnicos:</span>
              <span className="text-sm font-bold text-emerald-400">{activeTechnicians.length}</span>
            </div>
            <div className="p-2 sm:p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row justify-between items-center text-center sm:text-left">
              <span className="text-[11px] text-zinc-400 font-medium">Pendientes:</span>
              <span className="text-sm font-bold text-amber-400">{pendingUsers.length}</span>
            </div>
            <div className="p-2 sm:p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row justify-between items-center text-center sm:text-left">
              <span className="text-[11px] text-zinc-400 font-medium">Admins:</span>
              <span className="text-sm font-bold text-zinc-200">
                {usuarios.filter((u) => u.rol === 'admin').length}
              </span>
            </div>
          </div>

          <div 
            onClick={() => onNavigateTab('solicitudes')}
            className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 cursor-pointer transition-colors text-xs space-y-1"
          >
            <div className="flex items-center justify-between text-amber-400 font-bold">
              <span className="flex items-center gap-1 text-[11px]">
                <Layers className="w-3.5 h-3.5" />
                Historial de Solicitudes
              </span>
              <span className="text-[10px]">{solicitudes.length} en total</span>
            </div>
            <p className="text-[10px] text-zinc-400 leading-tight">
              Revisa autorizaciones previas, rechazos y motivos registrados por los técnicos.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Full Purge */}
      <ConfirmationModal
        isOpen={showPurgeModal}
        onClose={() => setShowPurgeModal(false)}
        onConfirm={handleExecutePurge}
        title="¿Restablecer y borrar datos de prueba?"
        message={`Esta acción eliminará de forma permanente:\n• ${testUsersCount} usuario(s) de prueba (tu cuenta ${currentUser?.email} se mantendrá intacta con rol Administrador)\n• ${totalTools} herramienta(s)\n• ${prestamos.length} registro(s) de préstamos y devoluciones\n• ${solicitudes.length} solicitud(es) de retiro\n• Notificaciones y transferencias asociadas.\n\n¿Deseas vaciar la base de datos para empezar de cero?`}
        confirmText="Sí, Eliminar Todo y Empezar de Cero"
        cancelText="Cancelar"
        isDestructive={true}
        isLoading={isPurging}
      />
    </div>
  );
};
