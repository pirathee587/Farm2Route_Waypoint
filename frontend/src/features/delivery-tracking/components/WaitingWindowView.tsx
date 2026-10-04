import React from 'react';
import { ChevronLeft, Clock } from 'lucide-react';

interface WaitingWindowViewProps {
  onBack: () => void;
  onOpenCantDeliver: () => void;
}

export const WaitingWindowView: React.FC<WaitingWindowViewProps> = ({
  onBack,
  onOpenCantDeliver,
}) => {
  return (
    <div className="driver-screen-content animate-fade-in">
      {/* Header */}
      <div className="driver-header-nav">
        <button
          type="button"
          className="driver-back-btn"
          onClick={onBack}
          aria-label="Back"
        >
          <ChevronLeft size={22} strokeWidth={2.5} />
        </button>
        <h1 className="driver-header-title">Waiting For Window</h1>
      </div>

      {/* Top Status Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 24,
          padding: '20px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
          border: '1px solid #f1f5f9',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Blue Clock Icon */}
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              backgroundColor: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb',
              flexShrink: 0,
            }}
          >
            <Clock size={28} strokeWidth={2.2} />
          </div>

          <div>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: '#0f172a',
                lineHeight: 1.2,
                margin: 0,
              }}
            >
              You're early
            </h2>
            <p
              style={{
                fontSize: 13.5,
                color: '#64748b',
                marginTop: 4,
                marginBottom: 0,
                lineHeight: 1.4,
              }}
            >
              Keells - K-Zone Moratuwa is not ready to receive this delivery yet.
            </p>
          </div>
        </div>

        {/* Nested Outlet Box */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            borderRadius: 16,
            padding: '14px 16px',
            marginTop: 18,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
              Keells - K-Zone Moratuwa
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#64748b',
                marginTop: 2,
              }}
            >
              OUT027
            </div>
          </div>

          <span
            style={{
              border: '1.5px solid #fde047',
              backgroundColor: '#fefce8',
              color: '#a16207',
              fontSize: 11,
              fontWeight: 800,
              borderRadius: 9999,
              padding: '6px 12px',
              letterSpacing: '0.3px',
              textTransform: 'uppercase',
            }}
          >
            WAITING FOR WINDOW
          </span>
        </div>
      </div>

      {/* Dark Countdown Card */}
      <div
        style={{
          backgroundColor: '#111827',
          borderRadius: 24,
          padding: '20px 22px',
          color: '#ffffff',
          marginTop: 16,
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.18)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>
            Delivery window opens at
          </span>
          <span
            style={{
              backgroundColor: '#262c38',
              color: '#cbd5e1',
              fontSize: 11,
              fontWeight: 600,
              padding: '5px 12px',
              borderRadius: 9999,
            }}
          >
            Current 09:12 AM
          </span>
        </div>

        <div
          style={{
            fontSize: 34,
            fontWeight: 800,
            letterSpacing: '-0.5px',
            margin: '6px 0 16px 0',
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
            paddingBottom: 16,
          }}
        >
          09:30 AM
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <span
              style={{
                fontSize: 42,
                fontWeight: 800,
                color: '#f59e0b',
                lineHeight: 1,
              }}
            >
              18
            </span>
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#f59e0b',
                marginLeft: 6,
              }}
            >
              min
            </span>
          </div>

          <span
            style={{
              fontSize: 13,
              color: '#cbd5e1',
              fontWeight: 500,
              maxWidth: 160,
              textAlign: 'right',
              lineHeight: 1.3,
            }}
          >
            Until delivery window opens
          </span>
        </div>
      </div>

      {/* Blue Info Alert Box */}
      <div
        style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 20,
          padding: 16,
          marginTop: 16,
          display: 'flex',
          gap: 14,
          alignItems: 'flex-start',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 15,
            fontFamily: 'serif',
            fontStyle: 'italic',
            flexShrink: 0,
          }}
        >
          i
        </div>

        <div>
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 700,
              color: '#0f172a',
              lineHeight: 1.4,
            }}
          >
            Please remain at the outlet and wait until the delivery window opens.
          </div>
          <div
            style={{
              fontSize: 12,
              color: '#2563eb',
              fontWeight: 500,
              marginTop: 8,
              lineHeight: 1.4,
            }}
          >
            Arrived action will become available automatically at 09:30 AM.
          </div>
        </div>
      </div>

      {/* Delivery Requirements */}
      <div style={{ marginTop: 22 }}>
        <h3
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: '#0f172a',
            margin: '0 0 10px 0',
          }}
        >
          Delivery requirements
        </h3>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              fontSize: 12.5,
              fontWeight: 700,
              padding: '8px 14px',
              borderRadius: 9999,
            }}
          >
            Mall access window
          </span>

          <span
            style={{
              backgroundColor: '#fefce8',
              color: '#854d0e',
              fontSize: 12.5,
              fontWeight: 700,
              padding: '8px 14px',
              borderRadius: 9999,
            }}
          >
            Van only
          </span>

          <span
            style={{
              backgroundColor: '#f0f9ff',
              color: '#0284c7',
              fontSize: 12.5,
              fontWeight: 700,
              padding: '8px 14px',
              borderRadius: 9999,
            }}
          >
            Chilled
          </span>
        </div>
      </div>

      {/* Can't deliver report shortcut trigger */}
      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <button
          type="button"
          onClick={onOpenCantDeliver}
          style={{
            fontSize: 13.5,
            color: '#d97706',
            fontWeight: 700,
            textDecoration: 'underline',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '6px 12px',
          }}
        >
          Can't Deliver? Report Issue
        </button>
      </div>

      {/* Arrived Action Button */}
      <div style={{ marginTop: 'auto', paddingTop: 20 }}>
        <button type="button" className="driver-btn-disabled" disabled>
          Arrived
        </button>
        <div
          style={{
            fontSize: 11.5,
            color: '#64748b',
            textAlign: 'center',
            marginTop: 8,
            fontWeight: 500,
          }}
        >
          Available when the window opens
        </div>
      </div>
    </div>
  );
};
