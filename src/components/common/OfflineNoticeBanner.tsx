import React from 'react';
import { WifiOff, AlertTriangle } from 'lucide-react';
import { useNetwork } from '../../contexts/NetworkContext';

export const OfflineNoticeBanner: React.FC = () => {
  const { isOnline } = useNetwork();

  if (isOnline) return null;

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-200 px-3 py-2 text-xs flex items-center justify-between gap-2 z-40 relative animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-2 max-w-full truncate">
        <span className="p-1 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
          <WifiOff className="w-3.5 h-3.5" />
        </span>
        <span className="truncate font-semibold text-[11px] sm:text-xs">
          <strong>Modo Consulta (Sin conexión a internet):</strong> Puedes revisar herramientas. Las aprobaciones y transferencias se habilitarán al recuperar señal.
        </span>
      </div>
      <span className="shrink-0 text-[10px] uppercase tracking-wider font-black px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-300 hidden sm:inline-block">
        Offline
      </span>
    </div>
  );
};
