import React, { useState } from 'react';
import { 
  ArrowLeftRight, 
  Search, 
  Plus, 
  RotateCcw, 
  Calendar, 
  User, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Printer, 
  Download,
  Tag,
  UserPlus,
  Trash2,
  Lock,
  ChevronLeft,
  ChevronRight,
  CalendarPlus,
  Check,
  X
} from 'lucide-react';
import { Prestamo, Herramienta, SUPERADMIN_EMAIL } from '../../types';
import { deletePrestamo, extenderFechaPrestamo, confirmarAlertaVencimiento } from '../../services/toolService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { ConfirmationModal } from '../common/ConfirmationModal';

interface LoanManagementProps {
  prestamos: Prestamo[];
  herramientas: Herramienta[];
  onOpenNewLoanModal: () => void;
  onOpenReturnModal: (prestamo: Prestamo) => void;
}

export const LoanManagement: React.FC<LoanManagementProps> = ({
  prestamos,
  herramientas,
  onOpenNewLoanModal,
  onOpenReturnModal,
}) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const isSuperAdmin = currentUser?.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all'); // all, Activo, Devuelto, Atrasado
  const [loanToDelete, setLoanToDelete] = useState<Prestamo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Estados para extender fecha de devolución
  const [loanToExtend, setLoanToExtend] = useState<Prestamo | null>(null);
  const [newExtendDueDate, setNewExtendDueDate] = useState<string>('');
  const [isExtending, setIsExtending] = useState(false);
  const [processingOkLoanId, setProcessingOkLoanId] = useState<string | null>(null);

  const handleOpenExtendModal = (loan: Prestamo) => {
    setLoanToExtend(loan);
    // Sugerir +3 días o fecha actual + 3 días
    const baseDate = new Date(loan.fechaEstimadaDevolucion);
    const validBase = isNaN(baseDate.getTime()) ? new Date() : baseDate;
    const defaultNewDate = new Date(Math.max(validBase.getTime(), Date.now()) + 3 * 24 * 60 * 60 * 1000);
    setNewExtendDueDate(defaultNewDate.toISOString().slice(0, 10));
  };

  const handleConfirmExtend = async () => {
    if (!loanToExtend || !loanToExtend.id || !newExtendDueDate) return;
    setIsExtending(true);
    try {
      await extenderFechaPrestamo(
        loanToExtend.id,
        new Date(newExtendDueDate + 'T23:59:59').toISOString(),
        currentUser?.uid || 'admin',
        currentUser?.displayName || 'Administrador'
      );
      showToast('success', 'Fecha de Devolución Extendida', `La nueva fecha límite es ${new Date(newExtendDueDate + 'T23:59:59').toLocaleDateString()}. Las alertas diarias quedan pausadas hasta que llegue este día.`);
      setLoanToExtend(null);
    } catch (err: any) {
      showToast('error', 'Error al extender fecha', err.message || 'No se pudo actualizar.');
    } finally {
      setIsExtending(false);
    }
  };

  const handleAcknowledgeAlert = async (loan: Prestamo) => {
    if (!loan.id) return;
    setProcessingOkLoanId(loan.id);
    try {
      await confirmarAlertaVencimiento(loan.id);
      showToast('info', 'Alerta Confirmada (OK)', 'Se tomó conocimiento. Se te recordará nuevamente mañana si el equipo continúa sin devolverse.');
    } catch (err: any) {
      showToast('error', 'Error', err.message || 'No se pudo guardar la confirmación.');
    } finally {
      setProcessingOkLoanId(null);
    }
  };

  const handleDeleteLoan = async () => {
    if (!loanToDelete || !loanToDelete.id) return;
    if (!isSuperAdmin) {
      showToast('error', 'Permiso denegado', 'Solo el administrador principal puede eliminar registros.');
      return;
    }

    setIsDeleting(true);
    try {
      await deletePrestamo(loanToDelete.id, loanToDelete.herramientaId, loanToDelete.estado === 'Activo');
      showToast('success', 'Registro Eliminado', 'Se ha eliminado el registro de préstamo y actualizado el estado del equipo.');
      setLoanToDelete(null);
    } catch (err: any) {
      showToast('error', 'Error al eliminar', err.message || 'No se pudo eliminar el registro.');
    } finally {
      setIsDeleting(false);
    }
  };

  const now = new Date();

  // Filter loans
  const filteredLoans = prestamos.filter((loan) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      loan.herramientaNombre.toLowerCase().includes(term) ||
      loan.herramientaCodigo.toLowerCase().includes(term) ||
      loan.tecnicoNombre.toLowerCase().includes(term) ||
      loan.tecnicoEmail.toLowerCase().includes(term);

    const isOverdue = loan.estado === 'Activo' && new Date(loan.fechaEstimadaDevolucion) < now;
    const computedStatus = isOverdue ? 'Atrasado' : loan.estado;

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'Atrasado' && isOverdue) ||
      (filterStatus === loan.estado && (!isOverdue || filterStatus === 'Activo'));

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredLoans.length / itemsPerPage) || 1;
  const paginatedLoans = filteredLoans.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const activeCount = prestamos.filter((p) => p.estado === 'Activo').length;
  const overdueCount = prestamos.filter(
    (p) => p.estado === 'Activo' && new Date(p.fechaEstimadaDevolucion) < now
  ).length;

  const handleExportCSV = () => {
    const headers = [
      'ID Prestamo',
      'Codigo Herramienta',
      'Herramienta',
      'Tecnico',
      'Email Tecnico',
      'Autorizado Por',
      'Fecha Salida',
      'Fecha Estimada',
      'Fecha Devolucion',
      'Estado',
      'Condicion Entrega',
      'Condicion Retorno',
      'Observaciones'
    ];

    const rows = filteredLoans.map((p) => [
      p.id || '',
      `"${p.herramientaCodigo}"`,
      `"${p.herramientaNombre}"`,
      `"${p.tecnicoNombre}"`,
      `"${p.tecnicoEmail}"`,
      `"${p.adminNombre}"`,
      `"${new Date(p.fechaPrestamo).toLocaleString()}"`,
      `"${new Date(p.fechaEstimadaDevolucion).toLocaleString()}"`,
      p.fechaDevolucion ? `"${new Date(p.fechaDevolucion).toLocaleString()}"` : 'Pendiente',
      p.estado,
      p.condicionEntrega,
      p.condicionDevolucion || '—',
      `"${(p.observacionesEntrega || '') + ' ' + (p.observacionesDevolucion || '')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `historial_prestamos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header and action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-amber-400" />
            Control de Préstamos y Trazabilidad
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Registro histórico de salidas, entregas y devoluciones de equipos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 transition-colors"
            title="Exportar reporte en formato CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Exportar CSV</span>
          </button>

          <button
            onClick={onOpenNewLoanModal}
            className="flex items-center gap-2 px-3.5 sm:px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all shrink-0"
            title="Prestar herramienta a una persona interna de la empresa que no pertenece a nuestro departamento"
          >
            <UserPlus className="w-4 h-4" />
            <span>Prestar a usuario externo</span>
          </button>
        </div>
      </div>

      {/* Quick Summary Pill Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl">
          <span className="text-[11px] text-zinc-400 block font-medium">Total Préstamos</span>
          <span className="text-xl font-bold text-white mt-1 block">{prestamos.length}</span>
        </div>
        <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl">
          <span className="text-[11px] text-zinc-400 block font-medium">Préstamos Activos</span>
          <span className="text-xl font-bold text-amber-400 mt-1 block">{activeCount}</span>
        </div>
        <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl">
          <span className="text-[11px] text-zinc-400 block font-medium">Vencidos / Atrasados</span>
          <span className="text-xl font-bold text-rose-400 mt-1 block">{overdueCount}</span>
        </div>
        <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl">
          <span className="text-[11px] text-zinc-400 block font-medium">Devueltos al Almacén</span>
          <span className="text-xl font-bold text-emerald-400 mt-1 block">
            {prestamos.filter((p) => p.estado === 'Devuelto').length}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar por técnico, herramienta o código..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Todos los registros</option>
              <option value="Activo">Solo Préstamos Activos</option>
              <option value="Atrasado">Atrasados / Vencidos</option>
              <option value="Devuelto">Devueltos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Loans List */}
      {filteredLoans.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-800">
          <ArrowLeftRight className="w-12 h-12 text-zinc-600 mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-bold text-zinc-300">No hay movimientos registrados</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            {searchTerm || filterStatus !== 'all'
              ? 'No se encontraron préstamos que coincidan con los filtros actuales.'
              : 'Registra la primera salida de herramienta para comenzar la trazabilidad.'}
          </p>
          <button
            onClick={onOpenNewLoanModal}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Prestar a usuario externo
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedLoans.map((loan) => {
            const isActivo = loan.estado === 'Activo';
            const isOverdue = isActivo && new Date(loan.fechaEstimadaDevolucion) < now;
            const isOwnLoan = 
              loan.tecnicoUid === currentUser?.uid ||
              (!!loan.tecnicoEmail && !!currentUser?.email && loan.tecnicoEmail.toLowerCase() === currentUser.email.toLowerCase());
            const canReturnThisLoan = isSuperAdmin || !isOwnLoan;

            return (
              <div
                key={loan.id}
                className={`bg-zinc-900 border rounded-2xl p-4 sm:p-5 shadow-lg transition-all ${
                  isOverdue
                    ? 'border-rose-900/50 hover:border-rose-700 bg-rose-950/10'
                    : isActivo
                    ? 'border-amber-900/40 hover:border-amber-700 bg-zinc-900'
                    : 'border-zinc-800 hover:border-zinc-700 opacity-90'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Left: Tool and Tech Details */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                        isOverdue
                          ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                          : isActivo
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {isOverdue ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : isActivo ? (
                        <Clock className="w-5 h-5" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {loan.herramientaCodigo}
                        </span>
                        <h4 className="text-base font-bold text-white truncate">
                          {loan.herramientaNombre}
                        </h4>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            isOverdue
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : isActivo
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {isOverdue ? 'Atrasado / Vencido' : loan.estado}
                        </span>

                        {isOwnLoan && isActivo && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                            <Lock className="w-3 h-3 text-blue-400" />
                            Retirado por ti
                          </span>
                        )}
                      </div>

                      {/* Details row */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 text-xs text-zinc-400">
                        <div className="flex items-center gap-1.5 truncate">
                          <User className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          <span>
                            Técnico: <strong className="text-zinc-200">{loan.tecnicoNombre}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          <span>Retiro: {new Date(loan.fechaPrestamo).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          <span>
                            {isActivo ? 'Límite: ' : 'Devuelto: '}
                            <strong className={isOverdue ? 'text-rose-400' : 'text-zinc-300'}>
                              {loan.fechaDevolucion
                                ? new Date(loan.fechaDevolucion).toLocaleDateString()
                                : new Date(loan.fechaEstimadaDevolucion).toLocaleDateString()}
                            </strong>
                          </span>
                        </div>
                      </div>

                      {/* Observations / condition note */}
                      {(loan.observacionesEntrega || loan.observacionesDevolucion) && (
                        <div className="mt-2.5 p-2 rounded-lg bg-zinc-950/80 border border-zinc-800 text-[11px] text-zinc-300 space-y-1">
                          {loan.observacionesEntrega && (
                            <p>
                              <span className="text-zinc-500 font-semibold">Salida:</span> {loan.observacionesEntrega} ({loan.condicionEntrega})
                            </p>
                          )}
                          {loan.observacionesDevolucion && (
                            <p>
                              <span className="text-zinc-500 font-semibold">Devolución:</span> {loan.observacionesDevolucion} (Estado: {loan.condicionDevolucion})
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end lg:self-center flex-wrap justify-end">
                    {isActivo && (
                      <>
                        {/* Botón Extender Fecha */}
                        <button
                          type="button"
                          onClick={() => handleOpenExtendModal(loan)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-amber-300 hover:text-amber-200 text-xs font-bold transition-all shadow"
                          title="Extender fecha límite de devolución para pausar las alertas"
                        >
                          <CalendarPlus className="w-3.5 h-3.5 text-amber-400" />
                          <span>Extender fecha</span>
                        </button>

                        {/* Botón OK de confirmación de alerta diaria si está vencido/cumplido */}
                        {isOverdue && (
                          <button
                            type="button"
                            onClick={() => handleAcknowledgeAlert(loan)}
                            disabled={processingOkLoanId === loan.id}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                              loan.alertaVencimientoOk && loan.ultimaAlertaVencimiento === new Date().toISOString().slice(0, 10)
                                ? 'bg-zinc-800/80 border-emerald-500/30 text-emerald-400'
                                : 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40 text-amber-300'
                            }`}
                            title="Confirmar visto bueno por hoy (alerta se mantendrá diariamente)"
                          >
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>
                              {loan.alertaVencimientoOk && loan.ultimaAlertaVencimiento === new Date().toISOString().slice(0, 10)
                                ? 'OK (Avisado hoy)'
                                : 'Dar OK'}
                            </span>
                          </button>
                        )}

                        {!canReturnThisLoan ? (
                          <button
                            type="button"
                            disabled
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800/80 border border-zinc-700/80 text-zinc-500 text-xs font-bold cursor-not-allowed opacity-75"
                            title="No puedes auto-recibir tus propias herramientas. Debe recibirlo otro administrador o el superadmin."
                          >
                            <Lock className="w-3.5 h-3.5" />
                            Requiere otro admin
                          </button>
                        ) : (
                          <button
                            onClick={() => onOpenReturnModal(loan)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all shadow-md shadow-emerald-950/40"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Registrar Devolución
                          </button>
                        )}
                      </>
                    )}

                    {isSuperAdmin && (
                      <button
                        onClick={() => setLoanToDelete(loan)}
                        className="p-2 rounded-xl bg-zinc-900 hover:bg-rose-950/50 border border-zinc-800 hover:border-rose-500/50 text-zinc-500 hover:text-rose-400 transition-colors"
                        title="Eliminar registro de préstamo (Solo admin)"
                        aria-label="Eliminar registro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-zinc-800 text-xs">
              <span className="text-zinc-500 text-[11px]">
                Mostrando {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredLoans.length)} de {filteredLoans.length} registros
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>
                <span className="px-2 text-zinc-400 font-bold">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 text-xs"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for loan record deletion */}
      <ConfirmationModal
        isOpen={Boolean(loanToDelete)}
        onClose={() => setLoanToDelete(null)}
        onConfirm={handleDeleteLoan}
        title="Eliminar Registro de Préstamo"
        message={`¿Estás seguro de que deseas eliminar este registro de préstamo de "${loanToDelete?.herramientaNombre}" (${loanToDelete?.herramientaCodigo})? Si el préstamo se encuentra activo, el equipo volverá a estar disponible.`}
        confirmText="Eliminar Registro"
        cancelText="Cancelar"
        isDestructive={true}
        isLoading={isDeleting}
      />

      {/* Modal para Extender Fecha de Devolución */}
      {loanToExtend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <CalendarPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Extender Fecha de Devolución</h3>
                  <p className="text-xs text-zinc-400">Pausa las notificaciones diarias hasta la nueva fecha</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLoanToExtend(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1 text-xs">
              <p className="font-bold text-white truncate">{loanToExtend.herramientaNombre}</p>
              <p className="text-zinc-400 font-mono text-[11px]">{loanToExtend.herramientaCodigo} • Técnico: {loanToExtend.tecnicoNombre}</p>
              <p className="text-amber-400 text-[11px] pt-1">
                Límite actual: {new Date(loanToExtend.fechaEstimadaDevolucion).toLocaleDateString()}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-300">
                Nueva fecha límite de entrega:
              </label>
              <input
                type="date"
                value={newExtendDueDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setNewExtendDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
                required
              />
              <p className="text-[11px] text-zinc-500 leading-tight">
                Al guardar, la alerta se suspenderá automáticamente. Si llega esta nueva fecha y aún no se devuelve, la app volverá a notificarte una vez por día.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setLoanToExtend(null)}
                disabled={isExtending}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmExtend}
                disabled={isExtending || !newExtendDueDate}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {isExtending ? 'Guardando...' : 'Confirmar Nueva Fecha'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
