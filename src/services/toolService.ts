import { 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  where,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { 
  Herramienta, 
  Prestamo, 
  Usuario, 
  RolUsuario, 
  EstadoUsuario, 
  CondicionHerramienta, 
  EstadoHerramienta,
  SolicitudRetiro,
  HerramientaSolicitada,
  TransferenciaCampo,
  EstadoTransferenciaCampo,
  GeoLocationPoint
} from '../types';
import { 
  captureCurrentLocation, 
  calculateDistanceMeters, 
  PRESENCE_DISTANCE_THRESHOLD_METERS 
} from './geoService';

// ==========================================
// HERRAMIENTAS CRUD & LISTENERS
// ==========================================

export const subscribeToHerramientas = (
  onSuccess: (herramientas: Herramienta[]) => void,
  onError?: (err: unknown) => void
) => {
  const collectionRef = collection(db, 'herramientas');
  const q = query(collectionRef, orderBy('nombre', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Herramienta[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Herramienta[];
      onSuccess(items);
    },
    (error) => {
      onError?.(error);
      handleFirestoreError(error, OperationType.LIST, 'herramientas');
    }
  );
};

export const createHerramienta = async (herramienta: Omit<Herramienta, 'id'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'herramientas'), {
      ...herramienta,
      fechaCreacion: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'herramientas');
  }
};

export const updateHerramienta = async (id: string, data: Partial<Herramienta>): Promise<void> => {
  try {
    const docRef = doc(db, 'herramientas', id);
    await updateDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `herramientas/${id}`);
  }
};

export const deleteHerramienta = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, 'herramientas', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `herramientas/${id}`);
  }
};

// ==========================================
// PRESTAMOS Y DEVOLUCIONES
// ==========================================

export const subscribeToPrestamos = (
  onSuccess: (prestamos: Prestamo[]) => void,
  tecnicoUid?: string,
  onError?: (err: unknown) => void
) => {
  const collectionRef = collection(db, 'prestamos');
  let q = query(collectionRef, orderBy('fechaPrestamo', 'desc'));

  if (tecnicoUid) {
    q = query(collectionRef, where('tecnicoUid', '==', tecnicoUid), orderBy('fechaPrestamo', 'desc'));
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Prestamo[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Prestamo[];
      onSuccess(items);
    },
    (error) => {
      onError?.(error);
      handleFirestoreError(error, OperationType.LIST, 'prestamos');
    }
  );
};

export interface NewPrestamoInput {
  herramienta: Herramienta;
  tecnico: Usuario;
  adminNombre: string;
  adminUid: string;
  fechaEstimadaDevolucion: string;
  condicionEntrega: CondicionHerramienta;
  observacionesEntrega?: string;
}

export const registerPrestamo = async (input: NewPrestamoInput): Promise<string> => {
  const batch = writeBatch(db);
  const prestamosCol = collection(db, 'prestamos');
  const newPrestamoRef = doc(prestamosCol);
  const herramientaRef = doc(db, 'herramientas', input.herramienta.id!);

  const now = new Date().toISOString();

  const prestamoData: Omit<Prestamo, 'id'> = {
    herramientaId: input.herramienta.id!,
    herramientaCodigo: input.herramienta.codigo,
    herramientaNombre: input.herramienta.nombre,
    tecnicoUid: input.tecnico.uid,
    tecnicoNombre: input.tecnico.nombre,
    tecnicoEmail: input.tecnico.email,
    adminUid: input.adminUid,
    adminNombre: input.adminNombre,
    fechaPrestamo: now,
    fechaEstimadaDevolucion: input.fechaEstimadaDevolucion,
    estado: 'Activo',
    condicionEntrega: input.condicionEntrega,
    observacionesEntrega: input.observacionesEntrega || '',
  };

  const toolUpdate: Partial<Herramienta> = {
    estado: 'Prestada',
    tecnicoAsignadoUid: input.tecnico.uid,
    tecnicoAsignadoNombre: input.tecnico.nombre,
    prestamoActualId: newPrestamoRef.id,
  };

  try {
    batch.set(newPrestamoRef, prestamoData);
    batch.update(herramientaRef, toolUpdate);
    await batch.commit();
    return newPrestamoRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'prestamos');
  }
};

