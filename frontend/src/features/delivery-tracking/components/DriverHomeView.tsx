import React, { useState } from 'react';
import {
  Bell,
  ChevronRight,
  ChevronDown,
  Navigation,
  Phone,
  Check,
  Box,
} from 'lucide-react';

interface DriverHomeViewProps {
  onSelectStop: (stopId: string) => void;
  onOpenNotifications: () => void;
  onOpenMap: () => void;
}

export const DriverHomeView: React.FC<DriverHomeViewProps> = ({
  onSelectStop,
  onOpenNotifications,
  onOpenMap,
}) => {
  const [selectedTrip, setSelectedTrip] = useState<'trip1' | 'trip2'>('trip1');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [expandedStops, setExpandedStops] = useState<boolean>(false);
  const [callAlert, setCallAlert] = useState<boolean>(false);

  const handleCallDispatcher = () => {
    setCallAlert(true);
    setTimeout(() => setCallAlert(false), 3000);
  };

  return (
    <div
      className="driver-screen-content animate-fade-in"
      style={{
        padding: '0 0 100px 0',
        backgroundColor: '#f8fafc',
      }}
    >
      {/* Top Dark Header */}
      <header
        style={{
          backgroundColor: '#0a0e17',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Waypoint Yellow Icon */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: '#facc15',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0a0e17',
              boxShadow: '0 2px 8px rgba(250, 204, 21, 0.4)',
            }}
          >
            <Box size={20} strokeWidth={2.6} />
          </div>
          <span
            style={{
              color: '#facc15',
              fontSize: 18,
              fontWeight: 800,
              fontStyle: 'italic',
              letterSpacing: '-0.3px',
            }}
          >
            Waypoint
          </span>
        </div>

        {/* Bell Icon with notification dot */}
        <button
          type="button"
          onClick={onOpenNotifications}
          aria-label="Notifications"
          style={{
            background: 'none',
            border: 'none',
            color: '#cbd5e1',
            cursor: 'pointer',
            padding: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <Bell size={22} strokeWidth={2.2} />
          <span
            style={{
              position: 'absolute',
              top: 4,
              right: 6,
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#ef4444',
            }}
          />
        </button>
      </header>

      {/* Main Inner Content */}
      <div style={{ padding: '20px 20px 0 20px' }}>
        {/* Call Dispatcher Feedback Toast */}
        {callAlert && (
          <div
            style={{
              backgroundColor: '#0f172a',
              color: '#facc15',
              padding: '10px 16px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>📞 Calling Dispatcher (+94 11 234 5678)...</span>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>Connected</span>
          </div>
        )}

        {/* Welcome Greeting */}
        <div style={{ marginBottom: 18 }}>
          <h1
            style={{
              fontSize: 27,
              fontWeight: 900,
              color: '#0f172a',
              margin: '0 0 4px 0',
              letterSpacing: '-0.5px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Welcome, Kumar <span style={{ fontSize: 26 }}>👋</span>
          </h1>
          <p
            style={{
              fontSize: 14,
              color: '#64748b',
              margin: 0,
              fontWeight: 500,
            }}
          >
            Here is your route for today.
          </p>
        </div>

        {/* Vehicle & Online Status Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 20,
            border: '1px solid #f1f5f9',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
            marginBottom: 16,
          }}
        >
          {/* Left Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                backgroundColor: '#f1f5f9',
                color: '#0f172a',
                fontSize: 12.5,
                fontWeight: 800,
                padding: '6px 14px',
                borderRadius: 20,
                letterSpacing: '0.3px',
              }}
            >
              VEH014
            </span>
            <div
              style={{
                backgroundColor: '#f1f5f9',
                color: '#0f172a',
                fontSize: 12.5,
                fontWeight: 700,
                padding: '6px 12px',
                borderRadius: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
              }}
            >
              <span>Today</span>
              <ChevronDown size={14} strokeWidth={2.5} />
            </div>
          </div>

          {/* Right Status */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <button
              type="button"
              onClick={() => setIsOnline(!isOnline)}
              style={{
                backgroundColor: isOnline ? '#dcfce7' : '#f1f5f9',
                color: isOnline ? '#15803d' : '#64748b',
                border: 'none',
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  backgroundColor: isOnline ? '#22c55e' : '#94a3b8',
                }}
              />
              {isOnline ? 'Online' : 'Offline'}
            </button>
            <button
              type="button"
              onClick={() => setIsOnline(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 11,
                fontWeight: 700,
                color: '#ea580c',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: 0,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: '#ea580c',
                }}
              />
              Work Offline
            </button>
          </div>
        </div>

        {/* Trip Toggles */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <button
            type="button"
            onClick={() => setSelectedTrip('trip1')}
            style={{
              flex: 1,
              padding: '14px 16px',
              borderRadius: 18,
              border: selectedTrip === 'trip1' ? 'none' : '1px solid #e2e8f0',
              backgroundColor: selectedTrip === 'trip1' ? '#facc15' : '#ffffff',
              color: selectedTrip === 'trip1' ? '#0f172a' : '#64748b',
              fontSize: 15,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow:
                selectedTrip === 'trip1'
                  ? '0 4px 14px rgba(250, 204, 21, 0.4)'
                  : '0 2px 6px rgba(0, 0, 0, 0.02)',
              transition: 'all 0.2s ease',
            }}
          >
            Trip 1
          </button>
          <button
            type="button"
            onClick={() => setSelectedTrip('trip2')}
            style={{
              flex: 1,
              padding: '14px 16px',
              borderRadius: 18,
              border: selectedTrip === 'trip2' ? 'none' : '1px solid #e2e8f0',
              backgroundColor: selectedTrip === 'trip2' ? '#facc15' : '#ffffff',
              color: selectedTrip === 'trip2' ? '#0f172a' : '#64748b',
              fontSize: 15,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow:
                selectedTrip === 'trip2'
                  ? '0 4px 14px rgba(250, 204, 21, 0.4)'
                  : '0 2px 6px rgba(0, 0, 0, 0.02)',
              transition: 'all 0.2s ease',
            }}
          >
            Trip 2
          </button>
        </div>

        {/* Route Progress Card */}
        {selectedTrip === 'trip1' ? (
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 22,
              border: '1px solid #f1f5f9',
              padding: '16px 20px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
              marginBottom: 24,
            }}
          >
            {/* Trip identifier */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11.5,
                fontWeight: 800,
                color: '#d97706',
                marginBottom: 10,
                letterSpacing: '0.4px',
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  backgroundColor: '#ea580c',
                }}
              />
              •TRIP-0925-014
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              {/* Progress Left Info */}
              <div style={{ flex: 1, paddingRight: 16 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    marginBottom: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: 14.5,
                      fontWeight: 800,
                      color: '#0f172a',
                    }}
                  >
                    Route progress
                  </span>
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: '#0f172a',
                    }}
                  >
                    2 of 8
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    color: '#64748b',
                    marginBottom: 8,
                  }}
                >
                  <span>Completed</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>25%</span>
                </div>

                {/* Progress Bar */}
                <div
                  style={{
                    width: '100%',
                    height: 7,
                    borderRadius: 6,
                    backgroundColor: '#f1f5f9',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: '25%',
                      height: '100%',
                      backgroundColor: '#facc15',
                      borderRadius: 6,
                    }}
                  />
                </div>
              </div>

              {/* Call Dispatcher Button */}
              <button
                type="button"
                onClick={handleCallDispatcher}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    backgroundColor: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#334155',
                    marginBottom: 4,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Phone size={20} strokeWidth={2.2} />
                </div>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 600,
                    color: '#64748b',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Call Dispatcher
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 22,
              border: '1px solid #f1f5f9',
              padding: '16px 20px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
              marginBottom: 24,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11.5,
                fontWeight: 800,
                color: '#64748b',
                marginBottom: 10,
              }}
            >
              •TRIP-0925-015
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1, paddingRight: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 800, color: '#0f172a' }}>
                    Route progress
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                    0 of 6
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                  Starts at 03:30 PM
                </div>
                <div
                  style={{
                    width: '100%',
                    height: 7,
                    borderRadius: 6,
                    backgroundColor: '#f1f5f9',
                  }}
                />
              </div>
              <button
                type="button"
                onClick={handleCallDispatcher}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    backgroundColor: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#334155',
                    marginBottom: 4,
                  }}
                >
                  <Phone size={20} strokeWidth={2.2} />
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: '#64748b' }}>
                  Call Dispatcher
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Stops Section Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <h2
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: '#0f172a',
              margin: 0,
              letterSpacing: '-0.4px',
            }}
          >
            Stops
          </h2>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#64748b',
            }}
          >
            {selectedTrip === 'trip1' ? '8 total' : '6 total'}
          </span>
        </div>

        {/* Stops List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Stop 1 - Delivered */}
          <div
            onClick={() => onSelectStop('stop-1')}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 22,
              border: '1px solid #f1f5f9',
              padding: '16px 18px',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {/* Top row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Number badge (green circle) */}
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: '#dcfce7',
                    color: '#16a34a',
                    fontSize: 15,
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  1
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: '#0f172a',
                  }}
                >
                  FreshMart - Kandy
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Status Badge */}
                <div
                  style={{
                    backgroundColor: '#dcfce7',
                    color: '#16a34a',
                    padding: '3px 10px',
                    borderRadius: 20,
                    fontSize: 11.5,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Check size={12} strokeWidth={3} />
                  <span>Delivered</span>
                </div>
                <ChevronRight size={18} strokeWidth={2.5} color="#94a3b8" />
              </div>
            </div>

            {/* Bottom Row Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 44 }}>
              <span
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#64748b',
                  fontSize: 11.5,
                  fontWeight: 700,
                  padding: '4px 12px',
                  borderRadius: 12,
                }}
              >
                OUT001
              </span>
              <span
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#64748b',
                  fontSize: 11.5,
                  fontWeight: 600,
                  padding: '4px 12px',
                  borderRadius: 12,
                }}
              >
                07:30 AM - 08:00 AM
              </span>
            </div>
          </div>

          {/* Stop 2 - In Progress (Highlighted Yellow Card) */}
          <div
            onClick={() => onSelectStop('stop-2')}
            style={{
              backgroundColor: '#facc15',
              borderRadius: 22,
              padding: '18px 18px',
              boxShadow: '0 8px 24px rgba(250, 204, 21, 0.4)',
              cursor: 'pointer',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
          >
            {/* Top row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Black number badge */}
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    fontSize: 15,
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  2
                </div>
                <div
                  style={{
                    fontSize: 16.5,
                    fontWeight: 900,
                    color: '#0f172a',
                    letterSpacing: '-0.3px',
                  }}
                >
                  Central Supermarket
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Black pill status */}
                <div
                  style={{
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    padding: '4px 10px',
                    borderRadius: 20,
                    fontSize: 11.5,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <Navigation size={12} strokeWidth={2.6} style={{ transform: 'rotate(45deg)' }} />
                  <span>In Progress</span>
                </div>
                <ChevronRight size={18} strokeWidth={2.8} color="#0f172a" />
              </div>
            </div>

            {/* Bottom Row Pills (White background) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 44 }}>
              <span
                style={{
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  fontSize: 11.5,
                  fontWeight: 800,
                  padding: '5px 14px',
                  borderRadius: 14,
                }}
              >
                OUT014
              </span>
              <span
                style={{
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  fontSize: 11.5,
                  fontWeight: 700,
                  padding: '5px 14px',
                  borderRadius: 14,
                }}
              >
                08:30 AM - 09:00 AM
              </span>
            </div>
          </div>

          {/* Stop 3 - Style Mall Outlet (Pending) */}
          <div
            onClick={() => onSelectStop('stop-3')}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 22,
              border: '1px solid #f1f5f9',
              padding: '16px 18px',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {/* Top row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Yellow/amber number badge */}
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: '#fef3c7',
                    color: '#b45309',
                    fontSize: 15,
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  3
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: '#0f172a',
                  }}
                >
                  Style Mall Outlet
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Status Badge */}
                <div
                  style={{
                    backgroundColor: '#fef3c7',
                    color: '#d97706',
                    padding: '3px 10px',
                    borderRadius: 20,
                    fontSize: 11.5,
                    fontWeight: 800,
                  }}
                >
                  Pending
                </div>
                <ChevronRight size={18} strokeWidth={2.5} color="#94a3b8" />
              </div>
            </div>

            {/* Bottom Row Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 44 }}>
              <span
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#64748b',
                  fontSize: 11.5,
                  fontWeight: 700,
                  padding: '4px 12px',
                  borderRadius: 12,
                }}
              >
                OUT027
              </span>
              <span
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#64748b',
                  fontSize: 11.5,
                  fontWeight: 600,
                  padding: '4px 12px',
                  borderRadius: 12,
                }}
              >
                09:30 AM - 10:00 AM
              </span>
            </div>
          </div>

          {/* Expanded Stops 4 to 8 */}
          {expandedStops && (
            <>
              {/* Stop 4 */}
              <div
                onClick={() => onSelectStop('stop-4')}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 22,
                  border: '1px solid #f1f5f9',
                  padding: '16px 18px',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        backgroundColor: '#f1f5f9',
                        color: '#64748b',
                        fontSize: 15,
                        fontWeight: 900,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      4
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                      TechPoint Kandy
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        backgroundColor: '#f1f5f9',
                        color: '#64748b',
                        padding: '3px 10px',
                        borderRadius: 20,
                        fontSize: 11.5,
                        fontWeight: 700,
                      }}
                    >
                      Pending
                    </div>
                    <ChevronRight size={18} strokeWidth={2.5} color="#94a3b8" />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 44 }}>
                  <span
                    style={{
                      backgroundColor: '#f1f5f9',
                      color: '#64748b',
                      fontSize: 11.5,
                      fontWeight: 700,
                      padding: '4px 12px',
                      borderRadius: 12,
                    }}
                  >
                    OUT035
                  </span>
                  <span
                    style={{
                      backgroundColor: '#f1f5f9',
                      color: '#64748b',
                      fontSize: 11.5,
                      fontWeight: 600,
                      padding: '4px 12px',
                      borderRadius: 12,
                    }}
                  >
                    10:30 AM - 11:00 AM
                  </span>
                </div>
              </div>

              {/* Stop 5 */}
              <div
                onClick={() => onSelectStop('stop-5')}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 22,
                  border: '1px solid #f1f5f9',
                  padding: '16px 18px',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        backgroundColor: '#f1f5f9',
                        color: '#64748b',
                        fontSize: 15,
                        fontWeight: 900,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      5
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                      City Hypermarket
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        backgroundColor: '#f1f5f9',
                        color: '#64748b',
                        padding: '3px 10px',
                        borderRadius: 20,
                        fontSize: 11.5,
                        fontWeight: 700,
                      }}
                    >
                      Pending
                    </div>
                    <ChevronRight size={18} strokeWidth={2.5} color="#94a3b8" />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 44 }}>
                  <span
                    style={{
                      backgroundColor: '#f1f5f9',
                      color: '#64748b',
                      fontSize: 11.5,
                      fontWeight: 700,
                      padding: '4px 12px',
                      borderRadius: 12,
                    }}
                  >
                    OUT042
                  </span>
                  <span
                    style={{
                      backgroundColor: '#f1f5f9',
                      color: '#64748b',
                      fontSize: 11.5,
                      fontWeight: 600,
                      padding: '4px 12px',
                      borderRadius: 12,
                    }}
                  >
                    11:30 AM - 12:00 PM
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Expand / View All Card */}
          <div
            onClick={() => setExpandedStops(!expandedStops)}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 18,
              border: '1px solid #e2e8f0',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              marginTop: 4,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
              transition: 'background-color 0.15s ease',
            }}
          >
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: '#64748b',
              }}
            >
              {expandedStops ? '- Hide additional stops' : '+ 5 more deliveries in Trip 1'}
            </span>
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 800,
                color: '#2563eb',
              }}
            >
              {expandedStops ? 'Show less' : 'View all'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
