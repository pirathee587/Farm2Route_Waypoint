import React from 'react';
import {
  CornerUpLeft,
  CornerUpRight,
  ArrowUp,
  RotateCcw,
  MapPin,
  GitFork,
  Navigation,
} from 'lucide-react';

export type NormalizedManeuver =
  | 'left'
  | 'right'
  | 'straight'
  | 'uturn'
  | 'arrive'
  | 'fork'
  | 'default';

/**
 * Normalizes maneuver string from Directions / routing engine into a standard key.
 */
export function normalizeManeuver(raw?: string): NormalizedManeuver {
  if (!raw) return 'straight';
  const m = raw.toLowerCase().trim();

  if (m.includes('uturn') || m.includes('u-turn')) return 'uturn';
  if (m.includes('arrive') || m.includes('destination') || m.includes('reach')) return 'arrive';
  if (m.includes('left')) return 'left';
  if (m.includes('right')) return 'right';
  if (m.includes('fork')) return 'fork';
  if (m.includes('straight') || m.includes('continue') || m.includes('forward')) return 'straight';

  return 'straight';
}

interface ManeuverIconProps {
  maneuver?: string;
  size?: number;
  className?: string;
  color?: string;
}

export const ManeuverIcon: React.FC<ManeuverIconProps> = ({
  maneuver,
  size = 20,
  className = '',
  color = 'currentColor',
}) => {
  const norm = normalizeManeuver(maneuver);

  switch (norm) {
    case 'left':
      return <CornerUpLeft size={size} className={className} color={color} aria-label="Turn left" />;
    case 'right':
      return <CornerUpRight size={size} className={className} color={color} aria-label="Turn right" />;
    case 'uturn':
      return <RotateCcw size={size} className={className} color={color} aria-label="Make U-turn" />;
    case 'arrive':
      return <MapPin size={size} className={className} color={color} aria-label="Arrive at destination" />;
    case 'fork':
      return <GitFork size={size} className={className} color={color} aria-label="Fork in road" />;
    case 'straight':
    default:
      return <ArrowUp size={size} className={className} color={color} aria-label="Continue straight" />;
  }
};
