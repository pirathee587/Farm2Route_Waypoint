// ============================================================
// ActiveTripsSection — List of active trips in the dashboard
// ============================================================

import React from 'react';
import type { ActiveTrip, TripStatus } from '@/entities/dashboard/dashboardTypes';
import { StatusBadge, type BadgeVariant } from '@/shared/components/StatusBadge';
import { ArrowRight } from 'lucide-react';

function tripStatusVariant(status: TripStatus): BadgeVariant {
  switch (status) {
    case 'In Transit':
      return 'in-transit';
    case 'Loading':
      return 'loading';
    case 'Ready':
      return 'ready';
    case 'Completed':
      return 'completed';
    case 'Delayed':
      return 'delayed';
    default:
      return 'info';
  }
}

interface TripRowProps {
  trip: ActiveTrip;
  onView: (tripId: string) => void;
}

const TripRow: React.FC<TripRowProps> = ({ trip, onView }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 0',
        borderBottom: '1px solid #f1f5f9',
        cursor: 'pointer',
      }}
      onClick={() => onView(trip.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onView(trip.id);
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.backgroundColor = '#f8fafc';
        (e.currentTarget as HTMLDivElement).style.marginLeft = '-16px';
        (e.currentTarget as HTMLDivElement).style.paddingLeft = '16px';
        (e.currentTarget as HTMLDivElement).style.marginRight = '-16px';
        (e.currentTarget as HTMLDivElement).style.paddingRight = '16px';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.backgroundColor = '';
        (e.currentTarget as HTMLDivElement).style.marginLeft = '';
        (e.currentTarget as HTMLDivElement).style.paddingLeft = '';
        (e.currentTarget as HTMLDivElement).style.marginRight = '';
        (e.currentTarget as HTMLDivElement).style.paddingRight = '';
      }}
    >
      {/* Trip ID + Vehicle */}
      <div style={{ flex: '0 0 130px', minWidth: 0 }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#1e293b',
          }}
        >
          {trip.id}
        </div>
        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
          {trip.vehicleId} · {trip.vehicleType}
        </div>
      </div>

      {/* Route + Driver */}
      <div style={{ flex: '1 1 0', minWidth: 0 }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {trip.route.replace('→', '')}
          <ArrowRight size={12} color="#94a3b8" />
          {trip.route.split('→')[1]?.trim()}
        </div>
        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
          {trip.driver}
        </div>
      </div>

      {/* Stops + ETA */}
      <div style={{ flex: '0 0 90px', textAlign: 'right' }}>
        <div style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>
          {trip.stopsCompleted} / {trip.totalStops} stops
        </div>
        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
          ETA {trip.eta}
        </div>
      </div>

      {/* Status */}
      <div style={{ flex: '0 0 90px', display: 'flex', justifyContent: 'flex-end' }}>
        <StatusBadge variant={tripStatusVariant(trip.status)} label={trip.status} />
      </div>
    </div>
  );
};

interface ActiveTripsSectionProps {
  trips: ActiveTrip[];
  onViewAll: () => void;
  onViewTrip: (tripId: string) => void;
}

export const ActiveTripsSection: React.FC<ActiveTripsSectionProps> = ({
  trips,
  onViewAll,
  onViewTrip,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '20px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '4px',
        }}
      >
        <h2
          style={{
            fontSize: '15px',
            fontWeight: 700,
            color: '#1e293b',
            margin: 0,
          }}
        >
          Active Trips
        </h2>
        <button
          type="button"
          id="view-all-trips"
          onClick={onViewAll}
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#F59E0B',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 0',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = '0.75';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = '1';
          }}
        >
          View All
        </button>
      </div>

      {/* Rows */}
      <div>
        {trips.map((trip) => (
          <TripRow key={trip.id} trip={trip} onView={onViewTrip} />
        ))}
      </div>
    </div>
  );
};
