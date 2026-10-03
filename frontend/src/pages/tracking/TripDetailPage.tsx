// ============================================================
// TripDetailPage.tsx — Screen 2: Trip Detail Page
// ============================================================

import React, { useState, useEffect } from 'react';
import { DispatcherSidebar, type DispatcherPage } from '@/shared/layouts/DispatcherSidebar';
import { ArrowLeft, Check, Phone, AlertCircle } from 'lucide-react';
import { fetchTripDetail } from '@/features/delivery-tracking/liveTrackingApi';
import type { ActiveTrip } from '@/entities/tracking/trackingTypes';

interface TripDetailPageProps {
  tripId: string;
  onNavigateGlobal: (page: string) => void;
  onBack: () => void;
}

export const TripDetailPage: React.FC<TripDetailPageProps> = ({
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

  if (loading) return <div style={{ padding: '32px' }}>Loading trip details…</div>;
  if (!trip) return <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-start' }}><strong>Trip not found.</strong><button onClick={onBack} style={{ padding: '9px 18px', borderRadius: '8px', backgroundColor: '#0f172a', color: '#fff' }}>Back to Live Tracking</button></div>;

  const weightPercent = Math.round((trip.weightKg / trip.maxWeightKg) * 100);
  const volumePercent = Math.round((trip.volumeM3 / trip.maxVolumeM3) * 100);

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
            Live Tracking
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {trip.tripCode}
                </h1>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '12px',
                    backgroundColor: '#EFF6FF',
                    color: '#2563EB',
                  }}
                >
                  IN TRANSIT
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                {trip.fullRouteText}
              </p>
            </div>

            {/* View Live Map button */}
            <button
              onClick={() => onNavigateGlobal(`live-trip-map/${trip.id}`)}
              style={{
                backgroundColor: '#F59E0B',
                color: '#0f172a',
                fontSize: '13px',
                fontWeight: 700,
                padding: '10px 20px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 6px rgba(245, 158, 11, 0.25)',
              }}
            >
              View Live Map
            </button>
          </div>
        </div>

        {/* 5-Metric Quick Stats Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '18px 24px',
            border: '1px solid #f1f5f9',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          {/* VEHICLE */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              VEHICLE
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
              {trip.vehicleId}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              {trip.vehicleType}
            </div>
          </div>

          {/* DRIVER */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              DRIVER
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
              {trip.driverName}
            </div>
            <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 600 }}>
              Active
            </div>
          </div>

          {/* STOPS */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              STOPS
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
              {trip.completedStops}/{trip.totalStops}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              {trip.totalStops - trip.completedStops} remaining
            </div>
          </div>

          {/* NEXT STOP */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              NEXT STOP
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
              {trip.nextStopName}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              ETA {trip.nextStopEta}
            </div>
          </div>

          {/* TRIP */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              TRIP
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
              {trip.todayTrips}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Today
            </div>
          </div>
        </div>

        {/* Main 3 Column Body */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr 1fr',
            gap: '20px',
            alignItems: 'start',
          }}
        >
          {/* COLUMN 1: Route & Stops + Load & Capacity */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Route & Stops Card */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid #f1f5f9',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Route & Stops
                  </h2>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    {trip.stops.length} planned stops
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '12px',
                    backgroundColor: '#EFF6FF',
                    color: '#2563EB',
                  }}
                >
                  {trip.completedStops}/{trip.totalStops} COMPLETE
                </span>
              </div>

              {/* Stops Timeline */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {trip.stops.map((stop, idx) => {
                  const isLast = idx === trip.stops.length - 1;
                  const isDepot = stop.status === 'DEPOT';
                  const isDelivered = stop.status === 'DELIVERED';
                  const isNext = stop.status === 'NEXT';
                  const isUpcoming = stop.status === 'UPCOMING';

                  return (
                    <div key={stop.id} style={{ display: 'flex', gap: '14px', position: 'relative' }}>
                      {/* Vertical line connecting stops */}
                      {!isLast && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '24px',
                            left: '11px',
                            width: '2px',
                            bottom: 0,
                            backgroundColor: isDepot || isDelivered ? '#10B981' : '#e2e8f0',
                          }}
                        />
                      )}

                      {/* Icon */}
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor:
                            isDepot || isDelivered
                              ? '#10B981'
                              : isNext
                              ? '#F59E0B'
                              : '#ffffff',
                          border: isUpcoming ? '2px solid #cbd5e1' : 'none',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 800,
                          zIndex: 2,
                          flexShrink: 0,
                        }}
                      >
                        {isDepot || isDelivered ? (
                          <Check size={13} strokeWidth={3} />
                        ) : isNext ? (
                          stop.stopNumber
                        ) : null}
                      </div>

                      {/* Stop Info */}
                      <div style={{ flex: 1, paddingBottom: isNext ? '18px' : '22px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: isUpcoming ? '#64748b' : '#0f172a' }}>
                              {stop.name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                              {stop.orderId ? `${stop.orderId} · ` : ''}
                              {stop.timeText}
                            </div>
                          </div>

                          {/* Status Badge */}
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '10px',
                              backgroundColor:
                                isDepot
                                  ? '#EFF6FF'
                                  : isDelivered
                                  ? '#ECFDF5'
                                  : isNext
                                  ? '#FEF3C7'
                                  : '#F1F5F9',
                              color:
                                isDepot
                                  ? '#2563EB'
                                  : isDelivered
                                  ? '#10B981'
                                  : isNext
                                  ? '#D97706'
                                  : '#64748b',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}
                          >
                            {stop.status}
                          </span>
                        </div>

                        {/* If NEXT stop: Expanded detail card */}
                        {isNext && (
                          <div
                            style={{
                              backgroundColor: '#FFFBEB',
                              borderRadius: '10px',
                              padding: '12px 14px',
                              marginTop: '10px',
                              border: '1px solid #FEF3C7',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>
                                Delivery window
                              </div>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                                {stop.deliveryWindow || '10:00 - 10:30'}
                              </div>
                            </div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#2563EB' }}>
                              {stop.itemsText || '12 chilled items'}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Load & Capacity Card */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid #f1f5f9',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Load & Capacity
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '12px',
                    backgroundColor: '#EFF6FF',
                    color: '#2563EB',
                    textTransform: 'uppercase',
                  }}
                >
                  {trip.vehicleType}
                </span>
              </div>

              {/* Weight bar */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>Weight</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>
                      {trip.weightKg.toLocaleString()} / {trip.maxWeightKg.toLocaleString()} kg
                    </span>
                    <span style={{ fontWeight: 700, color: '#D97706' }}>
                      {weightPercent}%
                    </span>
                  </div>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${weightPercent}%`, height: '100%', backgroundColor: '#F59E0B', borderRadius: '4px' }} />
                </div>
              </div>

              {/* Volume bar */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>Volume</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>
                      {trip.volumeM3} / {trip.maxVolumeM3} m³
                    </span>
                    <span style={{ fontWeight: 700, color: '#D97706' }}>
                      {volumePercent}%
                    </span>
                  </div>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${volumePercent}%`, height: '100%', backgroundColor: '#F59E0B', borderRadius: '4px' }} />
                </div>
              </div>

              {/* Bottom 3 info tiles */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                }}
              >
                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    CHILLED LOAD
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#2563EB', marginTop: '4px' }}>
                    {trip.chilledItemsCount} items
                  </div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    TOTAL ORDERS
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                    {trip.totalOrdersCount} orders
                  </div>
                </div>

                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    TEMPERATURE
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#10B981', marginTop: '4px' }}>
                    {trip.temperatureStatus}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMN 2: Vehicle & Driver + Constraint Status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Vehicle & Driver Card */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid #f1f5f9',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 18px 0' }}>
                Vehicle & Driver
              </h2>

              {/* Vehicle Sub-section */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  VEHICLE
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      backgroundColor: '#EFF6FF',
                      color: '#2563EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      fontWeight: 800,
                    }}
                  >
                    V
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                        {trip.vehicleId}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          backgroundColor: '#EFF6FF',
                          color: '#2563EB',
                          textTransform: 'uppercase',
                        }}
                      >
                        {trip.vehicleType}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {trip.vehicleFullName}
                    </div>
                  </div>
                </div>

                {/* Key value list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Registration</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{trip.vehiclePlate}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Home depot</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{trip.homeDepot}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Trip usage</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{trip.tripUsage}</span>
                  </div>
                </div>
              </div>

              {/* Driver Sub-section */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginBottom: '18px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                  DRIVER
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: '#0f172a',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      fontWeight: 700,
                    }}
                  >
                    {trip.driverInitials}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                      {trip.driverName}
                    </div>
                    <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 600 }}>
                      {trip.driverStatus}
                    </div>
                  </div>
                </div>
              </div>

              {/* Call Driver Button */}
              <button disabled title="Driver calling is not connected yet"
                style={{
                  width: '100%',
                  padding: '11px',
                  backgroundColor: '#F59E0B',
                  color: '#0f172a',
                  fontSize: '13px',
                  fontWeight: 700,
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'not-allowed', opacity: 0.55,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <Phone size={14} />
                Call Driver
              </button>
            </div>

            {/* Constraint Status Card */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid #f1f5f9',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Constraint Status
                </h2>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    backgroundColor: '#ECFDF5',
                    color: '#10B981',
                  }}
                >
                  VALID
                </span>
              </div>

              {/* Constraint List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {trip.constraints.map((c) => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {c.status === 'VALID' ? (
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#ECFDF5', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={11} strokeWidth={3} />
                        </div>
                      ) : (
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#FFFBEB', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <AlertCircle size={12} strokeWidth={2.5} />
                        </div>
                      )}
                      <span style={{ color: '#334155', fontWeight: 500 }}>{c.label}</span>
                    </div>
                    <span style={{ color: '#64748b', fontSize: '11px' }}>{c.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* COLUMN 3: Trip Activity + Next Delivery */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Trip Activity Card */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid #f1f5f9',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ marginBottom: '18px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Trip Activity
                </h2>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  Today · Live updates
                </div>
              </div>

              {/* Activity Timeline */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {trip.activities.map((act) => (
                  <div key={act.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: act.status === 'current' ? '#F59E0B' : '#10B981',
                        marginTop: '4px',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ fontSize: '11px', color: '#94a3b8', width: '38px', flexShrink: 0, fontWeight: 600 }}>
                      {act.time}
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                        {act.title}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                        {act.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Next Delivery Card */}
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
                    backgroundColor: '#FEF3C7',
                    color: '#D97706',
                  }}
                >
                  NEXT STOP
                </span>
              </div>

              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                Waypoint Fresh
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '16px' }}>
                {trip.nextStopName}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Delivery window</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{trip.nextStopWindow}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Temperature</span>
                  <span style={{ fontWeight: 600, color: '#2563EB' }}>{trip.nextStopTemperature || 'Chilled'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Order</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{trip.nextStopOrder}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                  ETA {trip.nextStopEta}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#2563EB', cursor: 'pointer' }}>
                  Monitor window
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
