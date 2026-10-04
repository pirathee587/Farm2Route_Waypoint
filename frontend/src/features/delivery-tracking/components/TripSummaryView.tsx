import React, { useState } from 'react';
import {
  Bell,
  Box,
  Check,
  AlertCircle,
} from 'lucide-react';

interface TripSummaryViewProps {
  onReturnToRoute: () => void;
  onViewHistory?: () => void;
  onOpenNotifications: () => void;
}

export const TripSummaryView: React.FC<TripSummaryViewProps> = ({
  onReturnToRoute,
  onViewHistory,
  onOpenNotifications,
}) => {
  const [expandedStops, setExpandedStops] = useState<boolean>(false);
  const [historyToast, setHistoryToast] = useState<boolean>(false);

  const handleHistoryClick = () => {
    if (onViewHistory) {
      onViewHistory();
    } else {
      setHistoryToast(true);
      setTimeout(() => setHistoryToast(false), 3000);
    }
  };

  return (
    <div
      className="driver-screen-content animate-fade-in"
      style={{
        padding: '0 0 110px 0',
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
          }}
        >
          <Bell size={22} strokeWidth={2.2} />
        </button>
      </header>

      {/* Main Inner Content */}
      <div style={{ padding: '18px 20px 0 20px' }}>
        {/* Toast for History */}
        {historyToast && (
          <div
            style={{
              backgroundColor: '#0f172a',
              color: '#facc15',
              padding: '10px 16px',
              borderRadius: 14,
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 14,
              textAlign: 'center',
            }}
          >
            📋 Trip 1 logged to daily archive (25 Sep 2026).
          </div>
        )}

        {/* Title & Completed Status Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 18,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 900,
                color: '#0f172a',
                margin: '0 0 4px 0',
                letterSpacing: '-0.4px',
              }}
            >
              Trip 1 Summary
            </h1>
            <div
              style={{
                fontSize: 14,
                color: '#64748b',
                fontWeight: 500,
              }}
            >
              Vehicle VEH014 • 25 Sep 2026
            </div>
          </div>

          {/* Green Completed Pill */}
          <div
            style={{
              backgroundColor: '#dcfce7',
              color: '#15803d',
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 12.5,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: '#22c55e',
              }}
            />
            Completed
          </div>
        </div>

        {/* Trip completed Dark Hero Card */}
        <div
          style={{
            backgroundColor: '#0f172a',
            borderRadius: 24,
            padding: '20px 22px',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            marginBottom: 16,
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.25)',
          }}
        >
          {/* Stops Count Column */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              borderRight: '1px solid rgba(255, 255, 255, 0.12)',
              paddingRight: 18,
              minWidth: 50,
            }}
          >
            <span
              style={{
                fontSize: 40,
                fontWeight: 900,
                color: '#facc15',
                lineHeight: 1,
              }}
            >
              8
            </span>
            <span
              style={{
                fontSize: 13.5,
                fontWeight: 800,
                color: '#ffffff',
                marginTop: 4,
              }}
            >
              Stops
            </span>
          </div>

          {/* Trip Completed Text Column */}
          <div>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: '#ffffff',
                margin: '0 0 4px 0',
                letterSpacing: '-0.3px',
              }}
            >
              Trip completed
            </h2>
            <p
              style={{
                fontSize: 13,
                color: '#94a3b8',
                margin: 0,
                lineHeight: 1.4,
              }}
            >
              All stops have a recorded outcome.
            </p>
          </div>
        </div>

        {/* 3 Stats Cards in a Row */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginBottom: 20,
          }}
        >
          {/* Card 1: 5 Delivered */}
          <div
            style={{
              flex: 1,
              backgroundColor: '#f0fdf4',
              borderRadius: 20,
              padding: '16px 12px',
              textAlign: 'center',
              border: '1px solid #dcfce7',
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: '#16a34a',
                lineHeight: 1.1,
              }}
            >
              5
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: '#16a34a',
                marginTop: 4,
              }}
            >
              Delivered
            </div>
          </div>

          {/* Card 2: 2 Not Delivered */}
          <div
            style={{
              flex: 1,
              backgroundColor: '#fef2f2',
              borderRadius: 20,
              padding: '16px 12px',
              textAlign: 'center',
              border: '1px solid #fee2e2',
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: '#dc2626',
                lineHeight: 1.1,
              }}
            >
              2
            </div>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 800,
                color: '#dc2626',
                marginTop: 4,
              }}
            >
              Not Delivered
            </div>
          </div>

          {/* Card 3: 1 Partial */}
          <div
            style={{
              flex: 1,
              backgroundColor: '#fefce8',
              borderRadius: 20,
              padding: '16px 12px',
              textAlign: 'center',
              border: '1px solid #fef08a',
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: '#b45309',
                lineHeight: 1.1,
              }}
            >
              1
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: '#b45309',
                marginTop: 4,
              }}
            >
              Partial
            </div>
          </div>
        </div>

        {/* Trip Completion Progress Bar */}
        <div style={{ marginBottom: 22 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 16,
                fontWeight: 900,
                color: '#0f172a',
              }}
            >
              Trip completion
            </span>
            <span
              style={{
                fontSize: 15,
                fontWeight: 900,
                color: '#16a34a',
              }}
            >
              100%
            </span>
          </div>

          <div
            style={{
              width: '100%',
              height: 8,
              borderRadius: 6,
              backgroundColor: '#e2e8f0',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#22c55e',
                borderRadius: 6,
              }}
            />
          </div>
        </div>

        {/* Delivery Outcomes Section */}
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <h3
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: '#0f172a',
                margin: 0,
                letterSpacing: '-0.3px',
              }}
            >
              Delivery outcomes
            </h3>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#64748b',
              }}
            >
              8 stops
            </span>
          </div>

          {/* List of Outcomes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Outcome 1: FreshMart (Delivered) */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 20,
                border: '1px solid #f1f5f9',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    backgroundColor: '#dcfce7',
                    color: '#16a34a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Check size={18} strokeWidth={3} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>
                    FreshMart
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    07:52 AM
                  </div>
                </div>
              </div>

              <span
                style={{
                  backgroundColor: '#dcfce7',
                  color: '#16a34a',
                  fontSize: 12,
                  fontWeight: 800,
                  padding: '4px 14px',
                  borderRadius: 14,
                }}
              >
                Delivered
              </span>
            </div>

            {/* Outcome 2: Central Supermarket (Partial) */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 20,
                border: '1px solid #f1f5f9',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    backgroundColor: '#fefce8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: '#b45309',
                    }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>
                    Central Supermarket
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    08:46 AM
                  </div>
                </div>
              </div>

              <span
                style={{
                  backgroundColor: '#fefce8',
                  color: '#b45309',
                  fontSize: 12,
                  fontWeight: 800,
                  padding: '4px 14px',
                  borderRadius: 14,
                }}
              >
                Partial
              </span>
            </div>

            {/* Outcome 3: Keells - K-Zone Moratuwa (Not Delivered) */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 20,
                border: '1px solid #f1f5f9',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    backgroundColor: '#fef2f2',
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    fontWeight: 900,
                  }}
                >
                  !
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>
                    Keells - K-Zone Moratuwa
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    09:24 AM
                  </div>
                </div>
              </div>

              <span
                style={{
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  fontSize: 12,
                  fontWeight: 800,
                  padding: '4px 14px',
                  borderRadius: 14,
                }}
              >
                Not Delivered
              </span>
            </div>

            {/* Expanded stops 4-8 */}
            {expandedStops && (
              <>
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 20,
                    border: '1px solid #f1f5f9',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>
                      TechPoint Kandy
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>10:15 AM</div>
                  </div>
                  <span
                    style={{
                      backgroundColor: '#dcfce7',
                      color: '#16a34a',
                      fontSize: 12,
                      fontWeight: 800,
                      padding: '4px 14px',
                      borderRadius: 14,
                    }}
                  >
                    Delivered
                  </span>
                </div>

                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 20,
                    border: '1px solid #f1f5f9',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>
                      City Hypermarket
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>11:20 AM</div>
                  </div>
                  <span
                    style={{
                      backgroundColor: '#dcfce7',
                      color: '#16a34a',
                      fontSize: 12,
                      fontWeight: 800,
                      padding: '4px 14px',
                      borderRadius: 14,
                    }}
                  >
                    Delivered
                  </span>
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
                marginTop: 2,
              }}
            >
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#64748b' }}>
                {expandedStops ? '- Hide additional stops' : '+ 5 more stops with recorded outcomes'}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: '#2563eb' }}>
                {expandedStops ? 'Show less' : 'View all'}
              </span>
            </div>
          </div>
        </div>

        {/* 2 records need dispatcher attention Warning Card */}
        <div
          style={{
            backgroundColor: '#fefce8',
            borderRadius: 22,
            border: '1px solid #fde047',
            padding: '16px 18px',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: '#facc15',
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              !
            </div>
            <h4
              style={{
                fontSize: 15,
                fontWeight: 900,
                color: '#0f172a',
                margin: 0,
              }}
            >
              2 records need dispatcher attention
            </h4>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 48 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>
                Access denied — OUT027
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: '#16a34a' }}>
                Sent
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: '#854d0e' }}>
                Shortfall — OUT014
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: '#16a34a' }}>
                Sent
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Action Buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="button"
            onClick={onReturnToRoute}
            style={{
              flex: 1.3,
              backgroundColor: '#facc15',
              color: '#0f172a',
              fontSize: 15.5,
              fontWeight: 900,
              padding: '16px 14px',
              borderRadius: 18,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(250, 204, 21, 0.4)',
              textAlign: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            Return to Today's Route
          </button>

          <button
            type="button"
            onClick={handleHistoryClick}
            style={{
              flex: 1,
              backgroundColor: '#ffffff',
              color: '#0f172a',
              fontSize: 15,
              fontWeight: 800,
              padding: '16px 14px',
              borderRadius: 18,
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              textAlign: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              transition: 'all 0.15s ease',
            }}
          >
            View Trip History
          </button>
        </div>
      </div>
    </div>
  );
};
