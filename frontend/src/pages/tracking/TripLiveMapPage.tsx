// ============================================================
// TripLiveMapPage.tsx — Screen 3: Trip Live Map
// ============================================================

import React, { useState, useEffect } from 'react';
import { DispatcherSidebar, type DispatcherPage } from '@/shared/layouts/DispatcherSidebar';
import { ArrowLeft, Check, AlertTriangle } from 'lucide-react';
import { fetchTripDetail } from '@/features/delivery-tracking/liveTrackingApi';
import type { ActiveTrip } from '@/entities/tracking/trackingTypes';
import { LiveOperationsMapCanvas } from './components/LiveOperationsMapCanvas';

interface TripLiveMapPageProps {
  tripId: string;
  onNavigateGlobal: (page: string) => void;
  onBack: () => void;
}

export const TripLiveMapPage: React.FC<TripLiveMapPageProps> = ({
  tripId,
  onNavigateGlobal,
  onBack,
}) => {
  const [trip, setTrip] = useState<ActiveTrip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchTripDetail(tripId).then(found => { if (active) setTrip(found); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tripId]);

  if (loading) return <div style={{ padding: '32px' }}>Loading live map…</div>;
  if (!trip) return <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-start' }}><strong>Trip not found or live position unavailable.</strong><button onClick={onBack} style={{ padding: '9px 18px', borderRadius: '8px', backgroundColor: '#0f172a', color: '#fff' }}>Back to Trip Detail</button></div>;

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
      {/* Dispatcher Sidebar */}
      <DispatcherSidebar
        activePage="live-tracking"
        onNavigate={(page: DispatcherPage) => onNavigateGlobal(page)}
      />

      {/* Main Content */}
      <main style={{ flex: 1, minWidth: 0, height: '100vh', padding: '24px 32px', overflowY: 'auto', overflowX: 'hidden' }}>
        {/* Top Breadcrumb & Header */}
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={onBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#2563EB',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              marginBottom: '8px',
            }}
          >
            <ArrowLeft size={14} />
            Back to Trip Detail
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Trip Live Map
              </h1>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                Live vehicle position, route progress and upcoming delivery stops.
              </p>
            </div>

            {/* Live Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.2)',
                }}
              />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#10B981' }}>Live</span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Updated 10:24</span>
            </div>
          </div>
        </div>

        {/* Full-Width Trip Summary Strip */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '18px 24px',
            border: '1px solid #f1f5f9',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1.2fr',
            gap: '16px',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          {/* Trip ID & Badge */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                {trip.tripCode}
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '10px',
                  backgroundColor: '#FFFBEB',
                  color: '#D97706',
                }}
              >
                AT RISK
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              {trip.origin} → {trip.destination}
            </div>
          </div>

          {/* Vehicle */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>
              VEHICLE
            </div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
              {trip.vehicleId}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              {trip.vehicleFullName}
            </div>
          </div>

          {/* Driver */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>
              DRIVER
            </div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
              {trip.driverName}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Assigned
            </div>
          </div>

          {/* Progress */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>
              PROGRESS
            </div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
              {trip.completedStops}/{trip.totalStops} Stops
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              {Math.round((trip.completedStops / trip.totalStops) * 100)}% complete
            </div>
          </div>

          {/* Next Stop */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>
              NEXT STOP
            </div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
              {trip.nextStopName}
            </div>
            <div style={{ fontSize: '11px', color: '#D97706', fontWeight: 600 }}>
              ETA 10:52 (+12 min)
            </div>
          </div>
        </div>

        {/* Main Content Layout: Map Canvas + Right Panel */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 340px',
            gap: '20px',
            alignItems: 'start',
          }}
        >
          {/* Large Map Visualization */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '16px',
              border: '1px solid #f1f5f9',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <LiveOperationsMapCanvas trip={trip} isLargeView={true} />
          </div>

          {/* Right Panel: Next Delivery + Trip Progress */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* NEXT DELIVERY Card */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid #f1f5f9',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  NEXT DELIVERY
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    backgroundColor: '#FFFBEB',
                    color: '#D97706',
                  }}
                >
                  AT RISK
                </span>
              </div>

              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                Waypoint Fresh
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
                {trip.nextStopName}
              </div>

              {/* Table / key values */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '14px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Required Window</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>Before 11:00</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Current ETA</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>10:52</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Delay</span>
                  <span style={{ fontWeight: 700, color: '#D97706' }}>+12 min</span>
                </div>
              </div>

              {/* Warning Alert Box */}
              <div
                style={{
                  backgroundColor: '#FFFBEB',
                  borderRadius: '10px',
                  padding: '14px',
                  border: '1px solid #FEF3C7',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <AlertTriangle size={13} color="#D97706" />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    DELIVERY WINDOW AT RISK
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#92400E', lineHeight: 1.4 }}>
                  Current delay may affect the next scheduled delivery window.
                </div>
              </div>
            </div>

            {/* TRIP PROGRESS Card */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid #f1f5f9',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '18px' }}>
                TRIP PROGRESS
              </div>

              {/* Stops Vertical Timeline */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {/* 1. Peliyagoda Depot */}
                <div style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '20px', left: '10px', width: '2px', height: '36px', backgroundColor: '#10B981' }} />
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#10B981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, flexShrink: 0 }}>
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <div style={{ paddingBottom: '20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>Peliyagoda Depot</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Departed 07:45</div>
                  </div>
                </div>

                {/* 2. Wattala */}
                <div style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '20px', left: '10px', width: '2px', height: '36px', backgroundColor: '#10B981' }} />
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#10B981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, flexShrink: 0 }}>
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <div style={{ paddingBottom: '20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>Wattala</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Delivered 09:05</div>
                  </div>
                </div>

                {/* 3. Colombo 03 */}
                <div style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '20px', left: '10px', width: '2px', height: '36px', backgroundColor: '#e2e8f0' }} />
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#10B981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, flexShrink: 0 }}>
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <div style={{ paddingBottom: '20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>Colombo 03</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Delivered 09:38</div>
                  </div>
                </div>

                {/* 4. Colombo 07 (Red At Risk) */}
                <div style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '20px', left: '10px', width: '2px', height: '36px', backgroundColor: '#e2e8f0' }} />
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#EF4444', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, zIndex: 2, flexShrink: 0 }}>
                    4
                  </div>
                  <div style={{ paddingBottom: '20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>Colombo 07</div>
                    <div style={{ fontSize: '11px', color: '#D97706', fontWeight: 600 }}>Next · ETA 10:52</div>
                  </div>
                </div>

                {/* 5. Nugegoda */}
                <div style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '20px', left: '10px', width: '2px', height: '36px', backgroundColor: '#e2e8f0' }} />
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '2px solid #cbd5e1', backgroundColor: '#fff', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, zIndex: 2, flexShrink: 0 }}>
                    5
                  </div>
                  <div style={{ paddingBottom: '20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Nugegoda</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Upcoming</div>
                  </div>
                </div>

                {/* 6. Dehiwala */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '2px solid #cbd5e1', backgroundColor: '#fff', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, zIndex: 2, flexShrink: 0 }}>
                    6
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Dehiwala</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Upcoming</div>
                  </div>
                </div>
              </div>

              {/* Status Footer */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '14px',
                  marginTop: '10px',
                  fontSize: '11px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                  <span style={{ color: '#10B981', fontWeight: 600 }}>Live monitoring active</span>
                </div>
                <span style={{ color: '#94a3b8' }}>Updated 10:24</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
