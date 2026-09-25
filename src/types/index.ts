export type RolUsuario = 'admin' | 'tecnico';
export type EstadoUsuario = 'pendiente' | 'activo' | 'rechazado';

export interface Usuario {
  uid: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  estado: EstadoUsuario;
  fechaCreacion?: string;
  aprobadoPor?: string;
  fechaAprobacion?: string;
  telefono?: string;
  cargo?: string;
}

export type EstadoHerramienta = 'Disponible' | 'Prestada' | 'En Mantenimiento' | 'Fuera de servicio';

export type CategoriaHerramienta =
  | 'Herramientas Eléctricas'
  | 'Herramientas Manuales'
  | 'Medición y Diagnóstico'
  | 'Neumáticas e Hidráulicas'
  | 'Corte y Desbaste'
  | 'Soldadura'
  | 'Seguridad y EPP'
  | 'Equipos de Elevación'
  | 'Otros';

export interface Herramienta {
  id?: string;
  codigo: string; // SKU o Código de Barras
  nombre: string;
  marca: string;
  modelo: string;
  categoria: CategoriaHerramienta;
  estado: EstadoHerramienta;
  ubicacion: string; // Estante, Gabinete, Taller central, etc.
  notas?: string;
  fotoUrl?: string;
  tecnicoAsignadoUid?: string;
  tecnicoAsignadoNombre?: string;
  prestamoActualId?: string;
  fechaCreacion?: string;
  creadoPor?: string;
  numeroSerie?: string;
}

export type EstadoPrestamo = 'Activo' | 'Devuelto' | 'Atrasado';

export type CondicionHerramienta = 
  | 'Buen estado' 
  | 'Falta mantenimiento' 
  | 'Dañado' 
  | 'Excelente' 
  | 'Bueno' 
  | 'Desgaste normal' 
  | 'Dañada / Requiere servicio';

export interface GeoLocationPoint {
  latitude: number;
  longitude: number;
  accuracy?: number; // metros
  timestamp: string; // ISO string
  direccionAprox?: string;
}

export interface Prestamo {
  id?: string;
  herramientaId: string;
  herramientaCodigo: string;
  herramientaNombre: string;
  tecnicoUid: string;
  tecnicoNombre: string;
  tecnicoEmail: string;
  adminUid: string;
  adminNombre: string;
  fechaPrestamo: string; // ISO string
  fechaEstimadaDevolucion: string; // ISO string
  fechaDevolucion?: string; // ISO string
  estado: EstadoPrestamo;
  condicionEntrega: CondicionHerramienta;
  condicionDevolucion?: CondicionHerramienta;
  observacionesEntrega?: string;
  observacionesDevolucion?: string;
  recibidoPorNombre?: string;
  recibidoPorUid?: string;
  // Geolocation fields
  geoEntrega?: GeoLocationPoint; // Ubicación donde se autorizó/entregó
  geoRetiro?: GeoLocationPoint; // Ubicación del técnico al retirar
  geoDevolucion?: GeoLocationPoint; // Ubicación donde se devolvió
  distanciaPresenciaAprobacionMetros?: number; // Distancia entre admin y técnico
  aprobadoEnPresencia?: boolean; // Si estaban a menos de 250m
  esTraspasoEnCampo?: boolean;
  transferenciaOrigenId?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

export type EstadoSolicitudRetiro = 'Pendiente' | 'Aprobada' | 'Rechazada' | 'Cancelada';

export interface HerramientaSolicitada {
  herramientaId: string;
  codigo: string;
  nombre: string;
  marca: string;
  modelo?: string;
  categoria: string;
  ubicacion?: string;
  fotoUrl?: string;
  estadoRetiro?: CondicionHerramienta | string;
  observacionesRetiro?: string;
}

export interface SolicitudRetiro {
  id?: string;
  nroSolicitud: string;
  tecnicoUid: string;
  tecnicoNombre: string;
  tecnicoEmail: string;
  herramientas: HerramientaSolicitada[];
  cantidadTotal: number;
  fechaSolicitud: string; // ISO
  fechaEstimadaDevolucion?: string; // ISO (opcional)
  motivoUso?: string;
  estado: EstadoSolicitudRetiro;
  fechaRespuesta?: string; // ISO
  adminRespuestaUid?: string;
  adminRespuestaNombre?: string;
  motivoRechazo?: string;
  observacionesEntrega?: string;
  // Geolocation fields
  geoSolicitud?: GeoLocationPoint; // Ubicación del técnico al pedir retiro
  geoAprobacion?: GeoLocationPoint; // Ubicación del admin al autorizar
  distanciaAprobacionMetros?: number; // Distancia entre técnico y admin
  aprobadoEnPresencia?: boolean; // Si el admin estaba presente físicamente
}

export type EstadoTransferenciaCampo = 'PendienteConfirmacion' | 'Completada' | 'Rechazada' | 'Cancelada';

export interface TransferenciaCampo {
  id?: string;
  nroTransferencia: string;
  herramientaId: string;
  herramientaCodigo: string;
  herramientaNombre: string;
  herramientaMarca: string;
  prestamoOrigenId?: string;
  tecnicoEmisorUid: string;
  tecnicoEmisorNombre: string;
  tecnicoEmisorEmail: string;
  tecnicoReceptorUid: string;
  tecnicoReceptorNombre: string;
  tecnicoReceptorEmail: string;
  fechaInicio: string; // ISO
  fechaConfirmacion?: string; // ISO
  estado: EstadoTransferenciaCampo;
  geoEmisor?: GeoLocationPoint; // GPS del que entrega
  geoReceptor?: GeoLocationPoint; // GPS del que recibe
  distanciaMetros?: number; // Distancia entre ambos técnicos
  condicionEntrega: CondicionHerramienta;
  observaciones?: string;
  motivoRechazo?: string;
}

export type TipoNotificacion = 'solicitud' | 'aprobacion' | 'rechazo' | 'traspaso' | 'devolucion' | 'sistema';

export interface NotificacionSistema {
  id?: string;
  destinatarioUid: string; // UID específico o 'todos_admin'
  destinatarioEmail?: string;
  titulo: string;
  mensaje: string;
  tipo: TipoNotificacion;
  leida: boolean;
  fecha: string; // ISO string
  metadata?: {
    solicitudId?: string;
    herramientaId?: string;
    transferenciaId?: string;
    prestamoId?: string;
    [key: string]: any;
  };
}

