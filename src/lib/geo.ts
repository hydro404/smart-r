import type { Coordinates } from "../types";

export function haversine(a: Coordinates, b: Coordinates) {
  const radius = 6_371_000;
  const latA = (a[1] * Math.PI) / 180;
  const latB = (b[1] * Math.PI) / 180;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters >= 10_000 ? 1 : 2)} km`;
}

export function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds)) return "—";
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours} hr${remaining ? ` ${remaining} min` : ""}`;
}

export function interpolateRoute(coordinates: Coordinates[], progress: number): Coordinates {
  if (!coordinates.length) return [123.659158, 13.18669];
  if (coordinates.length === 1) return coordinates[0];
  const clamped = Math.max(0, Math.min(1, progress));
  const segmentProgress = clamped * (coordinates.length - 1);
  const index = Math.min(coordinates.length - 2, Math.floor(segmentProgress));
  const ratio = segmentProgress - index;
  const a = coordinates[index];
  const b = coordinates[index + 1];
  return [a[0] + (b[0] - a[0]) * ratio, a[1] + (b[1] - a[1]) * ratio];
}