export interface ReturnPrestamoInput {
  prestamo: Prestamo;
  condicionDevolucion: CondicionHerramienta;
  observacionesDevolucion?: string;
  recibidoPorNombre: string;
  recibidoPorUid: string;
  destinoEstadoHerramienta?: EstadoHerramienta; // If Damaged -> 'En Mantenimiento', else 'Disponible'
  geoDevolucion?: GeoLocationPoint | null;
}

export const returnHerramientaLoan = async (input: ReturnPrestamoInput): Promise<void> => {
  const batch = writeBatch(db);
  const prestamoRef = doc(db, 'prestamos', input.prestamo.id!);
  const herramientaRef = doc(db, 'herramientas', input.prestamo.herramientaId);

  const now = new Date().toISOString();
  const geoDev = input.geoDevolucion !== undefined ? input.geoDevolucion : await captureCurrentLocation();

  const finalToolStatus: EstadoHerramienta = 
    input.destinoEstadoHerramienta || 
    (input.condicionDevolucion === 'Dañada / Requiere servicio' ? 'En Mantenimiento' : 'Disponible');

  const prestamoUpdate: Partial<Prestamo> = {
    fechaDevolucion: now,
    estado: 'Devuelto',
    condicionDevolucion: input.condicionDevolucion,
    observacionesDevolucion: input.observacionesDevolucion || '',
    recibidoPorNombre: input.recibidoPorNombre,
    recibidoPorUid: input.recibidoPorUid,
    ...(geoDev ? { geoDevolucion: geoDev } : {}),
  };

  const toolUpdate: Partial<Herramienta> = {
    estado: finalToolStatus,
    tecnicoAsignadoUid: '',
    tecnicoAsignadoNombre: '',
    prestamoActualId: '',
  };

  try {
    batch.update(prestamoRef, prestamoUpdate);
    batch.update(herramientaRef, toolUpdate);
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `prestamos/${input.prestamo.id}`);
  }
};

// ==========================================
// USUARIOS MANAGEMENT
// ==========================================

export const subscribeToUsuarios = (
  onSuccess: (usuarios: Usuario[]) => void,
  onError?: (err: unknown) => void
) => {
  const collectionRef = collection(db, 'usuarios');
  const q = query(collectionRef, orderBy('nombre', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Usuario[] = snapshot.docs.map((docSnap) => docSnap.data() as Usuario);
      onSuccess(items);
    },
    (error) => {
      onError?.(error);
      handleFirestoreError(error, OperationType.LIST, 'usuarios');
    }
  );
};

