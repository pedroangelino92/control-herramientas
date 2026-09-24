import { GeoLocationPoint } from '../types';

/**
 * Captures current GPS coordinates using the browser Geolocation API
 */
export const captureCurrentLocation = async (): Promise<GeoLocationPoint | null> => {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return null;
  }

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
        console.warn('Geolocation warning / not available:', error.message);
        // Fallback: resolve null gracefully without breaking transaction
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 9000,
        maximumAge: 15000,
      }
    );
  });
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
