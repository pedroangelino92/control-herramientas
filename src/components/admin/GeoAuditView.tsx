import React, { useState } from 'react';
import { 
  MapPin, 
  ExternalLink, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  ArrowLeftRight, 
  Package, 
  CheckCircle2, 
  User, 
  Search, 
  Wrench,
  Navigation,
  Compass
} from 'lucide-react';
import { Prestamo, SolicitudRetiro, TransferenciaCampo, Herramienta } from '../../types';
import { formatDistance, getGoogleMapsUrl, getGoogleMapsDirectionsUrl } from '../../services/geoService';

interface GeoAuditViewProps {
  prestamos: Prestamo[];
  solicitudes: SolicitudRetiro[];
  transferencias: TransferenciaCampo[];
  herramientas: Herramienta[];
}

export const GeoAuditView: React.FC<GeoAuditViewProps> = ({
  prestamos,
  solicitudes,
  transferencias,
  herramientas,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // 1. Compile all transactions with GPS data
  interface GeoTransaction {
    id: string;
    tipo: 'Retiro en Base' | 'Traspaso en Campo' | 'Devolución Almacén';
    nroRegistro: string;
    herramientaNombre: string;
    herramientaCodigo: string;
    persona1Rol: string;
    persona1Nombre: string;
    persona1Email: string;
    persona1Gps?: { latitude: number; longitude: number; accuracy?: number };
    persona2Rol: string;
    persona2Nombre: string;
    persona2Email: string;
    persona2Gps?: { latitude: number; longitude: number; accuracy?: number };
    distanciaMetros?: number;
    aprobadoEnPresencia?: boolean;
    fecha: string;
    detalles?: string;
  }

  const transactions: GeoTransaction[] = [];

  // From approved withdrawal requests / loans
  solicitudes
    .filter((s) => s.estado === 'Aprobada')
    .forEach((s) => {
      transactions.push({
        id: `sol-${s.id}`,
        tipo: 'Retiro en Base',
        nroRegistro: s.nroSolicitud,
        herramientaNombre: s.herramientas.map((h) => h.nombre).join(', '),
        herramientaCodigo: s.herramientas.map((h) => h.codigo).join(', '),
        persona1Rol: 'Técnico que Retira',
        persona1Nombre: s.tecnicoNombre,
        persona1Email: s.tecnicoEmail,
        persona1Gps: s.geoSolicitud,
        persona2Rol: 'Administrador que Aprueba',
        persona2Nombre: s.adminRespuestaNombre || 'Administrador',
        persona2Email: '',
        persona2Gps: s.geoAprobacion,
        distanciaMetros: s.distanciaAprobacionMetros,
        aprobadoEnPresencia: s.aprobadoEnPresencia,
        fecha: s.fechaRespuesta || s.fechaSolicitud,
        detalles: s.motivoUso ? `Motivo: ${s.motivoUso}` : undefined,
      });
    });

  // From Field transfers
  transferencias.forEach((t) => {
    transactions.push({
      id: `trf-${t.id}`,
      tipo: 'Traspaso en Campo',
      nroRegistro: t.nroTransferencia,
      herramientaNombre: t.herramientaNombre,
      herramientaCodigo: t.herramientaCodigo,
      persona1Rol: 'Técnico que Entrega',
      persona1Nombre: t.tecnicoEmisorNombre,
      persona1Email: t.tecnicoEmisorEmail,
      persona1Gps: t.geoEmisor,
      persona2Rol: 'Técnico que Recibe',
      persona2Nombre: t.tecnicoReceptorNombre,
      persona2Email: t.tecnicoReceptorEmail,
      persona2Gps: t.geoReceptor,
      distanciaMetros: t.distanciaMetros,
      aprobadoEnPresencia: t.distanciaMetros !== undefined ? t.distanciaMetros <= 250 : undefined,
      fecha: t.fechaConfirmacion || t.fechaInicio,
      detalles: `Estado: ${t.estado} • Condición: ${t.condicionEntrega}${t.observaciones ? ` • "${t.observaciones}"` : ''}`,
    });
  });

  // From returned loans with GPS
  prestamos
    .filter((p) => p.estado === 'Devuelto' && p.geoDevolucion)
    .forEach((p) => {
      transactions.push({
        id: `dev-${p.id}`,
        tipo: 'Devolución Almacén',
        nroRegistro: `DEV-${p.herramientaCodigo}`,
        herramientaNombre: p.herramientaNombre,
        herramientaCodigo: p.herramientaCodigo,
        persona1Rol: 'Técnico que Devuelve',
        persona1Nombre: p.tecnicoNombre,
        persona1Email: p.tecnicoEmail,
        persona1Gps: p.geoDevolucion,
        persona2Rol: 'Recibido por',
        persona2Nombre: p.recibidoPorNombre || 'Almacén',
        persona2Email: '',
        persona2Gps: undefined,
        fecha: p.fechaDevolucion || p.fechaPrestamo,
        detalles: `Condición devuelta: ${p.condicionDevolucion || 'Bueno'}`,
      });
    });

  // Sort by date desc
  transactions.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  // Filter
  const filtered = transactions.filter((t) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      t.nroRegistro.toLowerCase().includes(term) ||
      t.herramientaNombre.toLowerCase().includes(term) ||
      t.herramientaCodigo.toLowerCase().includes(term) ||
      t.persona1Nombre.toLowerCase().includes(term) ||
      t.persona2Nombre.toLowerCase().includes(term);

    const matchesType =
      filterType === 'all' ||
      (filterType === 'field' && t.tipo === 'Traspaso en Campo') ||
      (filterType === 'base' && t.tipo === 'Retiro en Base') ||
      (filterType === 'remote' && t.aprobadoEnPresencia === false) ||
      (filterType === 'presence' && t.aprobadoEnPresencia === true);

    return matchesSearch && matchesType;
  });

  const totalWithGps = transactions.filter((t) => t.persona1Gps || t.persona2Gps).length;
  const totalRemote = transactions.filter((t) => t.aprobadoEnPresencia === false).length;
  const totalPresential = transactions.filter((t) => t.aprobadoEnPresencia === true).length;
  const totalFieldTransfers = transferencias.length;

  const handleCardClick = (type: string) => {
    if (type === 'all') {
      setFilterType('all');
    } else {
      setFilterType((prev) => (prev === type ? 'all' : type));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Compass className="w-6 h-6 text-amber-400" />
            Trazabilidad & Auditoría de Geolocalización
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Registro satelital GPS de retiros, entregas presenciales y traspasos mano a mano en campo. Haz clic en las tarjetas para filtrar.
          </p>
        </div>
      </div>

      {/* KPI Cards (Interactive Filters) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Todas las Transacciones */}
        <button
          type="button"
          onClick={() => handleCardClick('all')}
          className={`p-4 rounded-2xl text-left transition-all duration-200 shadow-md cursor-pointer border active:scale-[0.98] ${
            filterType === 'all'
              ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/50 shadow-amber-500/10'
              : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/90'
          }`}
        >
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Transacciones GPS</span>
            <MapPin className={`w-4 h-4 ${filterType === 'all' ? 'text-amber-400' : 'text-zinc-500'}`} />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white font-mono">{transactions.length}</span>
            {filterType === 'all' && (
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">
                Activo
              </span>
            )}
          </div>
          <p className="text-[10px] text-zinc-500 mt-1">Ver todas las transacciones</p>
        </button>

        {/* Card 2: En Presencia */}
        <button
          type="button"
          onClick={() => handleCardClick('presence')}
          className={`p-4 rounded-2xl text-left transition-all duration-200 shadow-md cursor-pointer border active:scale-[0.98] ${
            filterType === 'presence'
              ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/50 shadow-emerald-500/10'
              : 'bg-zinc-900 border-emerald-900/40 hover:border-emerald-700/60 hover:bg-zinc-900/90'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">En Presencia</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-400 font-mono">{totalPresential}</span>
            {filterType === 'presence' && (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                Activo
              </span>
            )}
          </div>
          <p className="text-[10px] text-zinc-500 mt-1">Físicamente presentes (&lt;250m)</p>
        </button>

        {/* Card 3: Aprobación Remota */}
        <button
          type="button"
          onClick={() => handleCardClick('remote')}
          className={`p-4 rounded-2xl text-left transition-all duration-200 shadow-md cursor-pointer border active:scale-[0.98] ${
            filterType === 'remote'
              ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/50 shadow-amber-500/10'
              : 'bg-zinc-900 border-amber-900/40 hover:border-amber-700/60 hover:bg-zinc-900/90'
          }`}
        >
          <div className="flex items-center justify-between text-amber-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Aprobación Remota</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-400 font-mono">{totalRemote}</span>
            {filterType === 'remote' && (
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">
                Activo
              </span>
            )}
          </div>
          <p className="text-[10px] text-zinc-500 mt-1">Aprobado a distancia (&gt;250m)</p>
        </button>

        {/* Card 4: Traspasos Campo */}
        <button
          type="button"
          onClick={() => handleCardClick('field')}
          className={`p-4 rounded-2xl text-left transition-all duration-200 shadow-md cursor-pointer border active:scale-[0.98] ${
            filterType === 'field'
              ? 'bg-cyan-500/10 border-cyan-500 ring-2 ring-cyan-500/50 shadow-cyan-500/10'
              : 'bg-zinc-900 border-cyan-900/40 hover:border-cyan-700/60 hover:bg-zinc-900/90'
          }`}
        >
          <div className="flex items-center justify-between text-cyan-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Traspasos Campo</span>
            <ArrowLeftRight className="w-4 h-4" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-cyan-400 font-mono">{totalFieldTransfers}</span>
            {filterType === 'field' && (
              <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/20 px-2 py-0.5 rounded-full">
                Activo
              </span>
            )}
          </div>
          <p className="text-[10px] text-zinc-500 mt-1">Mano a mano entre técnicos</p>
        </button>
      </div>

      {/* Search Toolbar (Preserving search, without button filters) */}
      <div className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por técnico, código de herramienta, registro..."
            className="w-full pl-9 pr-20 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[10px] font-bold text-zinc-400 hover:text-white bg-zinc-800 rounded-lg transition-colors"
            >
              Limpiar
            </button>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto text-xs shrink-0 text-zinc-400">
          <span>
            Mostrando <strong className="text-zinc-100 font-mono">{filtered.length}</strong> de{' '}
            <span className="font-mono">{transactions.length}</span>
          </span>
          {filterType !== 'all' && (
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 hover:underline"
            >
              Restablecer filtro
            </button>
          )}
        </div>
      </div>

      {/* Transactions List */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-800">
          <MapPin className="w-12 h-12 text-zinc-600 mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-bold text-zinc-300">No hay transacciones que coincidan</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            A medida que los técnicos soliciten retiros o realicen traspasos en campo, se registrarán aquí con auditoría de geolocalización.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filtered.map((t) => {
            const hasBothGps = !!(t.persona1Gps && t.persona2Gps);
            const directionsUrl =
              hasBothGps && t.persona1Gps && t.persona2Gps
                ? getGoogleMapsDirectionsUrl(
                    t.persona1Gps.latitude,
                    t.persona1Gps.longitude,
                    t.persona2Gps.latitude,
                    t.persona2Gps.longitude
                  )
                : null;

            return (
              <div
                key={t.id}
                className="p-4 sm:p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3.5 shadow-lg hover:border-zinc-700 transition-colors"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-xs font-black px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${
                        t.tipo === 'Traspaso en Campo'
                          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                          : t.tipo === 'Retiro en Base'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {t.tipo === 'Traspaso en Campo' && <ArrowLeftRight className="w-3.5 h-3.5" />}
                      {t.tipo === 'Retiro en Base' && <Package className="w-3.5 h-3.5" />}
                      {t.tipo === 'Devolución Almacén' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      <span>{t.tipo}</span>
                    </span>

                    <span className="font-mono text-xs font-black text-amber-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                      {t.nroRegistro}
                    </span>

                    <span className="text-xs text-zinc-400 font-mono">
                      {new Date(t.fecha).toLocaleString()}
                    </span>
                  </div>

                  {/* Presence audit badge */}
                  <div>
                    {t.aprobadoEnPresencia === true && (
                      <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Presencial {t.distanciaMetros !== undefined ? `(${formatDistance(t.distanciaMetros)})` : ''}</span>
                      </span>
                    )}

                    {t.aprobadoEnPresencia === false && (
                      <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 inline-flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Aprobado a Distancia {t.distanciaMetros !== undefined ? `(${formatDistance(t.distanciaMetros)})` : ''}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Tool details */}
                <div className="flex items-center gap-2 text-xs">
                  <Wrench className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-zinc-400 font-medium">Herramienta(s):</span>
                  <span className="font-bold text-white">{t.herramientaNombre}</span>
                  <span className="font-mono text-zinc-500">[{t.herramientaCodigo}]</span>
                </div>

                {/* Two Parties GPS Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Party 1 */}
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-zinc-400 uppercase font-bold">{t.persona1Rol}:</span>
                      {t.persona1Gps && (
                        <a
                          href={getGoogleMapsUrl(t.persona1Gps.latitude, t.persona1Gps.longitude)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 font-bold"
                        >
                          <span>Ver Mapa</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-white font-bold">
                      <User className="w-3.5 h-3.5 text-amber-400" />
                      <span>{t.persona1Nombre}</span>
                    </div>

                    {t.persona1Gps ? (
                      <div className="text-[11px] font-mono text-zinc-300 flex items-center gap-2">
                        <span>Lat: {t.persona1Gps.latitude}, Lng: {t.persona1Gps.longitude}</span>
                        {t.persona1Gps.accuracy && (
                          <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1 rounded">
                            ±{t.persona1Gps.accuracy}m
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-zinc-500">GPS no registrado</p>
                    )}
                  </div>

                  {/* Party 2 */}
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-zinc-400 uppercase font-bold">{t.persona2Rol}:</span>
                      {t.persona2Gps && (
                        <a
                          href={getGoogleMapsUrl(t.persona2Gps.latitude, t.persona2Gps.longitude)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 font-bold"
                        >
                          <span>Ver Mapa</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-white font-bold">
                      <User className="w-3.5 h-3.5 text-amber-400" />
                      <span>{t.persona2Nombre}</span>
                    </div>

                    {t.persona2Gps ? (
                      <div className="text-[11px] font-mono text-zinc-300 flex items-center gap-2">
                        <span>Lat: {t.persona2Gps.latitude}, Lng: {t.persona2Gps.longitude}</span>
                        {t.persona2Gps.accuracy && (
                          <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1 rounded">
                            ±{t.persona2Gps.accuracy}m
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-zinc-500">
                        {t.tipo === 'Devolución Almacén' ? 'Recepción física en almacén' : 'GPS no registrado'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Distance & Map comparison link */}
                {directionsUrl && (
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-zinc-400">
                      Distancia calculada entre ambas personas: <strong className="text-amber-400 font-mono">{formatDistance(t.distanciaMetros)}</strong>
                    </span>

                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-400 text-[11px] font-bold transition-colors flex items-center gap-1.5"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Ver Ruta / Comparación en Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {t.detalles && (
                  <p className="text-[11px] text-zinc-400 bg-zinc-950/40 p-2 rounded-xl border border-zinc-800/60">
                    {t.detalles}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
