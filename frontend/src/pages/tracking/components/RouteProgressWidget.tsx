// ============================================================
// RouteProgressWidget.tsx — Route progress timeline for Overview
// ============================================================

import React from 'react';
import { Check } from 'lucide-react';
import type { ActiveTrip } from '@/entities/tracking/trackingTypes';

interface RouteProgressWidgetProps {
  trip: ActiveTrip;
}

export const RouteProgressWidget: React.FC<RouteProgressWidgetProps> = ({ trip }) => {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '20px',
        border: '1px solid #f1f5f9',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
          Route Progress
        </span>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#2563EB', cursor: 'pointer' }}>
          {trip.tripCode}
        </span>
      </div>

      {/* Vertical Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
        {/* Step 1: Depot */}
        <div style={{ display: 'flex', gap: '14px', position: 'relative' }}>
          {/* Connector line */}
          <div
            style={{
              position: 'absolute',
              top: '20px',
              left: '11px',
              width: '2px',
              height: '38px',
              backgroundColor: '#10B981',
            }}
          />
          {/* Icon */}
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              zIndex: 2,
              flexShrink: 0,
            }}
          >
            <Check size={14} strokeWidth={2.5} />
          </div>
          {/* Details */}
          <div style={{ paddingBottom: '22px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
              Peliyagoda Depot
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Departed - 08:10
            </div>
          </div>
        </div>

        {/* Step 2: Delivered */}
        <div style={{ display: 'flex', gap: '14px', position: 'relative' }}>
          {/* Connector line */}
          <div
            style={{
              position: 'absolute',
              top: '20px',
              left: '11px',
              width: '2px',
              height: '38px',
              backgroundColor: '#10B981',
            }}
          />
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              zIndex: 2,
              flexShrink: 0,
            }}
          >
            <Check size={14} strokeWidth={2.5} />
          </div>
          <div style={{ paddingBottom: '22px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
              Wattala
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Delivered - 09:05
            </div>
          </div>
        </div>

        {/* Step 3: Next Stop */}
        <div style={{ display: 'flex', gap: '14px', position: 'relative' }}>
          {/* Connector line */}
          <div
            style={{
              position: 'absolute',
              top: '20px',
              left: '11px',
              width: '2px',
              height: '38px',
              backgroundColor: '#e2e8f0',
            }}
          />
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: '#F59E0B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 800,
              zIndex: 2,
              flexShrink: 0,
            }}
          >
            3
          </div>
          <div style={{ paddingBottom: '22px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                Waypoint Fresh — Colombo 07
              </div>
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  backgroundColor: '#FEF3C7',
                  color: '#D97706',
                  padding: '2px 8px',
                  borderRadius: '10px',
                }}
              >
                NEXT
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#d97706', fontWeight: 600, marginTop: '2px' }}>
              Next stop · ETA 10:40
            </div>
          </div>
        </div>

        {/* Step 4: Upcoming */}
        <div style={{ display: 'flex', gap: '14px' }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              border: '2px solid #cbd5e1',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              fontSize: '11px',
              fontWeight: 700,
              zIndex: 2,
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
              Nugegoda
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              Planned - 11:20
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
