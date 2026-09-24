import React from 'react';
import { X, Printer, QrCode, Tag, Check, Copy } from 'lucide-react';
import { Herramienta } from '../../types';

interface BarcodeModalProps {
  herramienta: Herramienta | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BarcodeModal: React.FC<BarcodeModalProps> = ({ herramienta, isOpen, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !herramienta) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(herramienta.codigo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl text-zinc-100"
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4 text-amber-400">
          <Tag className="w-5 h-5" />
          <h3 className="text-lg font-bold text-white">Etiqueta e Identificación</h3>
        </div>

        {/* Printable Label Section */}
        <div 
          id="printable-label"
          className="p-5 bg-white text-zinc-900 rounded-xl border border-zinc-300 shadow-inner flex flex-col items-center text-center space-y-3"
        >
          <div className="text-xs uppercase font-extrabold tracking-wider text-zinc-500 border-b border-zinc-200 w-full pb-1">
            Control de Herramientas • Almacén Central
          </div>
          
          <div className="text-center">
            <h4 className="font-bold text-base text-zinc-900 leading-tight">{herramienta.nombre}</h4>
            <p className="text-xs text-zinc-600 mt-0.5">
              {herramienta.marca} • {herramienta.modelo}
            </p>
          </div>

          {/* Barcode CSS Graphic */}
          <div className="w-full flex flex-col items-center py-2 bg-zinc-50 rounded-lg border border-zinc-200">
            <div className="flex items-center justify-center gap-1 h-14 px-4 overflow-hidden" aria-hidden="true">
              {herramienta.codigo.split('').map((char, index) => {
                const charCode = char.charCodeAt(0);
                const width = (charCode % 4) + 1.5;
                const isGap = index % 3 === 0;
                return (
                  <div 
                    key={index}
                    className="h-full bg-black"
                    style={{ 
                      width: `${width * 2}px`, 
                      marginRight: isGap ? '3px' : '1px' 
                    }} 
                  />
                );
              })}
              {/* Padding bars for realistic barcode aesthetic */}
              <div className="h-full w-1 bg-black" />
              <div className="h-full w-0.5 bg-black ml-1" />
              <div className="h-full w-2 bg-black ml-0.5" />
            </div>
            <p className="font-mono text-sm tracking-widest font-bold text-zinc-900 mt-1">
              *{herramienta.codigo}*
            </p>
          </div>

          <div className="grid grid-cols-2 w-full text-left text-xs gap-2 pt-1 border-t border-zinc-200 text-zinc-700">
            <div>
              <span className="font-semibold text-zinc-900 block">Ubicación:</span>
              <span className="truncate block">{herramienta.ubicacion || 'Almacén general'}</span>
            </div>
            <div>
              <span className="font-semibold text-zinc-900 block">Categoría:</span>
              <span className="truncate block">{herramienta.categoria}</span>
            </div>
          </div>
        </div>

        {/* Buttons & Actions */}
        <div className="mt-6 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={handleCopyCode}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-800 text-sm font-medium text-zinc-200 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? '¡Código Copiado!' : 'Copiar Código'}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold shadow-lg shadow-amber-500/20 transition-all"
          >
            <Printer className="w-4 h-4" />
            Imprimir Etiqueta
          </button>
        </div>
      </div>
    </div>
  );
};
