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
  onSwitchToTechnician?: () => void;
}

export type AdminTab = 'summary' | 'inventory' | 'loans' | 'solicitudes' | 'geo_audit' | 'users';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  herramientas,
  prestamos,
  usuarios,
  solicitudes,
  transferencias = [],
  onOpenQuickScanner,
  onSwitchToTechnician,
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
    <div className="space-y-4 sm:space-y-6 pb-14">
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
      {/* BOTTOM NAVIGATION BAR (THUMB-FRIENDLY APP BAR FOR MOBILE & DESKTOP)       */}
      {/* ========================================================================= */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/90 shadow-2xl block"
        aria-label="Navegación de administrador"
      >
        <div className="flex items-center justify-around px-2 py-1.5 max-w-xl mx-auto">
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

          {/* 7. Retirar / Modo Técnico */}
          {onSwitchToTechnician && (
            <button
              type="button"
              onClick={onSwitchToTechnician}
              className="flex-1 min-w-[50px] flex flex-col items-center justify-center py-1 rounded-xl transition-all text-amber-400 hover:text-amber-300 font-bold bg-amber-500/10 border border-amber-500/30"
              title="Retirar herramientas y gestionar traspasos en campo como técnico"
            >
              <Wrench className="w-4 h-4 text-amber-400" />
              <span className="text-[10px] mt-0.5 tracking-tight">Retirar</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );
};
