import React, { useState } from 'react';
import { 
  BarChart3, 
  Wrench, 
  ArrowLeftRight, 
  Users, 
  Plus, 
  Clock, 
  ShieldCheck, 
  ScanBarcode, 
  Layers, 
  Sparkles, 
  AlertCircle,
  Compass,
  MapPin
} from 'lucide-react';
import { Herramienta, Prestamo, Usuario, SolicitudRetiro, TransferenciaCampo } from '../../types';
import { AdminSummary } from './AdminSummary';
import { ToolInventory } from './ToolInventory';
import { LoanManagement } from './LoanManagement';
import { UserManagement } from './UserManagement';
import { SolicitudesManagement } from './SolicitudesManagement';
import { GeoAuditView } from './GeoAuditView';
import { ToolFormModal } from './ToolFormModal';
import { NewLoanModal } from './NewLoanModal';
import { ReturnLoanModal } from './ReturnLoanModal';
import { BarcodeModal } from '../common/BarcodeModal';

interface AdminDashboardProps {
  herramientas: Herramienta[];
  prestamos: Prestamo[];
  usuarios: Usuario[];
  solicitudes: SolicitudRetiro[];
  transferencias?: TransferenciaCampo[];
  onOpenQuickScanner: () => void;
}

export type AdminTab = 'summary' | 'inventory' | 'loans' | 'solicitudes' | 'geo_audit' | 'users';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  herramientas,
  prestamos,
  usuarios,
  solicitudes,
  transferencias = [],
  onOpenQuickScanner,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('summary');

  // Modals state
  const [isToolModalOpen, setIsToolModalOpen] = useState(false);
  const [toolToEdit, setToolToEdit] = useState<Herramienta | null>(null);

  const [isNewLoanOpen, setIsNewLoanOpen] = useState(false);
  const [preSelectedToolForLoan, setPreSelectedToolForLoan] = useState<Herramienta | null>(null);

  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [prestamoToReturn, setPrestamoToReturn] = useState<Prestamo | null>(null);

  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [selectedToolForBarcode, setSelectedToolForBarcode] = useState<Herramienta | null>(null);

  const pendingUsersCount = usuarios.filter((u) => u.estado === 'pendiente').length;
  const pendingSolicitudesCount = solicitudes.filter((s) => s.estado === 'Pendiente').length;
  const pendingTransfersCount = transferencias.filter((t) => t.estado === 'PendienteConfirmacion').length;

  const handleOpenEdit = (tool: Herramienta) => {
    setToolToEdit(tool);
    setIsToolModalOpen(true);
  };

  const handleOpenBarcode = (tool: Herramienta) => {
    setSelectedToolForBarcode(tool);
    setIsBarcodeModalOpen(true);
  };

  const handleStartLoan = (tool: Herramienta) => {
    setPreSelectedToolForLoan(tool);
    setIsNewLoanOpen(true);
  };

  const handleStartReturn = (tool: Herramienta) => {
    const activeLoan = prestamos.find(
      (p) => p.herramientaId === tool.id && p.estado === 'Activo'
    );
    if (activeLoan) {
      setPrestamoToReturn(activeLoan);
      setIsReturnModalOpen(true);
    }
  };

  const handleOpenDirectReturn = (prestamo: Prestamo) => {
    setPrestamoToReturn(prestamo);
    setIsReturnModalOpen(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 md:pb-6">
      {/* PC Admin Top Banner / Fast Actions Header */}
      <div className="hidden lg:flex items-center justify-between p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Panel de Administración de Almacén (Vista de Escritorio)</h2>
            <p className="text-xs text-zinc-400">Control maestro de inventario, auditoría de geolocalización GPS y traspasos en campo</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {pendingSolicitudesCount > 0 && (
            <button
              onClick={() => setActiveTab('solicitudes')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500 text-black text-xs font-black shadow-lg shadow-amber-500/20 animate-pulse"
            >
              <Layers className="w-4 h-4" />
              <span>{pendingSolicitudesCount} Solicitud(es) por Autorizar</span>
            </button>
          )}

          <button
            onClick={() => {
              setToolToEdit(null);
              setIsToolModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-bold transition-colors"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Nueva Herramienta</span>
          </button>

          <button
            onClick={onOpenQuickScanner}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-bold transition-colors"
          >
            <ScanBarcode className="w-4 h-4 text-amber-400" />
            <span>Escanear Código</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="bg-zinc-900 border border-zinc-800 p-1 sm:p-1.5 rounded-2xl flex items-center justify-between overflow-x-auto shadow-lg">
        <div className="flex items-center gap-1 min-w-max w-full">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 sm:px-3.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'summary'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Métricas & Resumen</span>
          </button>

          {/* Solicitudes right after summary for instant access */}
          <button
            onClick={() => setActiveTab('solicitudes')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 sm:px-3.5 rounded-xl text-xs font-bold transition-all relative ${
              activeTab === 'solicitudes'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : pendingSolicitudesCount > 0
                ? 'text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Solicitudes de Retiro</span>
            {pendingSolicitudesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-black text-[10px] font-black animate-pulse">
                {pendingSolicitudesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 sm:px-3.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'inventory'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Inventario ({herramientas.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('loans')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 sm:px-3.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'loans'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Préstamos</span>
          </button>

          {/* Tab: Geolocalización & Auditoría GPS */}
          <button
            onClick={() => setActiveTab('geo_audit')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 sm:px-3.5 rounded-xl text-xs font-bold transition-all relative ${
              activeTab === 'geo_audit'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Trazabilidad GPS</span>
            {transferencias.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-cyan-500 text-black text-[10px] font-black">
                {transferencias.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 sm:px-3.5 rounded-xl text-xs font-bold transition-all relative ${
              activeTab === 'users'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Usuarios ({usuarios.length})</span>
            {pendingUsersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                {pendingUsersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="animate-in fade-in duration-200">
        {activeTab === 'summary' && (
          <AdminSummary
            herramientas={herramientas}
            prestamos={prestamos}
            usuarios={usuarios}
            solicitudes={solicitudes}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenNewToolModal={() => {
              setToolToEdit(null);
              setIsToolModalOpen(true);
            }}
            onOpenNewLoanModal={() => {
              setPreSelectedToolForLoan(null);
              setIsNewLoanOpen(true);
            }}
            onOpenQuickScanner={onOpenQuickScanner}
          />
        )}

        {activeTab === 'inventory' && (
          <ToolInventory
            herramientas={herramientas}
            onOpenNewToolModal={() => {
              setToolToEdit(null);
              setIsToolModalOpen(true);
            }}
            onEditTool={handleOpenEdit}
            onViewBarcode={handleOpenBarcode}
            onStartLoan={handleStartLoan}
            onStartReturn={handleStartReturn}
          />
        )}

        {activeTab === 'loans' && (
          <LoanManagement
            prestamos={prestamos}
            herramientas={herramientas}
            onOpenNewLoanModal={() => {
              setPreSelectedToolForLoan(null);
              setIsNewLoanOpen(true);
            }}
            onOpenReturnModal={handleOpenDirectReturn}
          />
        )}

        {activeTab === 'solicitudes' && (
          <SolicitudesManagement
            solicitudes={solicitudes}
            herramientas={herramientas}
          />
        )}

        {activeTab === 'geo_audit' && (
          <GeoAuditView
            prestamos={prestamos}
            solicitudes={solicitudes}
            transferencias={transferencias}
            herramientas={herramientas}
          />
        )}

        {activeTab === 'users' && (
          <UserManagement usuarios={usuarios} />
        )}
      </div>

      {/* Modals */}
      <ToolFormModal
        isOpen={isToolModalOpen}
        onClose={() => {
          setIsToolModalOpen(false);
          setToolToEdit(null);
        }}
        toolToEdit={toolToEdit}
      />

      <NewLoanModal
        isOpen={isNewLoanOpen}
        onClose={() => {
          setIsNewLoanOpen(false);
          setPreSelectedToolForLoan(null);
        }}
        herramientas={herramientas}
        usuarios={usuarios}
        preSelectedTool={preSelectedToolForLoan}
      />

      <ReturnLoanModal
        isOpen={isReturnModalOpen}
        onClose={() => {
          setIsReturnModalOpen(false);
          setPrestamoToReturn(null);
        }}
        prestamo={prestamoToReturn}
      />

      <BarcodeModal
        isOpen={isBarcodeModalOpen}
        onClose={() => {
          setIsBarcodeModalOpen(false);
          setSelectedToolForBarcode(null);
        }}
        herramienta={selectedToolForBarcode}
      />

      {/* ========================================================================= */}
      {/* MOBILE BOTTOM NAVIGATION BAR (THUMB-FRIENDLY APP BAR FOR TELEPHONES)      */}
      {/* ========================================================================= */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/90 shadow-2xl block md:hidden"
        aria-label="Navegación móvil de administrador"
      >
        <div className="flex items-center justify-around px-1 py-1.5 max-w-lg mx-auto">
          {/* 1. Resumen */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('summary');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex-1 min-w-[50px] flex flex-col items-center justify-center py-1 rounded-xl transition-all relative ${
              activeTab === 'summary'
                ? 'text-amber-400 font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span className="text-[10px] mt-0.5 tracking-tight">Resumen</span>
            {activeTab === 'summary' && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-0.5" />
            )}
          </button>

          {/* 2. Solicitudes */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('solicitudes');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex-1 min-w-[56px] flex flex-col items-center justify-center py-1 rounded-xl transition-all relative ${
              activeTab === 'solicitudes'
                ? 'text-amber-400 font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <div className="relative">
              <Layers className="w-4 h-4" />
              {pendingSolicitudesCount > 0 && (
                <span className="absolute -top-1.5 -right-2 px-1 py-0.2 text-[8px] font-black rounded-full bg-amber-500 text-black animate-pulse">
                  {pendingSolicitudesCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Solicitudes</span>
            {activeTab === 'solicitudes' && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-0.5" />
            )}
          </button>

          {/* 3. Inventario */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('inventory');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex-1 min-w-[50px] flex flex-col items-center justify-center py-1 rounded-xl transition-all relative ${
              activeTab === 'inventory'
                ? 'text-amber-400 font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span className="text-[10px] mt-0.5 tracking-tight">Almacén</span>
            {activeTab === 'inventory' && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-0.5" />
            )}
          </button>

          {/* 4. Préstamos */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('loans');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex-1 min-w-[50px] flex flex-col items-center justify-center py-1 rounded-xl transition-all relative ${
              activeTab === 'loans'
                ? 'text-amber-400 font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span className="text-[10px] mt-0.5 tracking-tight">Préstamos</span>
            {activeTab === 'loans' && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-0.5" />
            )}
          </button>

          {/* 5. GPS */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('geo_audit');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex-1 min-w-[48px] flex flex-col items-center justify-center py-1 rounded-xl transition-all relative ${
              activeTab === 'geo_audit'
                ? 'text-amber-400 font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <div className="relative">
              <Compass className="w-4 h-4" />
              {transferencias.length > 0 && (
                <span className="absolute -top-1.5 -right-2 px-1 py-0.2 text-[8px] font-black rounded-full bg-cyan-500 text-black">
                  {transferencias.length}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">GPS</span>
            {activeTab === 'geo_audit' && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-0.5" />
            )}
          </button>

          {/* 6. Usuarios */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('users');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex-1 min-w-[48px] flex flex-col items-center justify-center py-1 rounded-xl transition-all relative ${
              activeTab === 'users'
                ? 'text-amber-400 font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <div className="relative">
              <Users className="w-4 h-4" />
              {pendingUsersCount > 0 && (
                <span className="absolute -top-1.5 -right-2 px-1 py-0.2 text-[8px] font-black rounded-full bg-rose-500 text-white">
                  {pendingUsersCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Usuarios</span>
            {activeTab === 'users' && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-0.5" />
            )}
          </button>
        </div>
      </nav>
    </div>
  );
};