export const updateUsuarioRolAndEstado = async (
  uid: string,
  estado: EstadoUsuario,
  rol: RolUsuario,
  aprobadoPorNombre: string
): Promise<void> => {
  try {
    const docRef = doc(db, 'usuarios', uid);
    await updateDoc(docRef, {
      estado,
      rol,
      aprobadoPor: aprobadoPorNombre,
      fechaAprobacion: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `usuarios/${uid}`);
  }
};

// ==========================================
// SOLICITUDES DE RETIRO (CANASTA / AUTORIZACIONES)
// ==========================================

export const subscribeToSolicitudesRetiro = (
  onSuccess: (solicitudes: SolicitudRetiro[]) => void,
  tecnicoUid?: string,
  onError?: (err: unknown) => void
) => {
  const collectionRef = collection(db, 'solicitudes_retiro');
  let q = query(collectionRef, orderBy('fechaSolicitud', 'desc'));

  if (tecnicoUid) {
    q = query(collectionRef, where('tecnicoUid', '==', tecnicoUid), orderBy('fechaSolicitud', 'desc'));
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const items: SolicitudRetiro[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as SolicitudRetiro[];
      onSuccess(items);
    },
    (error) => {
      onError?.(error);
      handleFirestoreError(error, OperationType.LIST, 'solicitudes_retiro');
    }
  );
};

export interface NewSolicitudInput {
  tecnicoUid: string;
  tecnicoNombre: string;
  tecnicoEmail: string;
  herramientas: HerramientaSolicitada[];
  fechaEstimadaDevolucion?: string;
  motivoUso?: string;
  geoSolicitud?: GeoLocationPoint | null;
}

export const createSolicitudRetiro = async (input: NewSolicitudInput): Promise<string> => {
  try {
    const nroSeq = Math.floor(1000 + Math.random() * 9000);
    const nroSolicitud = `SOL-${nroSeq}`;
    const now = new Date().toISOString();
    const geo = input.geoSolicitud !== undefined ? input.geoSolicitud : await captureCurrentLocation();

    const data: Omit<SolicitudRetiro, 'id'> = {
      nroSolicitud,
      tecnicoUid: input.tecnicoUid,
      tecnicoNombre: input.tecnicoNombre,
      tecnicoEmail: input.tecnicoEmail,
      herramientas: input.herramientas,
      cantidadTotal: input.herramientas.length,
      fechaSolicitud: now,
      ...(input.fechaEstimadaDevolucion ? { fechaEstimadaDevolucion: input.fechaEstimadaDevolucion } : {}),
      motivoUso: input.motivoUso || '',
      estado: 'Pendiente',
      ...(geo ? { geoSolicitud: geo } : {}),
    };

    const docRef = await addDoc(collection(db, 'solicitudes_retiro'), data);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'solicitudes_retiro');
  }
};

export const autorizarSolicitudRetiro = async (
  solicitud: SolicitudRetiro,
  adminUid: string,
  adminNombre: string,
  observacionesEntrega?: string,
  condicionEntrega: CondicionHerramienta = 'Bueno',
  adminGeo?: GeoLocationPoint | null
): Promise<void> => {
  const batch = writeBatch(db);
  const now = new Date().toISOString();
  const solicitudRef = doc(db, 'solicitudes_retiro', solicitud.id!);

  // Capture Admin GPS at moment of authorization
  const geoAprobacion = adminGeo !== undefined ? adminGeo : await captureCurrentLocation();

  let distanciaMetros: number | undefined = undefined;
  let aprobadoEnPresencia: boolean | undefined = undefined;

  if (solicitud.geoSolicitud && geoAprobacion) {
    distanciaMetros = calculateDistanceMeters(
      solicitud.geoSolicitud.latitude,
      solicitud.geoSolicitud.longitude,
      geoAprobacion.latitude,
      geoAprobacion.longitude
    );
    aprobadoEnPresencia = distanciaMetros <= PRESENCE_DISTANCE_THRESHOLD_METERS;
  }

  // Update solicitud status with GPS and presence check
  batch.update(solicitudRef, {
    estado: 'Aprobada',
    fechaRespuesta: now,
    adminRespuestaUid: adminUid,
    adminRespuestaNombre: adminNombre,
    observacionesEntrega: observacionesEntrega || '',
    ...(geoAprobacion ? { geoAprobacion } : {}),
    ...(distanciaMetros !== undefined ? { distanciaAprobacionMetros: distanciaMetros } : {}),
    ...(aprobadoEnPresencia !== undefined ? { aprobadoEnPresencia } : {}),
  });

  // Create individual loans for each tool and mark tool as Prestada
  for (const item of solicitud.herramientas) {
    const prestamosCol = collection(db, 'prestamos');
    const newPrestamoRef = doc(prestamosCol);
    const herramientaRef = doc(db, 'herramientas', item.herramientaId);

    const itemCondicion = (item.estadoRetiro as CondicionHerramienta) || condicionEntrega || 'Bueno';
    let combinedObs = '';
    if (item.observacionesRetiro) {
      combinedObs += `Estado al retirar (${itemCondicion}): ${item.observacionesRetiro}. `;
    }
    if (observacionesEntrega) {
      combinedObs += `Admin: ${observacionesEntrega} `;
    }
    if (!combinedObs) {
      combinedObs = `Solicitud ${solicitud.nroSolicitud}${solicitud.motivoUso ? ` - Motivo: ${solicitud.motivoUso}` : ''}`;
    }

    const prestamoData: Omit<Prestamo, 'id'> = {
      herramientaId: item.herramientaId,
      herramientaCodigo: item.codigo,
      herramientaNombre: item.nombre,
      tecnicoUid: solicitud.tecnicoUid,
      tecnicoNombre: solicitud.tecnicoNombre,
      tecnicoEmail: solicitud.tecnicoEmail,
      adminUid: adminUid,
      adminNombre: adminNombre,
      fechaPrestamo: now,
      fechaEstimadaDevolucion: solicitud.fechaEstimadaDevolucion || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      estado: 'Activo',
      condicionEntrega: itemCondicion,
      observacionesEntrega: combinedObs.trim(),
      ...(geoAprobacion ? { geoEntrega: geoAprobacion } : {}),
      ...(solicitud.geoSolicitud ? { geoRetiro: solicitud.geoSolicitud } : {}),
      ...(distanciaMetros !== undefined ? { distanciaPresenciaAprobacionMetros: distanciaMetros } : {}),
      ...(aprobadoEnPresencia !== undefined ? { aprobadoEnPresencia } : {}),
    };

    batch.set(newPrestamoRef, prestamoData);

    const toolUpdate: Partial<Herramienta> = {
      estado: 'Prestada',
      tecnicoAsignadoUid: solicitud.tecnicoUid,
      tecnicoAsignadoNombre: solicitud.tecnicoNombre,
      prestamoActualId: newPrestamoRef.id,
      ubicacion: `En posesión de ${solicitud.tecnicoNombre}`,
    };

    batch.update(herramientaRef, toolUpdate);
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `solicitudes_retiro/${solicitud.id}`);
  }
};

