import React from 'react';
import { Crosshair, Plus, Minus, Maximize2, Minimize2 } from 'lucide-react';

interface MapControlsProps {
  onLocate: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleFullScreen?: () => void;
  isFullScreen?: boolean;
}

export const MapControls: React.FC<MapControlsProps> = ({
  onLocate,
  onZoomIn,
  onZoomOut,
  onToggleFullScreen,
  isFullScreen = false,
}) => {
  return (
    <div
      className="waypoint-map-controls"
      style={{
        position: 'absolute',
        right: 16,
        top: isFullScreen ? 180 : 210, // Positioned on right below floating card
        zIndex: 15,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Fullscreen Toggle */}
      {onToggleFullScreen && (
        <button
          type="button"
          onClick={onToggleFullScreen}
          aria-label={isFullScreen ? 'Exit full screen' : 'View full screen map'}
          title={isFullScreen ? 'Exit full screen (Esc)' : 'View full screen map'}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            backgroundColor: isFullScreen ? '#0f172a' : '#FFFFFF',
            color: isFullScreen ? '#facc15' : '#0f172a',
            border: isFullScreen ? '1.5px solid #334155' : '1px solid #e2e8f0',
            boxShadow: '0 4px 16px rgba(15, 23, 42, 0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'transform 0.1s ease, background-color 0.15s ease',
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.94)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          {isFullScreen ? (
            <Minimize2 size={20} strokeWidth={2.4} />
          ) : (
            <Maximize2 size={20} strokeWidth={2.4} />
          )}
        </button>
      )}
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
