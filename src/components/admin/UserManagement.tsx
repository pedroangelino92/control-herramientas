import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  ShieldCheck, 
  UserCheck, 
  Clock, 
  XCircle, 
  Check, 
  X, 
  AlertCircle,
  MoreVertical,
  Mail,
  Phone,
  Calendar
} from 'lucide-react';
import { Usuario, RolUsuario, EstadoUsuario } from '../../types';
import { updateUsuarioRolAndEstado } from '../../services/toolService';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { ConfirmationModal } from '../common/ConfirmationModal';

interface UserManagementProps {
  usuarios: Usuario[];
}

export const UserManagement: React.FC<UserManagementProps> = ({ usuarios }) => {
  const { userProfile, currentUser } = useAuth();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'pending' | 'tecnico' | 'admin'>('all');

  // Modal confirmation state
  const [actionUser, setActionUser] = useState<Usuario | null>(null);
  const [actionType, setActionType] = useState<'approve_tech' | 'approve_admin' | 'make_admin' | 'make_tech' | 'reject' | null>(null);
  const [processing, setProcessing] = useState(false);

  const pendingCount = usuarios.filter((u) => u.estado === 'pendiente').length;

  const filteredUsers = usuarios.filter((user) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      user.nombre.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      (user.telefono && user.telefono.toLowerCase().includes(term));

    if (filterRole === 'pending') return matchesSearch && user.estado === 'pendiente';
    if (filterRole === 'tecnico') return matchesSearch && user.rol === 'tecnico' && user.estado === 'activo';
    if (filterRole === 'admin') return matchesSearch && user.rol === 'admin' && user.estado === 'activo';

    return matchesSearch;
  });

  const handleExecuteAction = async () => {
    if (!actionUser || !actionType) return;
    setProcessing(true);

    const adminName = userProfile?.nombre || currentUser?.email || 'Administrador';

    try {
      if (actionType === 'approve_tech') {
        await updateUsuarioRolAndEstado(actionUser.uid, 'activo', 'tecnico', adminName);
        showToast('success', 'Cuenta Aprobada', `${actionUser.nombre} ahora tiene acceso como Técnico.`);
      } else if (actionType === 'approve_admin') {
        await updateUsuarioRolAndEstado(actionUser.uid, 'activo', 'admin', adminName);
        showToast('success', 'Administrador Aprobado', `${actionUser.nombre} ahora tiene permisos de Administrador.`);
      } else if (actionType === 'make_admin') {
        await updateUsuarioRolAndEstado(actionUser.uid, 'activo', 'admin', adminName);
        showToast('success', 'Rol Actualizado', `${actionUser.nombre} ahora es Administrador.`);
      } else if (actionType === 'make_tech') {
        await updateUsuarioRolAndEstado(actionUser.uid, 'activo', 'tecnico', adminName);
        showToast('success', 'Rol Actualizado', `${actionUser.nombre} ahora es Técnico.`);
      } else if (actionType === 'reject') {
        await updateUsuarioRolAndEstado(actionUser.uid, 'rechazado', actionUser.rol, adminName);
        showToast('info', 'Cuenta Rechazada', `Se ha denegado el acceso a ${actionUser.nombre}.`);
      }

      setActionUser(null);
      setActionType(null);
    } catch (err: any) {
      showToast('error', 'Error en la actualización', err.message || 'Error al actualizar usuario.');
    } finally {
      setProcessing(false);
    }
  };

  const getConfirmationDetails = () => {
    if (!actionUser || !actionType) return { title: '', message: '', isDestructive: false, confirmText: '' };

    switch (actionType) {
      case 'approve_tech':
        return {
          title: 'Aprobar como Técnico',
          message: `¿Deseas autorizar la cuenta de ${actionUser.nombre} (${actionUser.email}) con el rol de Técnico? Podrá consultar el inventario y solicitar herramientas.`,
          isDestructive: false,
          confirmText: 'Aprobar Técnico',
        };
      case 'approve_admin':
        return {
          title: 'Aprobar como Administrador',
          message: `¿Estás seguro de otorgar rol de Administrador a ${actionUser.nombre}? Tendrá acceso completo a modificar inventarios, usuarios y préstamos.`,
          isDestructive: false,
          confirmText: 'Aprobar Administrador',
        };
      case 'make_admin':
        return {
          title: 'Promover a Administrador',
          message: `¿Deseas cambiar el rol de ${actionUser.nombre} a Administrador con acceso total al sistema?`,
          isDestructive: false,
          confirmText: 'Cambiar a Admin',
        };
      case 'make_tech':
        return {
          title: 'Cambiar a Técnico',
          message: `¿Deseas cambiar el rol de ${actionUser.nombre} a Técnico estándar?`,
          isDestructive: false,
          confirmText: 'Cambiar a Técnico',
        };
      case 'reject':
        return {
          title: 'Rechazar / Suspender Acceso',
          message: `¿Deseas suspender o rechazar la cuenta de ${actionUser.nombre}? El usuario no podrá ingresar al sistema.`,
          isDestructive: true,
          confirmText: 'Rechazar Acceso',
        };
    }
  };

  const confirmModalInfo = getConfirmationDetails();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-400" />
            Gestión de Usuarios y Permisos
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {usuarios.length} usuarios registrados en la plataforma
          </p>
        </div>

        {pendingCount > 0 && (
          <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>{pendingCount} solicitud(es) pendiente(s) de aprobación</span>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre o correo electrónico..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 overflow-x-auto">
            <button
              onClick={() => setFilterRole('all')}
              className={`flex-1 min-w-[70px] py-1.5 px-3 text-xs font-semibold rounded-lg transition-all ${
                filterRole === 'all' ? 'bg-amber-500 text-black shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Todos ({usuarios.length})
            </button>
            <button
              onClick={() => setFilterRole('pending')}
              className={`flex-1 min-w-[80px] py-1.5 px-3 text-xs font-semibold rounded-lg transition-all relative ${
                filterRole === 'pending' ? 'bg-amber-500 text-black shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Pendientes
              {pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px]">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilterRole('tecnico')}
              className={`flex-1 min-w-[70px] py-1.5 px-3 text-xs font-semibold rounded-lg transition-all ${
                filterRole === 'tecnico' ? 'bg-amber-500 text-black shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Técnicos
            </button>
            <button
              onClick={() => setFilterRole('admin')}
              className={`flex-1 min-w-[70px] py-1.5 px-3 text-xs font-semibold rounded-lg transition-all ${
                filterRole === 'admin' ? 'bg-amber-500 text-black shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Admins
            </button>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredUsers.map((user) => {
          const isUserPending = user.estado === 'pendiente';
          const isUserActive = user.estado === 'activo';
          const isUserRejected = user.estado === 'rechazado';
          const isUserAdmin = user.rol === 'admin';
          const isCurrentSelf = user.uid === currentUser?.uid;

          const isPermanentAdmin = user.email.toLowerCase() === 'pedroangelino92@gmail.com';

          return (
            <div
              key={user.uid}
              className={`bg-zinc-900 border rounded-2xl p-5 shadow-xl transition-all flex flex-col justify-between ${
                isUserPending
                  ? 'border-amber-500/40 bg-amber-500/[0.03]'
                  : 'border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div>
                {/* Header: Status and Role Badges */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    {isUserAdmin ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Administrador
                        {isPermanentAdmin && <span className="text-[9px] font-normal text-amber-400/70 ml-0.5">(Permanente)</span>}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <UserCheck className="w-3.5 h-3.5" />
                        Técnico
                      </span>
                    )}

                    {isCurrentSelf && (
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                        Tú
                      </span>
                    )}
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isUserPending
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : isUserActive
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {isUserPending ? 'Pendiente' : isUserActive ? 'Activo' : 'Rechazado'}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white mb-1">{user.nombre}</h3>

                <div className="space-y-1.5 text-xs text-zinc-400">
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>

                  {user.telefono && (
                    <div className="flex items-center gap-2 truncate">
                      <Phone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span>{user.telefono}</span>
                    </div>
                  )}

                  {user.fechaCreacion && (
                    <div className="flex items-center gap-2 truncate text-[11px] text-zinc-500">
                      <Calendar className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                      <span>Registrado: {new Date(user.fechaCreacion).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-zinc-800 flex items-center justify-between gap-2 flex-wrap">
                {isUserPending ? (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => {
                        setActionUser(user);
                        setActionType('approve_tech');
                      }}
                      className="flex-1 sm:flex-none px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl transition-all shadow flex items-center justify-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Aprobar Técnico
                    </button>
                    <button
                      onClick={() => {
                        setActionUser(user);
                        setActionType('approve_admin');
                      }}
                      className="flex-1 sm:flex-none px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl transition-all shadow flex items-center justify-center gap-1"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Aprobar Admin
                    </button>
                    <button
                      onClick={() => {
                        setActionUser(user);
                        setActionType('reject');
                      }}
                      className="p-1.5 bg-zinc-800 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 rounded-xl transition-colors"
                      title="Rechazar solicitud"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 w-full justify-between">
                    <div className="flex items-center gap-1.5">
                      {isUserAdmin ? (
                        <button
                          onClick={() => {
                            setActionUser(user);
                            setActionType('make_tech');
                          }}
                          disabled={isCurrentSelf || isPermanentAdmin}
                          className="px-2.5 py-1 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-40"
                          title={isPermanentAdmin ? 'El Administrador Principal no puede ser degradado' : 'Cambiar rol a técnico'}
                        >
                          Cambiar a Técnico
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setActionUser(user);
                            setActionType('make_admin');
                          }}
                          className="px-2.5 py-1 text-xs font-medium text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg transition-colors"
                          title="Promover a Administrador"
                        >
                          Hacer Admin
                        </button>
                      )}
                    </div>

                    {!isCurrentSelf && (
                      <button
                        onClick={() => {
                          setActionUser(user);
                          setActionType('reject');
                        }}
                        className="text-xs text-rose-400 hover:text-rose-300 hover:underline"
                      >
                        Suspender
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(actionUser && actionType)}
        onClose={() => {
          setActionUser(null);
          setActionType(null);
        }}
        onConfirm={handleExecuteAction}
        title={confirmModalInfo.title}
        message={confirmModalInfo.message}
        confirmText={confirmModalInfo.confirmText}
        cancelText="Cancelar"
        isDestructive={confirmModalInfo.isDestructive}
        isLoading={processing}
      />
    </div>
  );
};
