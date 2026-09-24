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
  Tag
} from 'lucide-react';
import { Prestamo, Herramienta } from '../../types';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all'); // all, Activo, Devuelto, Atrasado

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
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Salida</span>
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
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por técnico, herramienta o código..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
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
            <Plus className="w-3.5 h-3.5" />
            Registrar Salida
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLoans.map((loan) => {
            const isActivo = loan.estado === 'Activo';
            const isOverdue = isActivo && new Date(loan.fechaEstimadaDevolucion) < now;

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
                  <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                    {isActivo && (
                      <button
                        onClick={() => onOpenReturnModal(loan)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all shadow-md shadow-emerald-950/40"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Registrar Devolución
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
