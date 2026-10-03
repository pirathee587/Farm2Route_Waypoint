import React from 'react';
import { User, Warehouse } from 'lucide-react';
import { Trip } from '../types';
import { TruckIllustration } from './TruckIllustration';

interface TripCardProps {
  trip: Trip;
  onClick?: () => void;
}

export const TripCard: React.FC<TripCardProps> = ({ trip, onClick }) => {
  const getStatusConfig = () => {
    switch (trip.status) {
      case 'Loading':
        return {
          label: 'Loading',
          badgeBg: '#FEF3C7',
          dotColor: '#D97706',
          textColor: '#92400E',
          progressColor: '#F5A623',
          percentColor: '#D97706',
        };
      case 'Ready':
        return {
          label: 'Ready',
          badgeBg: '#DCFCE7',
          dotColor: '#16A34A',
          textColor: '#15803D',
          progressColor: '#10B981',
          percentColor: '#16A34A',
        };
      case 'Not Started':
        return {
          label: 'Not Started',
          badgeBg: '#F1F5F9',
          dotColor: '#64748B',
          textColor: '#475569',
          progressColor: '#E2E8F0',
          percentColor: '#94A3B8',
        };
      case 'Issue':
        return {
          label: 'Issue',
          badgeBg: '#FEE2E2',
          dotColor: '#EF4444',
          textColor: '#B91C1C',
          progressColor: '#EF4444',
          percentColor: '#EF4444',
        };
      default:
        return {
          label: trip.status,
          badgeBg: '#F1F5F9',
          dotColor: '#64748B',
          textColor: '#475569',
          progressColor: '#94A3B8',
          percentColor: '#64748B',
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div
      className="trip-card"
      onClick={onClick}
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '14px',
        border: '1px solid #E5E7EB',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.18s ease',
      }}
    >
      {/* Top Header Row: Status Badge & Percentage */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        {/* Status Badge Pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: statusConfig.badgeBg,
            color: statusConfig.textColor,
            padding: '3px 10px',
            borderRadius: '100px',
            fontSize: '11.5px',
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: statusConfig.dotColor,
              display: 'inline-block',
            }}
          />
          <span>{statusConfig.label}</span>
        </div>

        {/* Top-Right Progress Percentage */}
        <span
          style={{
            fontSize: '14px',
            fontWeight: 700,
            color: '#0F172A',
            letterSpacing: '-0.01em',
          }}
        >
          {trip.progressPercent}%
        </span>
      </div>

      {/* Middle Row: Vehicle Illustration + ID Details */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '18px',
        }}
      >
        {/* Truck Drawing */}
        <div style={{ flexShrink: 0 }}>
          <TruckIllustration width={80} height={42} />
        </div>

        {/* Vehicle Metadata */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            flexGrow: 1,
            paddingLeft: '6px',
          }}
        >
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: '#94A3B8',
              textTransform: 'uppercase',
            }}
          >
            VEHICLE ID
          </span>
          <span
            style={{
              fontSize: '19px',
              fontWeight: 800,
              color: '#0F172A',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              marginTop: '1px',
            }}
          >
            {trip.vehicleId}
          </span>
          <span
            style={{
              fontSize: '11.5px',
              color: '#64748B',
              fontWeight: 500,
              marginTop: '2px',
            }}
          >
            {trip.weightLoaded.toLocaleString()} / {trip.weightCapacity.toLocaleString()} kg
          </span>
        </div>
      </div>

      {/* Route Row: Origin -> Destination + Stops badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          paddingBottom: '12px',
          marginBottom: '10px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12.5px',
            fontWeight: 700,
            color: '#0F172A',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          <span>{trip.origin}</span>
          <span style={{ color: '#94A3B8', fontWeight: 600 }}>→</span>
          <span>{trip.destination}</span>
        </div>

        <span
          style={{
            backgroundColor: '#F1F5F9',
            color: '#64748B',
            fontSize: '10.5px',
            fontWeight: 500,
            padding: '2px 8px',
            borderRadius: '6px',
            flexShrink: 0,
          }}
        >
          {trip.stopsCount} stops
        </span>
      </div>

      {/* Meta Row: Dock & Driver */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          marginBottom: '14px',
          fontSize: '11.5px',
          color: '#64748B',
        }}
      >
        {/* Dock info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Warehouse size={13} style={{ color: '#94A3B8' }} />
          <span>{trip.dock}</span>
        </div>

        {/* Driver info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <User size={13} style={{ color: '#94A3B8' }} />
          <span style={{ whiteSpace: 'nowrap' }}>{trip.driver}</span>
        </div>
      </div>

      {/* Progress Bar Section */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '6px',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              color: '#64748B',
              fontWeight: 500,
            }}
          >
            Load progress
          </span>
        </div>

        {/* Track */}
        <div
          style={{
            width: '100%',
            height: '4px',
            backgroundColor: '#F1F5F9',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${trip.progressPercent}%`,
              height: '100%',
              backgroundColor: statusConfig.progressColor,
              borderRadius: '2px',
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        {/* Bottom Progress Label matching screenshot */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '4px',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: statusConfig.percentColor,
            }}
          >
            {trip.progressPercent}%
          </span>
        </div>
      </div>
    </div>
  );
};
