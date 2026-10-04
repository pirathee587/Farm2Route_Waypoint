import React from 'react';
import {
  ChevronLeft,
  AlertCircle,
  Check,
  ArrowRight,
  Info,
} from 'lucide-react';

interface NotificationsViewProps {
  onBack: () => void;
  onViewUpdatedRoute: () => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  onBack,
  onViewUpdatedRoute,
}) => {
  return (
    <div className="driver-screen-content animate-fade-in">
      {/* Header */}
      <div className="driver-header-nav" style={{ marginBottom: 4 }}>
        <button
          type="button"
          className="driver-back-btn"
          onClick={onBack}
          aria-label="Back"
        >
          <ChevronLeft size={22} strokeWidth={2.5} />
        </button>
        <h1 className="driver-header-title">Notifications</h1>

        {/* 2 new pill badge */}
        <span
          style={{
            backgroundColor: '#facc15',
            color: '#0f172a',
            fontSize: 12,
            fontWeight: 800,
            borderRadius: 9999,
            padding: '4px 12px',
            marginLeft: 'auto',
          }}
        >
          2 new
        </span>
      </div>

      <p
        style={{
          fontSize: 13,
          color: '#64748b',
          margin: '0 0 16px 0',
          fontWeight: 500,
        }}
      >
        Operational updates for your current trip
      </p>

      {/* Prominent Route Updated Card with Yellow top accent */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 20,
          borderTop: '4px solid #facc15',
          borderLeft: '1px solid #e2e8f0',
          borderRight: '1px solid #e2e8f0',
          borderBottom: '1px solid #e2e8f0',
          padding: '18px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
        }}
      >
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              backgroundColor: '#fef9c3',
              color: '#a16207',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertCircle size={22} strokeWidth={2.4} />
          </div>

          <div style={{ flex: 1 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                Route updated
              </div>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                2 min ago
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
              Dispatcher updated your route.
            </div>
          </div>
        </div>

        {/* Yellow Alert Box */}
        <div
          style={{
            backgroundColor: '#fefce8',
            borderRadius: 14,
            padding: '12px 14px',
            marginTop: 14,
            fontSize: 13,
            fontWeight: 700,
            color: '#0f172a',
            lineHeight: 1.4,
          }}
        >
          Stop 4 — TechPoint Outlet has been removed from Trip 1.
        </div>

        {/* ROUTE CHANGE */}
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 800,
              color: '#64748b',
              letterSpacing: '0.6px',
              marginBottom: 8,
            }}
          >
            ROUTE CHANGE
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                flex: 1,
                backgroundColor: '#f1f5f9',
                borderRadius: 14,
                padding: '10px 14px',
              }}
            >
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                Before
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                8 stops
              </div>
            </div>

            <ArrowRight size={20} color="#64748b" />

            <div
              style={{
                flex: 1,
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 14,
                padding: '10px 14px',
              }}
            >
              <div style={{ fontSize: 11, color: '#2563eb', fontWeight: 700 }}>
                After
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                7 stops
              </div>
            </div>
          </div>
        </div>

        {/* Actions row: Route synced + View Updated Route */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 18,
            paddingTop: 12,
            borderTop: '1px solid #f1f5f9',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: '#16a34a',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                backgroundColor: '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Check size={13} strokeWidth={3} />
            </div>
            <span>Route synced</span>
          </div>

          <button
            type="button"
            onClick={onViewUpdatedRoute}
            style={{
              backgroundColor: '#facc15',
              color: '#0f172a',
              fontWeight: 800,
              fontSize: 13,
              borderRadius: 12,
              padding: '10px 16px',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            View Updated Route
          </button>
        </div>
      </div>

      {/* Other Notifications Section */}
      <div style={{ marginTop: 22 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: '#0f172a',
              margin: 0,
            }}
          >
            Other notifications
          </h2>
          <span style={{ fontSize: 12.5, color: '#64748b', fontWeight: 600 }}>
            Today
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Item 1: Load shortfall recorded */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 18,
              border: '1px solid #e2e8f0',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AlertCircle size={20} strokeWidth={2.4} />
            </div>

            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                  Load shortfall recorded
                </div>
                <span style={{ fontSize: 11.5, color: '#64748b' }}>09:32</span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: '#64748b',
                  marginTop: 2,
                }}
              >
                OUT014 • 2 milk units short before departure.
              </div>
            </div>

            {/* Indicator dot */}
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#facc15',
                flexShrink: 0,
              }}
            />
          </div>

          {/* Item 2: Delivery issue acknowledged */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 18,
              border: '1px solid #e2e8f0',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Check size={20} strokeWidth={2.6} />
            </div>

            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                  Delivery issue acknowledged
                </div>
                <span style={{ fontSize: 11.5, color: '#64748b' }}>08:10</span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: '#64748b',
                  marginTop: 2,
                }}
              >
                Dispatcher acknowledged access issue at OUT027.
              </div>
            </div>

            {/* Indicator dot */}
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#facc15',
                flexShrink: 0,
              }}
            />
          </div>

          {/* Item 3: Trip 1 departure confirmed */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 18,
              border: '1px solid #e2e8f0',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Check size={20} strokeWidth={2.6} />
            </div>

            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                  Trip 1 departure confirmed
                </div>
                <span style={{ fontSize: 11.5, color: '#64748b' }}>06:30</span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: '#64748b',
                  marginTop: 2,
                }}
              >
                VEH014 left Peliyagoda depot at 06:30 AM.
              </div>
            </div>

            {/* Green Indicator dot */}
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#16a34a',
                flexShrink: 0,
              }}
            />
          </div>
        </div>

        {/* View Notifications History link */}
        <div style={{ textAlign: 'right', margin: '12px 0 16px 0' }}>
          <a
            href="#notifications-history"
            onClick={(e) => e.preventDefault()}
            style={{
              fontSize: 12,
              color: '#64748b',
              fontStyle: 'italic',
              textDecoration: 'none',
            }}
          >
            View Notifications History &gt;&gt;
          </a>
        </div>
      </div>

      {/* Bottom Info Banner */}
      <div
        style={{
          backgroundColor: '#eff6ff',
          borderRadius: 16,
          padding: '12px 14px',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
          marginBottom: 10,
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontFamily: 'serif',
            fontStyle: 'italic',
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          i
        </div>
        <p
          style={{
            fontSize: 11.5,
            color: '#1d4ed8',
            margin: 0,
            lineHeight: 1.4,
            fontWeight: 500,
          }}
        >
          Important route changes appear here immediately and stay visible until
          reviewed.
        </p>
      </div>
    </div>
  );
};
