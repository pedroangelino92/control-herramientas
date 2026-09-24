import React, { useState } from 'react';
import { 
  Wrench, 
  Search, 
  History, 
  UserCheck, 
  PackageCheck,
  Layers,
  Clock,
  Sparkles,
  Plus,
  Box,
  ArrowLeftRight,
  MapPin,
  AlertCircle
} from 'lucide-react';
import { Herramienta, Prestamo, SolicitudRetiro, TransferenciaCampo, Usuario, CondicionHerramienta } from '../../types';
import { AssignedTools } from './AssignedTools';
import { CatalogView } from './CatalogView';
import { MyLoanHistory } from './MyLoanHistory';
import { MySolicitudesView } from './MySolicitudesView';
import { SolicitudRetiroModal } from './SolicitudRetiroModal';
import { TransferInFieldModal } from './TransferInFieldModal';
import { IncomingTransferModal } from './IncomingTransferModal';
import { BarcodeModal } from '../common/BarcodeModal';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface TechnicianDashboardProps {
  herramientas: Herramienta[];
  prestamos: Prestamo[];
  solicitudes: SolicitudRetiro[];
  transferencias?: TransferenciaCampo[];
  usuarios?: Usuario[];
}

export type TechnicianTab = 'assigned' | 'catalog' | 'solicitudes' | 'history';

