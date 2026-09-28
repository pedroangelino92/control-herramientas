import React, { useState } from 'react';
import { 
  History, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Search,
  Wrench,
  RotateCcw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Prestamo } from '../../types';

interface MyLoanHistoryProps {
  prestamos: Prestamo[];
}

export const MyLoanHistory: React.FC<MyLoanHistoryProps> = ({ prestamos }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterState, setFilterState] = useState<'all' | 'Activo' | 'Devuelto'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filtered = prestamos.filter((p) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      p.herramientaNombre.toLowerCase().includes(term) ||
      p.herramientaCodigo.toLowerCase().includes(term);

    const matchesState = filterState === 'all' || p.estado === filterState;

    return matchesSearch && matchesState;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <History className="w-6 h-6 text-amber-400" />
          Mi Historial de Préstamos
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Registro cronológico de todas las herramientas que has retirado y devuelto
        </p>
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
              placeholder="Buscar en mi historial..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => {
                setFilterState('all');
                setCurrentPage(1);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filterState === 'all' ? 'bg-amber-500 text-black shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Todos ({prestamos.length})
            </button>
            <button
              onClick={() => {
                setFilterState('Activo');
                setCurrentPage(1);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filterState === 'Activo' ? 'bg-amber-500 text-black shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Activos ({prestamos.filter((p) => p.estado === 'Activo').length})
            </button>
            <button
              onClick={() => {
                setFilterState('Devuelto');
                setCurrentPage(1);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filterState === 'Devuelto' ? 'bg-amber-500 text-black shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Devueltos ({prestamos.filter((p) => p.estado === 'Devuelto').length})
            </button>
          </div>
        </div>
      </div>

      {/* Loan timeline list */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-800">
          <History className="w-12 h-12 text-zinc-600 mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-bold text-zinc-300">No hay movimientos registrados</h3>
          <p className="text-xs text-zinc-500 mt-1">
            {searchTerm
              ? 'No hay registros que coincidan con la búsqueda.'
              : 'Aún no se han registrado préstamos para tu cuenta.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginated.map((loan) => {
            const isActivo = loan.estado === 'Activo';

            return (
              <div
                key={loan.id}
                className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 shadow-lg transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        isActivo
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {isActivo ? <Clock className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {loan.herramientaCodigo}
                        </span>
                        <h4 className="font-bold text-white text-base">{loan.herramientaNombre}</h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-zinc-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                          <span>Retirado: {new Date(loan.fechaPrestamo).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-zinc-500" />
                          <span>
                            {isActivo ? 'Límite entrega: ' : 'Devuelto el: '}
                            <strong className="text-zinc-200">
                              {loan.fechaDevolucion
                                ? new Date(loan.fechaDevolucion).toLocaleDateString()
                                : new Date(loan.fechaEstimadaDevolucion).toLocaleDateString()}
                            </strong>
                          </span>
                        </div>
                        <div>
                          <span>Autorizado por: <strong className="text-zinc-300">{loan.adminNombre}</strong></span>
                        </div>
                      </div>

                      {(loan.observacionesEntrega || loan.observacionesDevolucion) && (
                        <div className="mt-2 text-xs text-zinc-400 bg-zinc-950 p-2 rounded-lg border border-zinc-800/80">
                          {loan.observacionesEntrega && (
                            <p>
                              <span className="text-zinc-500 font-medium">Nota salida:</span> {loan.observacionesEntrega} ({loan.condicionEntrega})
                            </p>
                          )}
                          {loan.observacionesDevolucion && (
                            <p className="mt-0.5">
                              <span className="text-zinc-500 font-medium">Nota devolución:</span> {loan.observacionesDevolucion} (Condición: {loan.condicionDevolucion})
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 self-start sm:self-center">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full ${
                        isActivo
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {isActivo ? 'En Uso Actualmente' : 'Devuelto al Almacén'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-zinc-800 text-xs">
              <span className="text-zinc-500 text-[11px]">
                Mostrando {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filtered.length)} de {filtered.length} registros
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
    </div>
  );
};
