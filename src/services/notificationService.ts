import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  doc, 
  writeBatch,
  getDocs,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { NotificacionSistema, TipoNotificacion, Prestamo } from '../types';

/**
 * Checks if browser supports Web Notifications and returns current permission
 */
export const checkNotificationPermission = (): 'granted' | 'denied' | 'default' | 'unsupported' => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
};

/**
 * Request permission from user to send notifications
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      playNotificationSound();
      showDeviceNotification('Notificaciones Activadas', {
        body: 'Recibirás avisos de solicitudes de herramientas y traspasos en campo.',
        tag: 'welcome',
      });
      return true;
    }
    return false;
  } catch (error) {
    console.warn('Error requesting notification permission:', error);
    return false;
  }
};

/**
 * Synthesize a soft 2-tone pleasant notification chime using Web Audio API
 */
export const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Tone 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain1.gain.setValueAtTime(0.12, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.25);

    // Tone 2 (higher note slightly delayed)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.45);
  } catch (e) {
    // Audio autoplay restrictions or unsupported
  }
};

/**
 * Displays a system/browser notification on phone or computer
 */
export const showDeviceNotification = (
  title: string,
  options?: {
    body?: string;
    tag?: string;
    icon?: string;
    data?: any;
  }
) => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  playNotificationSound();

  if (Notification.permission === 'granted') {
    const notifOptions: NotificationOptions = {
      body: options?.body || '',
      icon: options?.icon || 'pwa-192x192.png',
      badge: 'pwa-192x192.png',
      tag: options?.tag || `tool-${Date.now()}`,
      data: options?.data,
    };

    // If Service Worker is ready, use it (recommended for Android PWAs)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, notifOptions).catch(() => {
          try {
            new Notification(title, notifOptions);
          } catch (e) {}
        });
      });
    } else {
      try {
        new Notification(title, notifOptions);
      } catch (e) {
        console.warn('Standard Notification fallback failed:', e);
      }
    }
  }
};

// ============================================================================
// FIRESTORE NOTIFICATIONS SYSTEM
// ============================================================================

/**
 * Creates a notification document in Firestore and triggers device notification if applicable
 */
export const crearNotificacion = async (
  destinatarioUid: string,
  titulo: string,
  mensaje: string,
  tipo: TipoNotificacion,
  metadata?: Record<string, any>
): Promise<string> => {
  try {
    const data: Omit<NotificacionSistema, 'id'> = {
      destinatarioUid,
      titulo,
      mensaje,
      tipo,
      leida: false,
      fecha: new Date().toISOString(),
      ...(metadata ? { metadata } : {}),
    };

    const docRef = await addDoc(collection(db, 'notificaciones'), data);
    return docRef.id;
  } catch (err) {
    console.error('Error creating notificacion:', err);
    return '';
  }
};

/**
 * Notify all system administrators
 */
export const notificarAAdmins = async (
  titulo: string,
  mensaje: string,
  tipo: TipoNotificacion,
  metadata?: Record<string, any>
) => {
  return await crearNotificacion('todos_admin', titulo, mensaje, tipo, metadata);
};

/**
 * Subscribes to notifications intended for the current user (or admins)
 */
export const subscribeToMisNotificaciones = (
  userUid: string,
  isAdmin: boolean,
  callback: (notifs: NotificacionSistema[]) => void,
  onError?: (error: Error) => void
) => {
  try {
    const notifsRef = collection(db, 'notificaciones');
    
    // Admins receive notifications directed to them individually OR to 'todos_admin'
    // Technicians receive notifications addressed to their specific user UID
    let q = isAdmin
      ? query(
          notifsRef,
          where('destinatarioUid', 'in', [userUid, 'todos_admin']),
          limit(50)
        )
      : query(
          notifsRef,
          where('destinatarioUid', '==', userUid),
          limit(50)
        );

    return onSnapshot(
      q,
      (snapshot) => {
        const notifs: NotificacionSistema[] = [];
        snapshot.forEach((docSnap) => {
          notifs.push({
            id: docSnap.id,
            ...(docSnap.data() as Omit<NotificacionSistema, 'id'>),
          });
        });

        // Sort descending by date
        notifs.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        callback(notifs);
      },
      (error) => {
        console.error('Error in subscribeToMisNotificaciones:', error);
        if (onError) onError(error);
      }
    );
  } catch (err: any) {
    console.error('Subscription error:', err);
    if (onError) onError(err);
    return () => {};
  }
};

