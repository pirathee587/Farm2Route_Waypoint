// ============================================================
// ActiveTripCard.tsx — Left column card for an active trip
// ============================================================

import React from 'react';
import type { ActiveTrip } from '@/entities/tracking/trackingTypes';

interface ActiveTripCardProps {
  trip: ActiveTrip;
  isSelected: boolean;
  onSelect: (tripId: string) => void;
}

export const ActiveTripCard: React.FC<ActiveTripCardProps> = ({
  trip,
  isSelected,
  onSelect,
}) => {
  const getBadgeStyle = () => {
    if (trip.monitoringStatus === 'ISSUE') {
      return {
        bg: '#FEF2F2',
        color: '#DC2626',
        text: 'ISSUE',
      };
    }
    if (trip.monitoringStatus === 'AT_RISK') {
      return {
        bg: '#FFFBEB',
        color: '#D97706',
        text: 'AT RISK',
      };
    }
    return {
      bg: '#EFF6FF',
      color: '#2563EB',
      text: 'IN TRANSIT',
    };
  };

  const badge = getBadgeStyle();
  const progressPercent = Math.round((trip.completedStops / trip.totalStops) * 100);

  return (
    <div
      onClick={() => onSelect(trip.id)}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '12px',
        cursor: 'pointer',
        border: isSelected ? '1px solid #F59E0B' : '1px solid #f1f5f9',
        borderLeft: isSelected ? '4px solid #F59E0B' : '1px solid #f1f5f9',
        boxShadow: isSelected ? '0 4px 12px rgba(245, 158, 11, 0.08)' : '0 1px 3px rgba(0,0,0,0.02)',
        transition: 'all 0.15s ease',
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
          {trip.tripCode}
        </span>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '12px',
            backgroundColor: badge.bg,
            color: badge.color,
            letterSpacing: '0.04em',
          }}
        >
          {badge.text}
        </span>
      </div>

      {/* Vehicle & Driver */}
      <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>
        {trip.vehicleId} · {trip.vehicleType}
      </div>
      <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '10px' }}>
        {trip.driverName}
      </div>

      {/* Route & Stops */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>
        <span style={{ fontWeight: 500 }}>
          {trip.origin} <span style={{ color: '#94a3b8' }}>→</span> {trip.destination}
        </span>
        <span style={{ fontWeight: 600, color: '#2563EB' }}>
          {trip.completedStops}/{trip.totalStops} stops
        </span>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          width: '100%',
          height: '5px',
          backgroundColor: '#f1f5f9',
          borderRadius: '3px',
          overflow: 'hidden',
          marginBottom: '10px',
        }}
      >
        <div
          style={{
            width: `${progressPercent}%`,
            height: '100%',
            backgroundColor: '#2563EB',
            borderRadius: '3px',
          }}
        />
      </div>

      {/* Bottom Status / ETA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', paddingTop: '2px' }}>
        {trip.monitoringStatus === 'ISSUE' ? (
          <>
            <span style={{ color: '#DC2626', fontWeight: 600 }}>Delivery issue</span>
            <span style={{ color: '#DC2626', fontWeight: 600, cursor: 'pointer' }}>View issue →</span>
          </>
        ) : (
          <>
            <span style={{ color: '#64748b', fontWeight: 500 }}>
              ETA {trip.eta}
            </span>
            {trip.monitoringStatus === 'AT_RISK' ? (
              <span style={{ color: '#D97706', fontWeight: 600 }}>{trip.delayText || '+18 min delay'}</span>
            ) : (
              <span style={{ color: '#10B981', fontWeight: 600 }}>On time</span>
            )}
          </>
        )}
      </div>
    </div>
  );
};
