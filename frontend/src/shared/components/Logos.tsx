import React from 'react';
import waypointLogoImg from '@/assets/waypoint-logo.png';

/**
 * Desktop Waypoint Brand Logo:
 * Uses the official 3D isometric WP cube logo + "Waypoint."
 */
export const WaypointDesktopLogo: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} className={className}>
      <img
        src={waypointLogoImg}
        alt="Waypoint Logo"
        style={{
          width: '40px',
          height: '40px',
          objectFit: 'contain',
          filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.12))',
          userSelect: 'none',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'baseline' }}>
        <span style={{ fontSize: '24px', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>
          Waypoint
        </span>
        <span style={{ fontSize: '28px', fontWeight: 900, color: '#F59E0B', lineHeight: 0.5, marginLeft: '1px' }}>
          .
        </span>
      </div>
    </div>
  );
};

/**
 * Mobile Hexagon Monogram Logo:
 * Uses the official 3D isometric WP cube logo + crisp white "Waypoint" text
 * Matching Screenshot 5.
 */
export const WaypointMobileHexLogo: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        userSelect: 'none',
      }}
      className={className}
    >
      {/* Official 3D Isometric WP Monogram */}
      <img
        src={waypointLogoImg}
        alt="Waypoint Monogram"
        style={{
          width: '74px',
          height: '74px',
          objectFit: 'contain',
          filter: 'drop-shadow(0 8px 24px rgba(0, 0, 0, 0.6))',
        }}
      />

      {/* White Waypoint Title */}
      <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '2px' }}>
        <span
          style={{
            fontSize: '26px',
            fontWeight: 800,
            color: '#FFFFFF',
            letterSpacing: '-0.02em',
            textShadow: '0 2px 10px rgba(0,0,0,0.6)',
          }}
        >
          Waypoint
        </span>
        <span
          style={{
            fontSize: '30px',
            fontWeight: 900,
            color: '#F59E0B',
            lineHeight: 0.5,
            marginLeft: '2px',
          }}
        >
          .
        </span>
      </div>
    </div>
  );
};
