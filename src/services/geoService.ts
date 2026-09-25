import { GeoLocationPoint } from '../types';

export type LocationPermissionState = 'granted' | 'prompt' | 'denied' | 'unsupported';

/**
 * Checks current location permission state using the Permissions API if supported
 */
export const checkLocationPermission = async (): Promise<LocationPermissionState> => {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return 'unsupported';
  }
  if (!navigator.permissions || !navigator.permissions.query) {
    return 'prompt';
  }
  try {
    const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return result.state as LocationPermissionState;
  } catch (err) {
    return 'prompt';
  }
};

/**
 * Explicitly triggers location permission request on user tap/gesture
 */
export const requestLocationPermission = async (): Promise<{
  granted: boolean;
  point?: GeoLocationPoint;
  error?: string;
}> => {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return { granted: false, error: 'Este dispositivo o navegador no soporta geolocalización GPS.' };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point: GeoLocationPoint = {
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
          accuracy: Math.round(position.coords.accuracy),
          timestamp: new Date().toISOString(),
        };
        resolve({ granted: true, point });
      },
      (error) => {
        let msg = 'No se pudo obtener la ubicación GPS.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Permiso denegado. Activa el acceso a ubicación en la configuración del teléfono o navegador.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Señal GPS no disponible actualmente.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Tiempo de espera agotado buscando GPS.';
        }
        resolve({ granted: false, error: msg });
      },
      {
        enableHighAccuracy: false, // Low accuracy ensures fast permission prompt and initial fix
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
};

/**
 * Captures current GPS coordinates using high accuracy first, falling back to standard accuracy
 * This prevents timeouts inside warehouses, underground shops, or cold GPS chipstarts on mobile phones.
 */
export const captureCurrentLocation = async (): Promise<GeoLocationPoint | null> => {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return null;
  }

  // Attempt 1: High Accuracy (GPS hardware)
  const tryHighAccuracy = (): Promise<GeoLocationPoint | null> => {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: Number(position.coords.latitude.toFixed(6)),
            longitude: Number(position.coords.longitude.toFixed(6)),
            accuracy: Math.round(position.coords.accuracy),
            timestamp: new Date().toISOString(),
          });
        },
        () => resolve(null),
        {
          enableHighAccuracy: true,
          timeout: 7000,
          maximumAge: 30000,
        }
      );
    });
  };

  // Attempt 2: Fallback (Cell/Wi-Fi positioning, fast and resilient indoors)
  const tryStandardAccuracy = (): Promise<GeoLocationPoint | null> => {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: Number(position.coords.latitude.toFixed(6)),
            longitude: Number(position.coords.longitude.toFixed(6)),
            accuracy: Math.round(position.coords.accuracy),
            timestamp: new Date().toISOString(),
          });
        },
        (error) => {
          console.warn('Geolocation standard fallback failed:', error.message);
          resolve(null);
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  };

  const highAccResult = await tryHighAccuracy();
  if (highAccResult) return highAccResult;

  // Fallback if high accuracy timed out or failed
  return await tryStandardAccuracy();
};

/**
 * Computes distance in meters between two GPS coordinates using Haversine formula
 */
export const calculateDistanceMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
};

/**
 * Returns a human-friendly formatted distance string
 */
export const formatDistance = (meters?: number | null): string => {
  if (meters === undefined || meters === null || isNaN(meters)) return 'Distancia no disponible';
  if (meters < 1000) {
    return `${Math.round(meters)} metros`;
  }
  const km = (meters / 1000).toFixed(1);
  return `${km} km`;
};

/**
 * Returns Google Maps link for easy 1-click verification by administrator
 */
export const getGoogleMapsUrl = (lat: number, lng: number): string => {
  return `https://www.google.com/maps?q=${lat},${lng}`;
};

/**
 * Returns Google Maps directions / comparison link between two points
 */
export const getGoogleMapsDirectionsUrl = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): string => {
  return `https://www.google.com/maps/dir/${lat1},${lng1}/${lat2},${lng2}`;
};

/**
 * Threshold for considering that two people were present in the same physical space
 * (e.g. Almacén or same jobsite)
 */
export const PRESENCE_DISTANCE_THRESHOLD_METERS = 250;
