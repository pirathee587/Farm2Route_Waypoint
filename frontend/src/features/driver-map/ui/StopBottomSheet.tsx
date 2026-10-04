import React, { useState } from 'react';
import { RouteNextStop, RouteStop, RouteProgress } from '../model/types';
import { formatDistance, formatWindow } from '../lib/geo';
import {
  ChevronUp,
  ChevronDown,
  Clock,
  Navigation2,
  Thermometer,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Hourglass,
  X,
} from 'lucide-react';

interface StopBottomSheetProps {
  nextStop: RouteNextStop | null;
  stops: RouteStop[];
  progress: RouteProgress;
  onViewStop: (stopId: string) => void;
  onViewSummary?: () => void;
}

export const StopBottomSheet: React.FC<StopBottomSheetProps> = ({
  nextStop,
  stops,
  progress,
  onViewStop,
  onViewSummary,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showAllStopsModal, setShowAllStopsModal] = useState<boolean>(false);

  const completed = progress?.completed ?? 0;
  const total = progress?.total ?? stops.length ?? 8;
  const progressPercent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

  if (!nextStop) {
    return (
      <div
        className="waypoint-bottom-sheet"
        style={{
          position: 'absolute',
          bottom: 72, // Above bottom tab bar
          left: 0,
          right: 0,
          backgroundColor: '#FFFFFF',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          boxShadow: '0 -8px 30px rgba(15, 23, 42, 0.12)',
          padding: '20px 20px 24px 20px',
          zIndex: 20,
          borderTop: '1px solid #e2e8f0',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              backgroundColor: '#dcfce7',
              color: '#15803d',
              margin: '0 auto 12px auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircle2 size={30} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
            All Stops Completed!
          </h3>
          <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px 0', fontWeight: 500 }}>
            {completed} of {total} stops finished. Ready to close out your route.
          </p>

          {onViewSummary && (
            <button
              type="button"
              onClick={onViewSummary}
              style={{
                width: '100%',
                padding: '14px 0',
                backgroundColor: '#EDC843',
                color: '#0f172a',
                borderRadius: 16,
                fontWeight: 800,
                fontSize: 15,
                border: 'none',
                cursor: 'pointer',
                minHeight: 48,
              }}
            >
              View Trip Summary
            </button>
          )}
        </div>
      </div>
    );
  }

  const windowText = formatWindow(nextStop.window_open, nextStop.window_close);
  const distText = formatDistance(nextStop.distance_km || 0);
  const etaText = `~${nextStop.eta_min || 0} min`;
  const tempText = nextStop.temperature || 'Ambient';
  const constraintText = nextStop.constraint || 'Normal';

  return (
    <>
      <div
        className="waypoint-bottom-sheet"
        style={{
          position: 'absolute',
          bottom: 70, // Sits above bottom tab bar
          left: 0,
          right: 0,
          backgroundColor: '#FFFFFF',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          boxShadow: '0 -8px 36px rgba(15, 23, 42, 0.16)',
          zIndex: 20,
          borderTop: '1px solid rgba(226, 232, 240, 0.8)',
          transition: 'max-height 0.25s ease-in-out',
          maxHeight: isExpanded ? '520px' : '280px',
          overflowY: 'auto',
        }}
      >
        {/* Draggable Handle */}
        <div
          role="button"
          tabIndex={0}
          aria-label={isExpanded ? 'Collapse bottom sheet' : 'Expand bottom sheet'}
          onClick={() => setIsExpanded(!isExpanded)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setIsExpanded(!isExpanded);
            }
          }}
          style={{
            padding: '10px 0 6px 0',
            display: 'flex',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 44,
              height: 5,
              borderRadius: 3,
              backgroundColor: '#cbd5e1',
            }}
          />
        </div>

        <div style={{ padding: '0 20px 20px 20px' }}>
          {/* Header Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 4,
            }}
          >
            <div>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: '#2563eb',
                  letterSpacing: '0.6px',
                  textTransform: 'uppercase',
                }}
              >
                NEXT STOP
              </span>
              <h3
                style={{
                  fontSize: 19,
                  fontWeight: 800,
                  color: '#0f172a',
                  margin: '2px 0 0 0',
                  letterSpacing: '-0.3px',
                }}
              >
                {nextStop.name}
              </h3>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginTop: 1 }}>
                {nextStop.outlet_id} • {nextStop.district || 'Western'}
              </div>
            </div>

            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                padding: '4px 10px',
                borderRadius: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
              }}
            >
              {(nextStop.status || 'IN_PROGRESS').replaceAll('_', ' ')}
            </span>
          </div>

          {/* Info Tiles Row 1: Delivery Window, Distance, ETA */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              marginTop: 12,
            }}
          >
            <div
              style={{
                backgroundColor: '#f8fafc',
                padding: '8px 10px',
                borderRadius: 12,
                border: '1px solid #f1f5f9',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 10.5,
                  color: '#64748b',
                  fontWeight: 700,
                }}
              >
                <Clock size={12} color="#64748b" /> WINDOW
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 800,
                  color: '#0f172a',
                  marginTop: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {windowText}
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#f8fafc',
                padding: '8px 10px',
                borderRadius: 12,
                border: '1px solid #f1f5f9',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 10.5,
                  color: '#64748b',
                  fontWeight: 700,
                }}
              >
                <Navigation2 size={12} color="#64748b" /> DISTANCE
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: '#0f172a',
                  marginTop: 2,
                }}
              >
                {distText}
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#f8fafc',
                padding: '8px 10px',
                borderRadius: 12,
                border: '1px solid #f1f5f9',
              }}
            >
              <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 700 }}>EST. TIME</div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: '#2563eb',
                  marginTop: 2,
                }}
              >
                {etaText}
              </div>
            </div>
          </div>

          {/* Info Tiles Row 2: Temperature & Constraint */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 8,
              marginTop: 8,
            }}
          >
            <div
              style={{
                backgroundColor: '#f8fafc',
                padding: '8px 10px',
                borderRadius: 12,
                border: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Thermometer size={16} color="#0284c7" />
              <div>
                <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>TEMP</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{tempText}</div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#f8fafc',
                padding: '8px 10px',
                borderRadius: 12,
                border: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <ShieldAlert size={16} color="#d97706" />
              <div>
                <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>CONSTRAINT</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>
                  {constraintText}
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar Row */}
          <div style={{ marginTop: 14 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
                fontWeight: 700,
                color: '#475569',
                marginBottom: 6,
              }}
            >
              <span>Route Progress</span>
              <span style={{ color: '#0f172a', fontWeight: 800 }}>
                {completed} of {total} stops ({progressPercent}%)
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: 8,
                backgroundColor: '#e2e8f0',
                borderRadius: 999,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  backgroundColor: '#16a34a', // Green progress
                  borderRadius: 999,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              gap: 10,
              marginTop: 14,
            }}
          >
            {/* View Stop Button (Yellow #EDC843) */}
            <button
              type="button"
              onClick={() => onViewStop(nextStop.stop_id)}
              style={{
                flex: 1.2,
                padding: '13px 0',
                backgroundColor: '#EDC843',
                color: '#0f172a',
                borderRadius: 14,
                fontWeight: 800,
                fontSize: 14,
                border: 'none',
                cursor: 'pointer',
                minHeight: 46,
                boxShadow: '0 2px 8px rgba(237, 200, 67, 0.35)',
              }}
            >
              View Stop
            </button>

            {/* Route Details Button (White) */}
            <button
              type="button"
              onClick={() => setShowAllStopsModal(true)}
              style={{
                flex: 1,
                padding: '13px 0',
                backgroundColor: '#FFFFFF',
                color: '#0f172a',
                borderRadius: 14,
                fontWeight: 700,
                fontSize: 14,
                border: '1px solid #cbd5e1',
                cursor: 'pointer',
                minHeight: 46,
              }}
            >
              Route Details
            </button>
          </div>

          {/* Driver Safety Notice */}
          <div
            style={{
              fontSize: 11,
              color: '#94a3b8',
              textAlign: 'center',
              marginTop: 10,
              fontWeight: 600,
            }}
          >
            Interact only when safely stopped.
          </div>
        </div>
      </div>

      {/* All Stops Route Details Modal */}
      {showAllStopsModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Route Details Stop List"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
          onClick={() => setShowAllStopsModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 440,
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: '80vh',
              overflowY: 'auto',
              padding: '20px 20px 30px 20px',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                All Stops ({stops.length})
              </h2>
              <button
                type="button"
                onClick={() => setShowAllStopsModal(false)}
                aria-label="Close route details"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: '#f1f5f9',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={18} color="#64748b" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stops.map((stop) => {
                const norm = (stop.status || '').toUpperCase();
                let statusBadge = (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#64748b',
                      backgroundColor: '#f1f5f9',
                      padding: '3px 8px',
                      borderRadius: 6,
                    }}
                  >
                    Pending
                  </span>
                );
                if (norm === 'DELIVERED') {
                  statusBadge = (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#15803d',
                        backgroundColor: '#dcfce7',
                        padding: '3px 8px',
                        borderRadius: 6,
                      }}
                    >
                      ✓ Delivered
                    </span>
                  );
                } else if (norm === 'NOT_DELIVERED') {
                  statusBadge = (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#b91c1c',
                        backgroundColor: '#fee2e2',
                        padding: '3px 8px',
                        borderRadius: 6,
                      }}
                    >
                      ! Not Delivered
                    </span>
                  );
                } else if (norm === 'PARTIAL') {
                  statusBadge = (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#b45309',
                        backgroundColor: '#fef3c7',
                        padding: '3px 8px',
                        borderRadius: 6,
                      }}
                    >
                      Partial
                    </span>
                  );
                } else if (stop.stop_id === nextStop.stop_id) {
                  statusBadge = (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#1d4ed8',
                        backgroundColor: '#dbeafe',
                        padding: '3px 8px',
                        borderRadius: 6,
                      }}
                    >
                      Next Stop
                    </span>
                  );
                }

                return (
                  <div
                    key={stop.stop_id || stop.seq}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: 14,
                      backgroundColor:
                        stop.stop_id === nextStop.stop_id ? '#eff6ff' : '#f8fafc',
                      border:
                        stop.stop_id === nextStop.stop_id
                          ? '1px solid #bfdbfe'
                          : '1px solid #f1f5f9',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          backgroundColor:
                            stop.stop_id === nextStop.stop_id ? '#2563eb' : '#0f172a',
                          color: '#FFFFFF',
                          fontSize: 12,
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {stop.seq}
                      </div>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                          {stop.name}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          {stop.outlet_id} • {formatWindow(stop.window_open, stop.window_close)}
                        </div>
                      </div>
                    </div>

                    {statusBadge}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