export const TechnicianDashboard: React.FC<TechnicianDashboardProps> = ({
  herramientas,
  prestamos,
  solicitudes,
  transferencias = [],
  usuarios = [],
}) => {
  const { currentUser, userProfile } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TechnicianTab>('assigned');

  // Withdrawal Cart state
  const [cart, setCart] = useState<Herramienta[]>([]);
  const [cartToolConditions, setCartToolConditions] = useState<
    Record<string, { estadoRetiro: CondicionHerramienta; observacionesRetiro: string }>
  >({});
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);

  // Field transfer states
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [toolToTransfer, setToolToTransfer] = useState<Herramienta | null>(null);
  const [incomingTransferToReview, setIncomingTransferToReview] = useState<TransferenciaCampo | null>(null);

  // Barcode modal state
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [selectedToolForBarcode, setSelectedToolForBarcode] = useState<Herramienta | null>(null);

  // Filter tools assigned to this technician
  const assignedTools = herramientas.filter(
    (h) =>
      h.tecnicoAsignadoUid === currentUser?.uid ||
      (userProfile && h.tecnicoAsignadoNombre === userProfile.nombre)
  );

  // Filter loans for this technician
  const myLoans = prestamos.filter(
    (p) =>
      p.tecnicoUid === currentUser?.uid ||
      (currentUser?.email && p.tecnicoEmail?.toLowerCase() === currentUser.email?.toLowerCase())
  );

  // Filter requests for this technician
  const mySolicitudes = solicitudes.filter(
    (s) =>
      s.tecnicoUid === currentUser?.uid ||
      (currentUser?.email && s.tecnicoEmail?.toLowerCase() === currentUser.email?.toLowerCase())
  );

  // Filter incoming transfers for this technician
  const incomingPendingTransfers = transferencias.filter(
    (t) => t.tecnicoReceptorUid === currentUser?.uid && t.estado === 'PendienteConfirmacion'
  );

  const pendingSolicitudesCount = mySolicitudes.filter((s) => s.estado === 'Pendiente').length;
  const activeLoans = myLoans.filter((l) => l.estado === 'Activo');

  // Cart operations
  const handleAddToCart = (tool: Herramienta) => {
    if (cart.some((item) => item.id === tool.id)) {
      showToast('info', 'Ya en la lista', `${tool.nombre} ya está en tu lista de retiro.`);
      return;
    }
    setCart((prev) => [...prev, tool]);
    setCartToolConditions((prev) => ({
      ...prev,
      [tool.id!]: {
        estadoRetiro: 'Buen estado',
        observacionesRetiro: '',
      },
    }));
    showToast('success', 'Agregada a la lista', `${tool.nombre} agregada para retiro.`);
  };

  const handleAddToCartWithCondition = (
    tool: Herramienta,
    condition: CondicionHerramienta,
    observations: string
  ) => {
    if (!cart.some((item) => item.id === tool.id)) {
      setCart((prev) => [...prev, tool]);
    }
    setCartToolConditions((prev) => ({
      ...prev,
      [tool.id!]: {
        estadoRetiro: condition,
        observacionesRetiro: observations,
      },
    }));
    showToast('success', 'Equipo registrado', `${tool.nombre} agregada en estado "${condition}".`);
  };

  const handleUpdateCondition = (
    toolId: string,
    condition: CondicionHerramienta,
    observations: string
  ) => {
    setCartToolConditions((prev) => ({
      ...prev,
      [toolId]: {
        estadoRetiro: condition,
        observacionesRetiro: observations,
      },
    }));
  };

  const handleRemoveFromCart = (toolId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== toolId));
  };

  const handleClearCart = () => {
    setCart([]);
    setCartToolConditions({});
  };

  const handleOpenBarcode = (tool: Herramienta) => {
    setSelectedToolForBarcode(tool);
    setBarcodeModalOpen(true);
  };

  const handleOpenNewRetiro = () => {
    setIsCartModalOpen(true);
  };

  const handleStartFieldTransfer = (tool: Herramienta) => {
    setToolToTransfer(tool);
    setIsTransferModalOpen(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 md:pb-8">
      {/* ========================================================================= */}
      {/* 1. INCOMING FIELD TRANSFERS BANNER (ALERT FOR RECIPIENT TECHNICIAN)       */}
      {/* ========================================================================= */}
      {incomingPendingTransfers.length > 0 && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/40 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-black flex items-center justify-center font-bold shrink-0 animate-bounce">
              <ArrowLeftRight className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                ¡Tienes {incomingPendingTransfers.length} traspaso(s) de herramienta en campo pendiente(s)!
              </h4>
              <p className="text-[11px] text-zinc-300 mt-0.5">
                {incomingPendingTransfers[0].tecnicoEmisorNombre} te está entregando "{incomingPendingTransfers[0].herramientaNombre}". Confirma la recepción con tu ubicación.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIncomingTransferToReview(incomingPendingTransfers[0])}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
          >
            <span>Ver y Recibir Herramienta</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. COMPACT STATUS STRIP - APROVECHA MEJOR EL ESPACIO                      */}
      {/* ========================================================================= */}
      <div className="bg-zinc-900/90 border border-zinc-800 p-2 sm:p-2.5 rounded-2xl flex items-center justify-between gap-2.5 shadow-lg">
        {/* Compact Counters */}
        <div className="flex items-center gap-2 flex-1">
          <button
            type="button"
            onClick={() => setActiveTab('assigned')}
            className={`flex-1 sm:flex-initial flex items-center justify-center sm:justify-start gap-2 px-3 py-2 rounded-xl border transition-all text-xs ${
              activeTab === 'assigned'
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 font-bold'
                : 'bg-zinc-950/80 border-zinc-800 text-zinc-300 hover:border-zinc-700'
            }`}
          >
            <PackageCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-[11px] sm:text-xs">En Posesión:</span>
            <span className="font-black text-amber-400 font-mono text-xs sm:text-sm">{assignedTools.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('solicitudes')}
            className={`flex-1 sm:flex-initial flex items-center justify-center sm:justify-start gap-2 px-3 py-2 rounded-xl border transition-all text-xs ${
              activeTab === 'solicitudes'
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 font-bold'
                : 'bg-zinc-950/80 border-zinc-800 text-zinc-300 hover:border-zinc-700'
            }`}
          >
            <Layers className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-[11px] sm:text-xs">Solicitudes:</span>
            <span className={`font-black font-mono text-xs sm:text-sm ${pendingSolicitudesCount > 0 ? 'text-amber-400' : 'text-zinc-400'}`}>
              {pendingSolicitudesCount > 0 ? `${pendingSolicitudesCount} pend.` : mySolicitudes.length}
            </span>
          </button>
        </div>

        {/* Desktop Quick Action */}
        <button
          onClick={handleOpenNewRetiro}
          className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-black text-xs rounded-xl transition-all shadow-md active:scale-95 shrink-0"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>+ Nuevo Retiro</span>
          {cart.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-black text-amber-400 text-[10px] font-black">
              {cart.length}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 3. DESKTOP NAVIGATION TABS (PC ONLY)                                      */}
      {/* ========================================================================= */}
      <div className="hidden md:flex bg-zinc-900 border border-zinc-800 p-1.5 rounded-2xl items-center justify-between shadow-lg">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('assigned')}
            className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'assigned'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <PackageCheck className="w-4 h-4" />
            <span>Mis Herramientas ({assignedTools.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all relative ${
              activeTab === 'catalog'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Catálogo de Almacén</span>
            {cart.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-black text-amber-400 text-[10px] font-black border border-amber-400">
                {cart.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('solicitudes')}
            className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all relative ${
              activeTab === 'solicitudes'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Mis Solicitudes de Retiro</span>
            {pendingSolicitudesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-black text-[10px] font-black">
                {pendingSolicitudesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Mi Historial de Préstamos</span>
          </button>
        </div>

        {/* Desktop Quick New Retiro Trigger */}
        <button
          onClick={handleOpenNewRetiro}
          className="flex items-center gap-2 py-2 px-3.5 bg-zinc-950 hover:bg-amber-500 hover:text-black border border-amber-500/40 text-amber-400 rounded-xl text-xs font-bold transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Solicitar Retiro {cart.length > 0 ? `(${cart.length})` : ''}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 4. ACTIVE VIEW CONTENT                                                    */}
      {/* ========================================================================= */}
      <div className="animate-in fade-in duration-200">
        {activeTab === 'assigned' && (
          <AssignedTools
            assignedTools={assignedTools}
            activeLoans={activeLoans}
            onViewBarcode={handleOpenBarcode}
            onStartTransferInField={handleStartFieldTransfer}
          />
        )}

        {activeTab === 'catalog' && (
          <CatalogView
            herramientas={herramientas}
            cart={cart}
            onAddToCart={handleAddToCart}
            onAddToCartWithCondition={handleAddToCartWithCondition}
            onRemoveFromCart={handleRemoveFromCart}
            onOpenCartModal={() => setIsCartModalOpen(true)}
            onViewBarcode={handleOpenBarcode}
          />
        )}

        {activeTab === 'solicitudes' && (
          <MySolicitudesView
            solicitudes={mySolicitudes}
            onGoToCatalog={() => setActiveTab('catalog')}
          />
        )}

        {activeTab === 'history' && (
          <MyLoanHistory prestamos={myLoans} />
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. FIXED BOTTOM NAVIGATION BAR FOR MOBILE                                 */}
      {/* ========================================================================= */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800/90 shadow-2xl pb-[env(safe-area-inset-bottom,0px)]">
        <div className="max-w-md mx-auto px-3 py-1 flex items-center justify-between relative">
          
          {/* Button 1: Mis Herramientas Asignadas */}
          <button
            type="button"
            onClick={() => setActiveTab('assigned')}
            className={`flex-1 flex flex-col items-center justify-center py-2 transition-colors relative ${
              activeTab === 'assigned' ? 'text-amber-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <div className="relative">
              <PackageCheck className="w-5 h-5" />
              {assignedTools.length > 0 && (
                <span className="absolute -top-1 -right-2 px-1 text-[9px] font-black rounded-full bg-zinc-800 text-amber-400 border border-zinc-700">
                  {assignedTools.length}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 tracking-tight">Equipos</span>
            {activeTab === 'assigned' && (
              <span className="w-1 h-1 rounded-full bg-amber-400 mt-0.5" />
            )}
          </button>

          {/* Button 2: Mis Solicitudes de Retiro */}
          <button
            type="button"
            onClick={() => setActiveTab('solicitudes')}
            className={`flex-1 flex flex-col items-center justify-center py-2 transition-colors relative ${
              activeTab === 'solicitudes' ? 'text-amber-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <div className="relative">
              <Layers className="w-5 h-5" />
              {pendingSolicitudesCount > 0 && (
                <span className="absolute -top-1 -right-2.5 px-1 py-0.2 text-[9px] font-black rounded-full bg-amber-500 text-black animate-pulse">
                  {pendingSolicitudesCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 tracking-tight">Solicitudes</span>
            {activeTab === 'solicitudes' && (
              <span className="w-1 h-1 rounded-full bg-amber-400 mt-0.5" />
            )}
          </button>

          {/* CENTER ELEVATED '+' BUTTON: NUEVO RETIRO */}
          <div className="flex-1 flex flex-col items-center justify-center relative -top-3">
            <button
              type="button"
              onClick={handleOpenNewRetiro}
              aria-label="Hacer un retiro nuevo de herramientas"
              className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 text-black shadow-xl shadow-amber-500/40 border-4 border-zinc-950 flex flex-col items-center justify-center hover:scale-105 active:scale-95 transition-all relative"
            >
              <Plus className="w-7 h-7 stroke-[3] text-black" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-black text-amber-400 text-[10px] font-black border-2 border-amber-400 shadow-md animate-bounce">
                  {cart.length}
                </span>
              )}
            </button>
            <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider mt-0.5">
              + Retiro
            </span>
          </div>

          {/* Button 3: Catálogo Almacén */}
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`flex-1 flex flex-col items-center justify-center py-2 transition-colors relative ${
              activeTab === 'catalog' ? 'text-amber-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Search className="w-5 h-5" />
            <span className="text-[10px] mt-1 tracking-tight">Almacén</span>
            {activeTab === 'catalog' && (
              <span className="w-1 h-1 rounded-full bg-amber-400 mt-0.5" />
            )}
          </button>

          {/* Button 4: Historial de Préstamos */}
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex flex-col items-center justify-center py-2 transition-colors relative ${
              activeTab === 'history' ? 'text-amber-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <History className="w-5 h-5" />
            <span className="text-[10px] mt-1 tracking-tight">Historial</span>
            {activeTab === 'history' && (
              <span className="w-1 h-1 rounded-full bg-amber-400 mt-0.5" />
            )}
          </button>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. MODALS                                                                 */}
      {/* ========================================================================= */}
      <SolicitudRetiroModal
        isOpen={isCartModalOpen}
        onClose={() => setIsCartModalOpen(false)}
        cart={cart}
        allTools={herramientas}
        onAddToCart={handleAddToCart}
        onRemoveFromCart={handleRemoveFromCart}
        onClearCart={handleClearCart}
        onSuccessSubmit={() => setActiveTab('solicitudes')}
        savedToolConditions={cartToolConditions}
        onUpdateCondition={handleUpdateCondition}
      />

      <TransferInFieldModal
        isOpen={isTransferModalOpen}
        onClose={() => {
          setIsTransferModalOpen(false);
          setToolToTransfer(null);
        }}
        tool={toolToTransfer}
        activeLoans={activeLoans}
        usuarios={usuarios}
        onSuccess={() => setActiveTab('assigned')}
      />

      <IncomingTransferModal
        isOpen={!!incomingTransferToReview}
        onClose={() => setIncomingTransferToReview(null)}
        transferencia={incomingTransferToReview}
        onSuccess={() => setActiveTab('assigned')}
      />

      <BarcodeModal
        isOpen={barcodeModalOpen}
        onClose={() => {
          setBarcodeModalOpen(false);
          setSelectedToolForBarcode(null);
        }}
        herramienta={selectedToolForBarcode}
      />
    </div>
  );
};
