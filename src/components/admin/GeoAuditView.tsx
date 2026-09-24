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
            Registro satelital GPS de retiros, entregas presenciales y traspasos mano a mano en campo
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-md">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-[11px] font-bold uppercase">Transacciones GPS</span>
            <MapPin className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-2xl font-black text-white font-mono">{totalWithGps}</span>
          <p className="text-[10px] text-zinc-500 mt-1">Con coordenadas registradas</p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900 border border-emerald-900/40 shadow-md">
          <div className="flex items-center justify-between text-emerald-400 mb-1">
            <span className="text-[11px] font-bold uppercase">En Presencia</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <span className="text-2xl font-black text-emerald-400 font-mono">{totalPresential}</span>
          <p className="text-[10px] text-zinc-500 mt-1">Físicamente presentes (&lt;250m)</p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900 border border-amber-900/40 shadow-md">
          <div className="flex items-center justify-between text-amber-400 mb-1">
            <span className="text-[11px] font-bold uppercase">Aprobación Remota</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <span className="text-2xl font-black text-amber-400 font-mono">{totalRemote}</span>
          <p className="text-[10px] text-zinc-500 mt-1">Aprobado a distancia (&gt;250m)</p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900 border border-cyan-900/40 shadow-md">
          <div className="flex items-center justify-between text-cyan-400 mb-1">
            <span className="text-[11px] font-bold uppercase">Traspasos Campo</span>
            <ArrowLeftRight className="w-4 h-4" />
          </div>
          <span className="text-2xl font-black text-cyan-400 font-mono">{totalFieldTransfers}</span>
          <p className="text-[10px] text-zinc-500 mt-1">Mano a mano entre técnicos</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3.5 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por técnico, código o solicitud..."
            className="w-full pl-9 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs font-semibold">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap ${
              filterType === 'all'
                ? 'bg-amber-500 text-black font-bold'
                : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            Todas ({transactions.length})
          </button>

          <button
            onClick={() => setFilterType('field')}
            className={`px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap ${
              filterType === 'field'
                ? 'bg-amber-500 text-black font-bold'
                : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            Traspasos Campo ({transferencias.length})
          </button>

          <button
            onClick={() => setFilterType('remote')}
            className={`px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap ${
              filterType === 'remote'
                ? 'bg-amber-500 text-black font-bold'
                : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            Aprobación Remota ({totalRemote})
          </button>

          <button
            onClick={() => setFilterType('presence')}
            className={`px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap ${
              filterType === 'presence'
                ? 'bg-amber-500 text-black font-bold'
                : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            Presenciales ({totalPresential})
          </button>
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