/**
 * Mark a single notification as read
 */
export const marcarNotificacionLeida = async (id: string) => {
  try {
    const docRef = doc(db, 'notificaciones', id);
    await updateDoc(docRef, { leida: true });
  } catch (err) {
    console.error('Error marking notification as read:', err);
  }
};

/**
 * Mark all unread notifications as read
 */
export const marcarTodasNotificacionesLeidas = async (ids: string[]) => {
  if (ids.length === 0) return;
  try {
    const batch = writeBatch(db);
    ids.forEach((id) => {
      const docRef = doc(db, 'notificaciones', id);
      batch.update(docRef, { leida: true });
    });
    await batch.commit();
  } catch (err) {
    console.error('Error marking all notifications read:', err);
  }
};

/**
 * Chequea los préstamos activos y notifica diariamente al administrador
 * que realizó el préstamo cuando la fecha estimada de devolución se cumple o se vence.
 * - Si el admin le dio OK, se repite 1 sola vez por día (comparando fecha en formato YYYY-MM-DD).
 * - Si se extiende la fecha límite, se pospone automáticamente hasta la nueva fecha.
 * - Si el préstamo se devuelve (estado !== 'Activo'), no se notifica.
 */
export const verificarYNotificarPrestamosVencidos = async (
  prestamos: Prestamo[],
  adminUidActual: string
): Promise<number> => {
  const hoyStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const now = new Date();
  let notificacionesGeneradas = 0;

  for (const prestamo of prestamos) {
    // Solo préstamos activos del admin actual (o si el admin prestó la herramienta)
    if (prestamo.estado !== 'Activo') continue;
    if (prestamo.adminUid !== adminUidActual) continue;
    if (!prestamo.fechaEstimadaDevolucion) continue;

    const fechaLimite = new Date(prestamo.fechaEstimadaDevolucion);
    // Verificar si la fecha límite ya se cumplió o venció
    if (fechaLimite <= now) {
      // Verificar si ya se envió la notificación el día de hoy
      if (prestamo.ultimaAlertaVencimiento === hoyStr) {
        // Ya fue alertado hoy, esperamos hasta mañana
        continue;
      }

      // Si no fue alertado hoy, creamos la notificación y sonido en el dispositivo
      const diasAtraso = Math.floor((now.getTime() - fechaLimite.getTime()) / (1000 * 60 * 60 * 24));
      const estadoTexto = diasAtraso > 0 ? `venció hace ${diasAtraso} día(s)` : 'vence hoy';

      await crearNotificacion(
        prestamo.adminUid,
        `⚠️ Fecha de devolución cumplida: ${prestamo.herramientaNombre}`,
        `La herramienta ${prestamo.herramientaNombre} (${prestamo.herramientaCodigo}) en poder de ${prestamo.tecnicoNombre} ${estadoTexto}. Confirma recepción o extiende la fecha límite.`,
        'alerta_vencimiento',
        {
          prestamoId: prestamo.id,
          herramientaId: prestamo.herramientaId,
          fechaEstimada: prestamo.fechaEstimadaDevolucion,
          alertaVencimiento: true,
        }
      );

      // Actualizar en el préstamo la fecha del último aviso diario
      if (prestamo.id) {
        try {
          const prestamoRef = doc(db, 'prestamos', prestamo.id);
          await updateDoc(prestamoRef, {
            ultimaAlertaVencimiento: hoyStr,
          });
        } catch (e) {
          console.warn('No se pudo marcar fecha de última alerta en préstamo:', e);
        }
      }

      notificacionesGeneradas++;
    }
  }

  return notificacionesGeneradas;
};
