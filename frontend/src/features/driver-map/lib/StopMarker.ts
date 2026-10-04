import { RouteStop } from '../model/types';

export interface MarkerStyleInfo {
  bgColor: string;
  textColor: string;
  borderColor: string;
  label: string;
  hasHalo: boolean;
  size: number;
}

/**
 * Returns color, size, and label for each stop status.
 * Requirement:
 * - Delivered: green with white check
 * - Not delivered: red with '!'
 * - Partial: amber
 * - Pending: yellow with number
 * - Next/in-progress: blue, larger, with a translucent halo ring
 */
export function getMarkerStyle(status: string, seq: number, isNext: boolean): MarkerStyleInfo {
  const norm = (status || '').toUpperCase();

  if (isNext || norm === 'IN_PROGRESS' || norm === 'ARRIVED') {
    return {
      bgColor: '#2F6FED', // Modern WayPoint blue
      textColor: '#FFFFFF',
      borderColor: '#FFFFFF',
      label: `${seq}`,
      hasHalo: true,
      size: 38,
    };
  }

  switch (norm) {
    case 'DELIVERED':
      return {
        bgColor: '#16a34a', // Green
        textColor: '#FFFFFF',
        borderColor: '#FFFFFF',
        label: '✓',
        hasHalo: false,
        size: 30,
      };

    case 'NOT_DELIVERED':
      return {
        bgColor: '#dc2626', // Red
        textColor: '#FFFFFF',
        borderColor: '#FFFFFF',
        label: '!',
        hasHalo: false,
        size: 30,
      };

    case 'PARTIAL':
      return {
        bgColor: '#d97706', // Amber
        textColor: '#FFFFFF',
        borderColor: '#FFFFFF',
        label: `${seq}`,
        hasHalo: false,
        size: 30,
      };

    case 'WAITING_FOR_WINDOW':
      return {
        bgColor: '#eab308',
        textColor: '#0f172a',
        borderColor: '#FFFFFF',
        label: `${seq}`,
        hasHalo: true,
        size: 34,
      };

    case 'PENDING':
    default:
      return {
        bgColor: '#facc15', // Yellow
        textColor: '#0f172a',
        borderColor: '#FFFFFF',
        label: `${seq}`,
        hasHalo: false,
        size: 30,
      };
  }
}

/**
 * Exclude REMOVED stops as per requirement.
 */
export function filterVisibleStops(stops: RouteStop[]): RouteStop[] {
  if (!stops) return [];
  return stops.filter(
    (s) =>
      (s.status || '').toUpperCase() !== 'REMOVED' &&
      Number.isFinite(s.lat) &&
      Number.isFinite(s.lng) &&
      (s.lat !== 0 || s.lng !== 0) &&
      s.lat >= -90 &&
      s.lat <= 90 &&
      s.lng >= -180 &&
      s.lng <= 180
  );
}

/**
 * Creates custom HTML DOM element for Mapbox stop markers.
 */
export function createStopMarkerElement(
  stop: RouteStop,
  isNext: boolean,
  onClick?: () => void
): HTMLElement {
  const style = getMarkerStyle(stop.status, stop.seq, isNext);

  const container = document.createElement('div');
  container.className = 'waypoint-stop-marker-wrap';
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.cursor = 'pointer';
  container.style.userSelect = 'none';
  container.setAttribute('role', 'button');
  container.setAttribute('aria-label', `Stop ${stop.seq}: ${stop.name}, status ${stop.status}`);

  // Pin Circle
  const circle = document.createElement('div');
  circle.className = `waypoint-stop-pin ${style.hasHalo ? 'has-halo' : ''}`;
  circle.style.width = `${style.size}px`;
  circle.style.height = `${style.size}px`;
  circle.style.borderRadius = '50%';
  circle.style.backgroundColor = style.bgColor;
  circle.style.color = style.textColor;
  circle.style.border = `2.5px solid ${style.borderColor}`;
  circle.style.boxShadow = style.hasHalo
    ? '0 0 0 7px rgba(47, 111, 237, 0.28), 0 4px 12px rgba(0,0,0,0.22)'
    : '0 2px 8px rgba(0,0,0,0.18)';
  circle.style.display = 'flex';
  circle.style.alignItems = 'center';
  circle.style.justifyContent = 'center';
  circle.style.fontWeight = '800';
  circle.style.fontSize = style.label === '✓' || style.label === '!' ? '15px' : '13px';
  circle.style.transition = 'transform 0.2s ease';
  circle.innerText = style.label;

  container.appendChild(circle);

  // Label beside marker: "Keells - K-Zone Moratuwa · OUT027"
  const label = document.createElement('div');
  label.className = 'waypoint-stop-label';
  label.style.marginLeft = '8px';
  label.style.backgroundColor = 'rgba(15, 23, 42, 0.88)';
  label.style.color = '#FFFFFF';
  label.style.padding = '3px 8px';
  label.style.borderRadius = '8px';
  label.style.fontSize = '11px';
  label.style.fontWeight = '700';
  label.style.whiteSpace = 'nowrap';
  label.style.boxShadow = '0 2px 8px rgba(0,0,0,0.18)';
  label.style.pointerEvents = 'none';
  label.style.border = '1px solid rgba(255,255,255,0.1)';
  label.innerText = `${stop.name} · ${stop.outlet_id}`;

  container.appendChild(label);

  if (onClick) {
    container.addEventListener('click', onClick);
  }

  return container;
}

