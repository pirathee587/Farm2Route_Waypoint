import React from 'react';
import { Crosshair, Plus, Minus } from 'lucide-react';

interface MapControlsProps {
  onLocate: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({
  onLocate,
  onZoomIn,
  onZoomOut,
}) => {
  return (
    <div
      className="waypoint-map-controls"
      style={{
        position: 'absolute',
        right: 16,
        top: 210, // Positioned on right below floating card
        zIndex: 15,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Locate Driver */}
      <button
        type="button"
        onClick={onLocate}
        aria-label="Locate vehicle position"
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          backgroundColor: '#FFFFFF',
          color: '#0f172a',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'transform 0.1s ease, background-color 0.15s ease',
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.94)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <Crosshair size={20} strokeWidth={2.4} color="#2563eb" />
      </button>

      {/* Zoom In */}
      <button
        type="button"
        onClick={onZoomIn}
        aria-label="Zoom in on map"
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          backgroundColor: '#FFFFFF',
          color: '#0f172a',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'transform 0.1s ease',
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.94)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <Plus size={20} strokeWidth={2.4} />
      </button>

      {/* Zoom Out */}
      <button
        type="button"
        onClick={onZoomOut}
        aria-label="Zoom out on map"
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          backgroundColor: '#FFFFFF',
          color: '#0f172a',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'transform 0.1s ease',
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.94)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <Minus size={20} strokeWidth={2.4} />
      </button>
    </div>
  );
};
