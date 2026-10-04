import React from 'react';
import {
  User,
  Truck,
  RotateCcw,
  Clock,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';

interface ProfileViewProps {
  onOpenNotifications: () => void;
  onLogout?: () => void;
  currentUser?: { email: string; role?: string; fullName?: string } | null;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  onOpenNotifications,
  onLogout,
  currentUser,
}) => {
  return (
    <div className="driver-screen-content animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: '#0f172a',
            margin: 0,
            letterSpacing: '-0.4px',
          }}
        >
          Profile
        </h1>
        <p
          style={{
            fontSize: 13,
            color: '#64748b',
            margin: '2px 0 0 0',
            fontWeight: 500,
          }}
        >
          Driver, vehicle and app settings
        </p>
      </div>

      {/* Driver Dark Hero Card */}
      <div
        style={{
          backgroundColor: '#111827',
          borderRadius: 24,
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.18)',
        }}
      >
        {/* Yellow Circle Avatar with Silhouette */}
        <div
          style={{
            width: 68,
            height: 68,
            borderRadius: '50%',
            backgroundColor: '#facc15',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0f172a',
            flexShrink: 0,
          }}
        >
          <User size={38} strokeWidth={2.4} />
        </div>

        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#ffffff' }}>
            {currentUser?.fullName || 'Kumar'}
          </div>
          <div
            style={{
              fontSize: 13,
              color: '#94a3b8',
              fontWeight: 500,
              marginTop: 2,
            }}
          >
            {currentUser?.email ? currentUser.email : 'Driver ID: DRV014'}
          </div>
          <span
            style={{
              backgroundColor: '#1f2937',
              color: '#facc15',
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 9999,
              padding: '4px 10px',
              display: 'inline-block',
              marginTop: 6,
            }}
          >
            Waypoint Driver
          </span>
        </div>
      </div>

      {/* Assigned Vehicle Section */}
      <div style={{ marginTop: 22 }}>
        <h2
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: '#0f172a',
            margin: '0 0 10px 0',
          }}
        >
          Assigned Vehicle
        </h2>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 20,
            border: '1px solid #e2e8f0',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                backgroundColor: '#fef9c3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0f172a',
                flexShrink: 0,
              }}
            >
              <Truck size={24} strokeWidth={2.2} />
            </div>

            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                VEH014
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
                Vehicle type: Van
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Depot: Peliyagoda
              </div>
            </div>
          </div>

          <span
            style={{
              backgroundColor: '#dcfce7',
              color: '#15803d',
              fontSize: 11.5,
              fontWeight: 700,
              borderRadius: 9999,
              padding: '4px 12px',
            }}
          >
            Assigned
          </span>
        </div>
      </div>

      {/* Connection & Sync Section */}
      <div style={{ marginTop: 20 }}>
        <h2
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: '#0f172a',
            margin: '0 0 10px 0',
          }}
        >
          Connection & Sync
        </h2>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 20,
            border: '1px solid #e2e8f0',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Green glowing circle */}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <div
                className="pulse-dot"
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: '#16a34a',
                }}
              />
            </div>

            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#16a34a' }}>
                Online
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Last synced: 09:26 AM
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#f8fafc',
              borderRadius: 12,
              padding: '8px 14px',
              marginTop: 12,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
              Offline queue
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>
              0 records
            </span>
          </div>
        </div>
      </div>

      {/* Settings & Support Section */}
      <div style={{ marginTop: 20 }}>
        <h2
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: '#0f172a',
            margin: '0 0 10px 0',
          }}
        >
          Settings & Support
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Notifications Item */}
          <button
            type="button"
            onClick={onOpenNotifications}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 18,
              border: '1px solid #e2e8f0',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
              width: '100%',
              textAlign: 'left',
              transition: 'background-color 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                <AlertCircle size={20} />
              </div>
              <span style={{ fontSize: 14.5, fontWeight: 700, color: '#0f172a' }}>
                Notifications
              </span>
            </div>
            <ChevronRight size={18} color="#94a3b8" />
          </button>

          {/* Offline storage Item */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 18,
              border: '1px solid #e2e8f0',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <RotateCcw size={18} />
              </div>
              <span style={{ fontSize: 14.5, fontWeight: 700, color: '#0f172a' }}>
                Offline storage
              </span>
            </div>
            <ChevronRight size={18} color="#94a3b8" />
          </div>

          {/* History Item */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 18,
              border: '1px solid #e2e8f0',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  backgroundColor: '#e0f2fe',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Clock size={18} />
              </div>
              <span style={{ fontSize: 14.5, fontWeight: 700, color: '#0f172a' }}>
                History
              </span>
            </div>
            <ChevronRight size={18} color="#94a3b8" />
          </div>
        </div>
      </div>

      {/* Log out Button */}
      <div style={{ marginTop: 22 }}>
        <button
          type="button"
          onClick={onLogout}
          style={{
            backgroundColor: '#fff1f2',
            border: '1px solid #fecdd3',
            color: '#e11d48',
            fontSize: 15,
            fontWeight: 800,
            borderRadius: 16,
            padding: 16,
            width: '100%',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'background-color 0.15s ease',
          }}
        >
          Log out
        </button>
      </div>
    </div>
  );
};
