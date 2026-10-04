/**
 * Calculates the great-circle distance between two points in meters using Haversine formula.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Rounds a coordinate to specified decimal places (default: 4, ~11 meters resolution).
 */
export function roundCoordinate(coord: number, decimals: number = 4): number {
  const factor = Math.pow(10, decimals);
  return Math.round(coord * factor) / factor;
}

/**
 * Formats distance for display (e.g. 2.4 km or 450 m).
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Formats maneuver turn distance in meters or km.
 */
export function formatManeuverDistance(distanceM: number): string {
  if (distanceM >= 1000) {
    return `${(distanceM / 1000).toFixed(1)} km`;
  }
  return `${Math.round(distanceM)} m`;
}

/**
 * Formats 24h time '08:30:00' to friendly '08:30 AM'.
 */
export function formatTimeAmPm(timeStr?: string): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  const hPad = h12 < 10 ? `0${h12}` : `${h12}`;
  return `${hPad}:${minutes} ${ampm}`;
}

export function formatWindow(open?: string, close?: string): string {
  if (!open && !close) return 'Anytime';
  const fOpen = formatTimeAmPm(open);
  const fClose = formatTimeAmPm(close);
  if (fOpen && fClose) return `${fOpen} - ${fClose}`;
  if (fOpen) return `From ${fOpen}`;
  return `Until ${fClose}`;
}
