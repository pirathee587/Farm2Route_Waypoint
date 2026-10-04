// ============================================================
// TripDetailsSidebar.tsx — Right column panel on Live Tracking Overview
// ============================================================

import React from 'react';
import { Check, MessageSquare, Phone } from 'lucide-react';
import type { ActiveTrip } from '@/entities/tracking/trackingTypes';

interface TripDetailsSidebarProps {
  trip: ActiveTrip;
  onViewFullTrip: (tripId: string) => void;
}

export const TripDetailsSidebar: React.FC<TripDetailsSidebarProps> = ({
  trip,
  onViewFullTrip,
}) => {
  const weightPercent = Math.round((trip.weightKg / trip.maxWeightKg) * 100);
  const stopsPercent = Math.round((trip.completedStops / trip.totalStops) * 100);

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid #f1f5f9',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* Panel Header */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
            Trip Details
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
            }}
          >
            IN TRANSIT
          </span>
        </div>
        <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
          {trip.tripCode}
        </div>
        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
          {trip.origin} → {trip.destination}
        </div>
      </div>

      {/* Next Stop Highlight Box */}
      <div
        style={{
          backgroundColor: '#FFFBEB',
          borderRadius: '12px',
          padding: '14px 18px',
          border: '1px solid #FEF3C7',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            NEXT STOP
          </div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {trip.nextStopName}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ETA
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {trip.nextStopEta}
          </div>
        </div>
      </div>

      {/* Driver Section */}
      <div>
        <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
          DRIVER
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {trip.driverInitials}
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                {trip.driverName}
              </div>
              <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 600 }}>
                Driver · Active
              </div>
            </div>
          </div>
          <button
            disabled
            title="Messaging is not connected yet"
            style={{
              padding: '6px 14px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#334155',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              cursor: 'not-allowed', opacity: 0.55,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <MessageSquare size={13} />
            Message
          </button>
        </div>
      </div>

      {/* Vehicle Section */}
      <div>
        <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
          VEHICLE
        </div>
        <div
          style={{
            backgroundColor: '#f8fafc',
            borderRadius: '10px',
            padding: '12px',
            border: '1px solid #f1f5f9',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
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
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>
            {trip.vehiclePlate}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
            <span style={{ color: '#475569' }}>{trip.vehicleFullName}</span>
            <span style={{ color: '#10B981', fontWeight: 600 }}>Temperature OK</span>
          </div>
        </div>
      </div>

      {/* Load Section */}
      <div>
        <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
          LOAD
        </div>
        {/* Weight */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
            <span style={{ color: '#64748b' }}>Weight</span>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>
              {trip.weightKg.toLocaleString()} / {trip.maxWeightKg.toLocaleString()} kg
            </span>
          </div>
          <div style={{ width: '100%', height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${weightPercent}%`, height: '100%', backgroundColor: '#F59E0B', borderRadius: '3px' }} />
          </div>
          <div style={{ fontSize: '10px', color: '#D97706', fontWeight: 600, marginTop: '3px' }}>
            {weightPercent}% utilized
          </div>
        </div>

        {/* Stops */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
            <span style={{ color: '#64748b' }}>Stops completed</span>
            <span style={{ fontWeight: 700, color: '#2563EB' }}>
              {trip.completedStops}/{trip.totalStops}
            </span>
          </div>
          <div style={{ width: '100%', height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${stopsPercent}%`, height: '100%', backgroundColor: '#2563EB', borderRadius: '3px' }} />
          </div>
        </div>
      </div>

      {/* Trip Status Checklist */}
      <div>
        <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
          TRIP STATUS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <Check size={11} strokeWidth={3} />
              </div>
              <span style={{ fontWeight: 600, color: '#334155' }}>Loaded</span>
            </div>
            <span style={{ color: '#64748b' }}>07:50</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <Check size={11} strokeWidth={3} />
              </div>
              <span style={{ fontWeight: 600, color: '#334155' }}>Departed</span>
            </div>
            <span style={{ color: '#64748b' }}>08:10</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#fff' }} />
              </div>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>In Transit</span>
            </div>
            <span style={{ color: '#10B981', fontWeight: 600 }}>Now</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
        <button
          onClick={() => onViewFullTrip(trip.id)}
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '12px',
            fontWeight: 700,
            color: '#1e293b',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          View Full Trip
        </button>
        <button
          style={{
            width: '100%',
            padding: '11px',
            fontSize: '13px',
            fontWeight: 700,
            color: '#0f172a',
            backgroundColor: '#F59E0B',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            textAlign: 'center',
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
    </div>
  );
};