/**
 * Creates custom HTML element for Depot marker.
 * Black dot with "DEPOT" label.
 */
export function createDepotMarkerElement(name: string = 'Depot'): HTMLElement {
  const container = document.createElement('div');
  container.className = 'waypoint-depot-marker-wrap';
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.cursor = 'default';

  const dot = document.createElement('div');
  dot.style.width = '24px';
  dot.style.height = '24px';
  dot.style.borderRadius = '50%';
  dot.style.backgroundColor = '#0f172a';
  dot.style.border = '3px solid #facc15'; // Accent border
  dot.style.boxShadow = '0 2px 10px rgba(0,0,0,0.25)';

  container.appendChild(dot);

  const label = document.createElement('div');
  label.style.marginLeft = '6px';
  label.style.backgroundColor = '#0f172a';
  label.style.color = '#facc15';
  label.style.padding = '3px 7px';
  label.style.borderRadius = '6px';
  label.style.fontSize = '10px';
  label.style.fontWeight = '800';
  label.style.letterSpacing = '0.5px';
  label.style.textTransform = 'uppercase';
  label.innerText = 'DEPOT';

  container.appendChild(label);
  return container;
}

/**
 * Creates custom pulsing blue dot for Driver current location.
 */
export function createDriverMarkerElement(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'waypoint-driver-marker-wrap';
  container.style.position = 'relative';
  container.style.width = '26px';
  container.style.height = '26px';
  container.style.overflow = 'visible';
  container.setAttribute('aria-label', 'Your vehicle location');

  // Pulsing ring
  const pulse = document.createElement('div');
  pulse.className = 'waypoint-driver-pulse';
  pulse.style.position = 'absolute';
  pulse.style.top = '0';
  pulse.style.left = '0';
  pulse.style.width = '100%';
  pulse.style.height = '100%';
  pulse.style.borderRadius = '50%';
  pulse.style.backgroundColor = 'rgba(47, 111, 237, 0.4)';
  pulse.style.animation = 'driverPulse 2s infinite ease-out';

  // Inner dot
  const dot = document.createElement('div');
  dot.style.position = 'absolute';
  dot.style.top = '4px';
  dot.style.left = '4px';
  dot.style.width = '18px';
  dot.style.height = '18px';
  dot.style.borderRadius = '50%';
  dot.style.backgroundColor = '#2563eb';
  dot.style.border = '2.5px solid #FFFFFF';
  dot.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';

  container.appendChild(pulse);
  container.appendChild(dot);

  const label = document.createElement('div');
  label.className = 'waypoint-driver-label';
  label.style.position = 'absolute';
  label.style.top = '31px';
  label.style.left = '50%';
  label.style.transform = 'translateX(-50%)';
  label.style.padding = '4px 9px';
  label.style.borderRadius = '10px';
  label.style.backgroundColor = '#2563eb';
  label.style.color = '#FFFFFF';
  label.style.fontSize = '11px';
  label.style.fontWeight = '800';
  label.style.whiteSpace = 'nowrap';
  label.style.boxShadow = '0 3px 10px rgba(37, 99, 235, 0.3)';
  label.style.border = '2px solid #FFFFFF';
  label.style.pointerEvents = 'none';
  label.innerText = 'Your location';
  container.appendChild(label);

  return container;
}