export const rechazarSolicitudRetiro = async (
  solicitudId: string,
  adminUid: string,
  adminNombre: string,
  motivoRechazo: string
): Promise<void> => {
  try {
    const docRef = doc(db, 'solicitudes_retiro', solicitudId);
    await updateDoc(docRef, {
      estado: 'Rechazada',
      fechaRespuesta: new Date().toISOString(),
      adminRespuestaUid: adminUid,
      adminRespuestaNombre: adminNombre,
      motivoRechazo: motivoRechazo || 'Rechazado por el Administrador',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `solicitudes_retiro/${solicitudId}`);
  }
};

export const cancelarSolicitudRetiro = async (solicitudId: string): Promise<void> => {
  try {
    const docRef = doc(db, 'solicitudes_retiro', solicitudId);
    await updateDoc(docRef, {
      estado: 'Cancelada',
      fechaRespuesta: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `solicitudes_retiro/${solicitudId}`);
  }
};

// ==========================================
// TRANSFERENCIAS EN CAMPO ENTRE TÉCNICOS (MANO A MANO)
// ==========================================

export const subscribeToTransferenciasCampo = (
  onSuccess: (items: TransferenciaCampo[]) => void,
  tecnicoUid?: string,
  onError?: (err: unknown) => void
) => {
  const collectionRef = collection(db, 'transferencias_campo');
  const q = query(collectionRef, orderBy('fechaInicio', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      let items: TransferenciaCampo[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as TransferenciaCampo[];

      if (tecnicoUid) {
        items = items.filter(
          (t) => t.tecnicoEmisorUid === tecnicoUid || t.tecnicoReceptorUid === tecnicoUid
        );
      }
      onSuccess(items);
    },
    (error) => {
      onError?.(error);
      handleFirestoreError(error, OperationType.LIST, 'transferencias_campo');
    }
  );
};

export const createTransferenciaCampo = async (input: {
  herramienta: Herramienta;
  tecnicoEmisorUid: string;
  tecnicoEmisorNombre: string;
  tecnicoEmisorEmail: string;
  tecnicoReceptorUid: string;
  tecnicoReceptorNombre: string;
  tecnicoReceptorEmail: string;
  condicionEntrega: CondicionHerramienta;
  observaciones?: string;
  prestamoOrigenId?: string;
  geoEmisor?: GeoLocationPoint | null;
}): Promise<string> => {
  try {
    const geo = input.geoEmisor !== undefined ? input.geoEmisor : await captureCurrentLocation();
    const nroSeq = Math.floor(1000 + Math.random() * 9000);
    const nroTransferencia = `TRF-${nroSeq}`;
    const now = new Date().toISOString();

    const data: Omit<TransferenciaCampo, 'id'> = {
      nroTransferencia,
      herramientaId: input.herramienta.id!,
      herramientaCodigo: input.herramienta.codigo,
      herramientaNombre: input.herramienta.nombre,
      herramientaMarca: input.herramienta.marca,
      prestamoOrigenId: input.prestamoOrigenId || input.herramienta.prestamoActualId || '',
      tecnicoEmisorUid: input.tecnicoEmisorUid,
      tecnicoEmisorNombre: input.tecnicoEmisorNombre,
      tecnicoEmisorEmail: input.tecnicoEmisorEmail,
      tecnicoReceptorUid: input.tecnicoReceptorUid,
      tecnicoReceptorNombre: input.tecnicoReceptorNombre,
      tecnicoReceptorEmail: input.tecnicoReceptorEmail,
      fechaInicio: now,
      estado: 'PendienteConfirmacion',
      condicionEntrega: input.condicionEntrega,
      observaciones: input.observaciones || '',
      ...(geo ? { geoEmisor: geo } : {}),
    };

    const docRef = await addDoc(collection(db, 'transferencias_campo'), data);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'transferencias_campo');
  }
};

export const confirmarTransferenciaCampo = async (
  transferencia: TransferenciaCampo,
  condicionReceptor: CondicionHerramienta,
  observacionesReceptor?: string,
  receptorGeo?: GeoLocationPoint | null
): Promise<void> => {
  const batch = writeBatch(db);
  const now = new Date().toISOString();
  const geoReceptor = receptorGeo !== undefined ? receptorGeo : await captureCurrentLocation();

  let distanciaMetros: number | undefined = undefined;
  if (transferencia.geoEmisor && geoReceptor) {
    distanciaMetros = calculateDistanceMeters(
      transferencia.geoEmisor.latitude,
      transferencia.geoEmisor.longitude,
      geoReceptor.latitude,
      geoReceptor.longitude
    );
  }

  // 1. Update transfer doc
  const trfRef = doc(db, 'transferencias_campo', transferencia.id!);
  batch.update(trfRef, {
    estado: 'Completada',
    fechaConfirmacion: now,
    condicionReceptor,
    observacionesReceptor: observacionesReceptor || '',
    ...(geoReceptor ? { geoReceptor } : {}),
    ...(distanciaMetros !== undefined ? { distanciaMetros } : {}),
  });

  // 2. Close previous loan if exists
  if (transferencia.prestamoOrigenId) {
    const prevPrestamoRef = doc(db, 'prestamos', transferencia.prestamoOrigenId);
    batch.update(prevPrestamoRef, {
      estado: 'Devuelto',
      fechaDevolucion: now,
      condicionDevolucion: condicionReceptor,
      observacionesDevolucion: `Transferido en campo al técnico ${transferencia.tecnicoReceptorNombre} (${transferencia.nroTransferencia})`,
      ...(geoReceptor ? { geoDevolucion: geoReceptor } : {}),
    });
  }

  // 3. Create new loan for recipient
  const newPrestamoRef = doc(collection(db, 'prestamos'));
  const newPrestamoData: Omit<Prestamo, 'id'> = {
    herramientaId: transferencia.herramientaId,
    herramientaCodigo: transferencia.herramientaCodigo,
    herramientaNombre: transferencia.herramientaNombre,
    tecnicoUid: transferencia.tecnicoReceptorUid,
    tecnicoNombre: transferencia.tecnicoReceptorNombre,
    tecnicoEmail: transferencia.tecnicoReceptorEmail,
    adminUid: transferencia.tecnicoEmisorUid,
    adminNombre: `Traspaso en campo por ${transferencia.tecnicoEmisorNombre}`,
    fechaPrestamo: now,
    fechaEstimadaDevolucion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    estado: 'Activo',
    condicionEntrega: condicionReceptor,
    observacionesEntrega: `Recibido en campo de ${transferencia.tecnicoEmisorNombre} (${transferencia.nroTransferencia}). ${observacionesReceptor || ''}`.trim(),
    esTraspasoEnCampo: true,
    transferenciaOrigenId: transferencia.id,
    ...(transferencia.geoEmisor ? { geoEntrega: transferencia.geoEmisor } : {}),
    ...(geoReceptor ? { geoRetiro: geoReceptor } : {}),
    ...(distanciaMetros !== undefined ? { distanciaPresenciaAprobacionMetros: distanciaMetros } : {}),
    ...(distanciaMetros !== undefined ? { aprobadoEnPresencia: distanciaMetros <= PRESENCE_DISTANCE_THRESHOLD_METERS } : {}),
  };
  batch.set(newPrestamoRef, newPrestamoData);

  // 4. Update tool document
  const herramientaRef = doc(db, 'herramientas', transferencia.herramientaId);
  batch.update(herramientaRef, {
    estado: 'Prestada',
    tecnicoAsignadoUid: transferencia.tecnicoReceptorUid,
    tecnicoAsignadoNombre: transferencia.tecnicoReceptorNombre,
    prestamoActualId: newPrestamoRef.id,
    ubicacion: `En posesión en campo (${transferencia.tecnicoReceptorNombre})`,
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `transferencias_campo/${transferencia.id}`);
  }
};

export const rechazarTransferenciaCampo = async (
  transferenciaId: string,
  motivoRechazo: string
): Promise<void> => {
  try {
    const trfRef = doc(db, 'transferencias_campo', transferenciaId);
    await updateDoc(trfRef, {
      estado: 'Rechazada',
      fechaRespuesta: new Date().toISOString(),
      motivoRechazo: motivoRechazo.trim(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `transferencias_campo/${transferenciaId}`);
  }
};

export const cancelarTransferenciaCampo = async (transferenciaId: string): Promise<void> => {
  try {
    const trfRef = doc(db, 'transferencias_campo', transferenciaId);
    await updateDoc(trfRef, {
      estado: 'Cancelada',
      fechaRespuesta: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `transferencias_campo/${transferenciaId}`);
  }
};

// ==========================================
// SEED INICIAL DE DEMOSTRACIÓN
// ==========================================

const SAMPLE_TOOLS: Omit<Herramienta, 'id'>[] = [
  {
    codigo: 'HR-EL-001',
    nombre: 'Taladro Percutor Inalámbrico 20V MAX',
    marca: 'DeWalt',
    modelo: 'DCD796D2',
    categoria: 'Herramientas Eléctricas',
    estado: 'Disponible',
    ubicacion: 'Estante A-1 (Almacén Principal)',
    notas: 'Incluye 2 baterías de 2.0Ah, cargador rápido y maletín TSTAK.',
    fotoUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&auto=format&fit=crop&q=80',
    numeroSerie: 'DW-88942-TX',
  },
  {
    codigo: 'HR-EL-002',
    nombre: 'Amoladora Angular 4-1/2" 850W',
    marca: 'Bosch Professional',
    modelo: 'GWS 850',
    categoria: 'Herramientas Eléctricas',
    estado: 'Disponible',
    ubicacion: 'Estante A-2 (Almacén Principal)',
    notas: 'Guarda de protección y llave de ajuste incluidas. Cable de 2.5m.',
    fotoUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80',
    numeroSerie: 'BSH-7712-EU',
  },
  {
    codigo: 'HR-MD-001',
    nombre: 'Multímetro Digital True-RMS Grado Industrial',
    marca: 'Fluke',
    modelo: 'Fluke 87V',
    categoria: 'Medición y Diagnóstico',
    estado: 'Disponible',
    ubicacion: 'Gabinete Calibración G-1',
    notas: 'Calibración vigente hasta 2027. Incluye puntas de prueba de silicona y termocupla.',
    fotoUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=600&auto=format&fit=crop&q=80',
    numeroSerie: 'FLK-499120',
  },
  {
    codigo: 'HR-MN-001',
    nombre: 'Juego de Llaves Combinadas Ratchet 8-19mm (12 Piezas)',
    marca: 'Stanley FatMax',
    modelo: 'FMMT82827-0',
    categoria: 'Herramientas Manuales',
    estado: 'Disponible',
    ubicacion: 'Panel de Herramientas P-3',
    notas: 'Acero cromo vanadio, acabado satinado anti-corrosión.',
    fotoUrl: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?w=600&auto=format&fit=crop&q=80',
  },
  {
    codigo: 'HR-CR-001',
    nombre: 'Sierra Circular 7-1/4" 1800W con Guía Láser',
    marca: 'Makita',
    modelo: 'HS7600',
    categoria: 'Corte y Desbaste',
    estado: 'Disponible',
    ubicacion: 'Estante B-1 (Área de Corte)',
    notas: 'Disco de carburo de tungsteno para madera instalado.',
    fotoUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=80',
    numeroSerie: 'MKT-33491-JP',
  },
  {
    codigo: 'HR-MD-002',
    nombre: 'Llave Dinamométrica Digital 1/2" 40-200 Nm',
    marca: 'Beta Tools',
    modelo: '666N/20',
    categoria: 'Medición y Diagnóstico',
    estado: 'En Mantenimiento',
    ubicacion: 'Banco de Revisión Taller 2',
    notas: 'Requiere revisión anual de par de apriete y cambio de baterías.',
    fotoUrl: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=600&auto=format&fit=crop&q=80',
    numeroSerie: 'BT-90112',
  },
  {
    codigo: 'HR-SL-001',
    nombre: 'Soldadora Inverter Multipropósito MIG/MAG/MMA 200A',
    marca: 'Lincoln Electric',
    modelo: 'Speedtec 200C',
    categoria: 'Soldadura',
    estado: 'Disponible',
    ubicacion: 'Bahía Soldadura S-1',
    notas: 'Incluye antorcha MIG 3m, pinza masa y cable porta-electrodo.',
    fotoUrl: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&auto=format&fit=crop&q=80',
    numeroSerie: 'LNC-200-USA',
  },
  {
    codigo: 'HR-NE-001',
    nombre: 'Pistola de Impacto Neumática 1/2" 1350 Nm',
    marca: 'Ingersoll Rand',
    modelo: '2235TiMAX',
    categoria: 'Neumáticas e Hidráulicas',
    estado: 'Disponible',
    ubicacion: 'Gabinete Neumático N-2',
    notas: 'Carcasa de titanio. Presión operativa recomendada 90 PSI.',
    fotoUrl: 'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?w=600&auto=format&fit=crop&q=80',
    numeroSerie: 'IR-TI-44819',
  }
];

export const seedSampleToolsIfEmpty = async (creadoPorNombre: string): Promise<number> => {
  try {
    const existing = await getDocs(collection(db, 'herramientas'));
    if (!existing.empty) {
      return 0; // Already has tools
    }

    const batch = writeBatch(db);
    const colRef = collection(db, 'herramientas');

    for (const tool of SAMPLE_TOOLS) {
      const docRef = doc(colRef);
      batch.set(docRef, {
        ...tool,
        creadoPor: creadoPorNombre,
        fechaCreacion: new Date().toISOString(),
      });
    }

    await batch.commit();
    return SAMPLE_TOOLS.length;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'herramientas');
  }
};
