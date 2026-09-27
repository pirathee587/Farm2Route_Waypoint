import React from 'react';
import containerRouteImg from '@/assets/container-route.png';

/**
 * Desktop Illustration Panel:
 * Completely covers the right side edge-to-edge without any gaps or borders.
 */
export const DesktopRightPanel: React.FC = () => {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        margin: 0,
        padding: 0,
      }}
    >
      <img
        src={containerRouteImg}
        alt="Waypoint 3D Container Route Illustration"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center 20%',
          display: 'block',
        }}
      />
    </div>
  );
};

/**
 * Mobile Top Map Background:
 * Uses the top route area from the new photo behind the WP Monogram logo.
 */
export const MobileTopMapBackground: React.FC = () => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#1E293B',
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <img
        src={containerRouteImg}
        alt="Route Map Background"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center 15%',
          transform: 'scale(1.12)',
          opacity: 0.75,
          filter: 'brightness(0.95) contrast(1.05)',
          display: 'block',
        }}
      />

      {/* Soft gradient overlay for smooth contrast while keeping map clearly visible */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.15) 0%, rgba(15, 23, 42, 0.45) 100%)',
        }}
      />
    </div>
  );
};
