import React from 'react';
import { RouteNextStop, RouteInstruction } from '../model/types';
import { ManeuverIcon } from '../lib/maneuverIcon';
import { formatDistance, formatManeuverDistance, formatWindow } from '../lib/geo';
import { CheckCircle2, AlertTriangle, WifiOff, MapPinOff } from 'lucide-react';

interface NextStopCardProps {
  nextStop: RouteNextStop | null;
  nextInstruction: RouteInstruction | null;
  isFallbackSource?: boolean;
  isOfflineCache?: boolean;
  locationPermissionDenied?: boolean;
  onViewSummary?: () => void;
}

export const NextStopCard: React.FC<NextStopCardProps> = ({
  nextStop,
  nextInstruction,
  isFallbackSource = false,
  isOfflineCache = false,
  locationPermissionDenied = false,
  onViewSummary,
}) => {
  // If next_stop is null: all stops completed
  if (!nextStop) {
    return (
      <div
        className="waypoint-next-stop-floating-card animate-fade-in"
        style={{
          position: 'absolute',
          top: 14,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)',
          maxWidth: 480,
          zIndex: 15,
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: '16px 18px',
          boxShadow: '0 8px 30px rgba(15, 23, 42, 0.15)',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: '#dcfce7',
              color: '#15803d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: '#0f172a',
                margin: 0,
              }}
            >
              All Stops Completed!
            </h2>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2, fontWeight: 500 }}>
              All delivery stops for this trip are finished.
            </div>
          </div>
        </div>

        {onViewSummary && (
          <button
            type="button"
            onClick={onViewSummary}
            style={{
              width: '100%',
              marginTop: 14,
              padding: '11px 0',
              backgroundColor: '#facc15',
              color: '#0f172a',
              borderRadius: 12,
              fontWeight: 800,
              fontSize: 13.5,
              border: 'none',
              cursor: 'pointer',
              minHeight: 44,
            }}
          >
            View Trip Summary
          </button>
        )}
      </div>
    );
  }

  const windowText = formatWindow(nextStop.window_open, nextStop.window_close);
  const distText = formatDistance(nextStop.distance_km || 0);
  const etaText = `~${nextStop.eta_min || 0} min`;

  return (
    <div
      className="waypoint-next-stop-floating-card animate-fade-in"
      style={{
        position: 'absolute',
        top: 14,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: 480,
        zIndex: 15,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: '16px 18px',
        boxShadow: '0 8px 32px rgba(15, 23, 42, 0.16)',
        border: '1px solid rgba(226, 232, 240, 0.9)',
      }}
    >
      {/* Top Meta Row: Label, Status Chip, Badges */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: '#2563eb',
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
          }}
        >
          NEXT STOP
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isOfflineCache && (
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: '#64748b',
                backgroundColor: '#f1f5f9',
                padding: '3px 8px',
                borderRadius: 8,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <WifiOff size={11} /> Offline - cached
            </span>
          )}

          {isFallbackSource && !isOfflineCache && (
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: '#475569',
                backgroundColor: '#f1f5f9',
                padding: '3px 8px',
                borderRadius: 8,
              }}
            >
              Estimated route
            </span>
          )}

          {locationPermissionDenied && (
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: '#ea580c',
                backgroundColor: '#ffedd5',
                padding: '3px 8px',
                borderRadius: 8,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <MapPinOff size={11} /> Location off
            </span>
          )}

          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              padding: '3px 9px',
              borderRadius: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
            }}
          >
            {(nextStop.status || 'IN_PROGRESS').replaceAll('_', ' ')}
          </span>
        </div>
      </div>

      {/* Outlet Name & Key Metrics */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: '#0f172a',
            margin: 0,
            letterSpacing: '-0.3px',
          }}
        >
          {nextStop.name}
        </h2>
      </div>

      <div
        style={{
          fontSize: 12.5,
          fontWeight: 600,
          color: '#64748b',
          marginTop: 2,
          display: 'flex',
          gap: 6,
          alignItems: 'center',
        }}
      >
        <span>{nextStop.outlet_id}</span>
        <span>•</span>
        <span>{distText}</span>
        <span>•</span>
        <span style={{ color: '#0f172a', fontWeight: 700 }}>{etaText}</span>
      </div>

      {/* Divider */}
      <hr
        style={{
          border: 'none',
          height: '1px',
          backgroundColor: '#f1f5f9',
          margin: '12px 0 10px 0',
        }}
      />

      {/* Navigation instruction snippet */}
      {nextInstruction ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              backgroundColor: '#2563eb',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ManeuverIcon maneuver={nextInstruction.maneuver} size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13.5,
                fontWeight: 800,
                color: '#0f172a',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {nextInstruction.text || 'Proceed along recommended route'}
            </div>
            <div style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600, marginTop: 1 }}>
              {nextInstruction.distance_m
                ? `In ${formatManeuverDistance(nextInstruction.distance_m)} • `
                : ''}
              Window {windowText}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
          Delivery Window: {windowText}
        </div>
      )}
    </div>
  );
};
