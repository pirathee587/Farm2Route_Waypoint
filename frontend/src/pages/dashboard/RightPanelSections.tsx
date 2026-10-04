// ============================================================
// RightPanel — Live Operations + Fleet Availability + Today's Planning
// ============================================================

import React from 'react';
import type { DashboardSummary } from '@/entities/dashboard/dashboardTypes';

// ── Live Operations Mini Map ─────────────────────────────────

const LiveOperationsPanel: React.FC = () => {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ padding: '16px 18px 12px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
          Live Operations
        </h2>
        <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>
          Live fleet overview
        </p>
      </div>

      {/* Map placeholder */}
      <div
        style={{
          margin: '0 14px 14px',
          borderRadius: '8px',
          overflow: 'hidden',
          height: '140px',
          backgroundColor: '#e8edf2',
          position: 'relative',
          background: 'linear-gradient(135deg, #dde3ea 0%, #e8edf2 50%, #d6dde5 100%)',
        }}
      >
        {/* Stylized map grid lines */}
        <svg
          width="100%"
          height="100%"
          style={{ position: 'absolute', inset: 0 }}
          viewBox="0 0 300 140"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Road grid */}
          <line x1="0" y1="70" x2="300" y2="70" stroke="#c8d0da" strokeWidth="2" />
          <line x1="0" y1="35" x2="300" y2="35" stroke="#c8d0da" strokeWidth="1" />
          <line x1="0" y1="105" x2="300" y2="105" stroke="#c8d0da" strokeWidth="1" />
          <line x1="80" y1="0" x2="80" y2="140" stroke="#c8d0da" strokeWidth="2" />
          <line x1="200" y1="0" x2="200" y2="140" stroke="#c8d0da" strokeWidth="2" />
          <line x1="140" y1="0" x2="140" y2="140" stroke="#c8d0da" strokeWidth="1" />
          {/* Slight road tint */}
          <rect x="78" y="0" width="4" height="140" fill="#c0c9d4" />
          <rect x="198" y="0" width="4" height="140" fill="#c0c9d4" />
          <rect x="0" y="68" width="300" height="4" fill="#c0c9d4" />
        </svg>

        {/* Truck marker — Peliyagoda DC */}
        <div
          style={{
            position: 'absolute',
            top: '28px',
            left: '60px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '4px',
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              border: '2px solid #fff',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5">
              <rect x="1" y="3" width="15" height="13" rx="1" />
              <path d="M16 8h4l3 5v3h-7V8z" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
          </div>
          <div
            style={{
              backgroundColor: '#1e293b',
              color: '#fff',
              fontSize: '9px',
              fontWeight: 600,
              padding: '3px 6px',
              borderRadius: '4px',
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
            }}
          >
            Peliyagoda DC
            <div style={{ fontSize: '8px', color: '#94a3b8', fontWeight: 400 }}>
              4 vehicles · 3 loading
            </div>
          </div>
        </div>

        {/* Truck marker — Kandy dock */}
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '40px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '4px',
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              border: '2px solid #fff',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5">
              <rect x="1" y="3" width="15" height="13" rx="1" />
              <path d="M16 8h4l3 5v3h-7V8z" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
          </div>
          <div
            style={{
              backgroundColor: '#1e293b',
              color: '#fff',
              fontSize: '9px',
              fontWeight: 600,
              padding: '3px 6px',
              borderRadius: '4px',
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
            }}
          >
            Kandy dock
            <div style={{ fontSize: '8px', color: '#94a3b8', fontWeight: 400 }}>
              2 vehicles · 1 ready
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Fleet Availability ───────────────────────────────────────

interface FleetStat {
  label: string;
  value: number;
  color: string;
}

interface FleetAvailabilityPanelProps {
  summary: DashboardSummary;
}

const FleetAvailabilityPanel: React.FC<FleetAvailabilityPanelProps> = ({ summary }) => {
  const stats: FleetStat[] = [
    { label: 'Available', value: summary.availableVehicles, color: '#10b981' },
    { label: 'In Transit', value: summary.inTransitVehicles, color: '#3b82f6' },
    { label: 'Loading', value: summary.loadingVehicles, color: '#F59E0B' },
    { label: 'Unavailable', value: summary.unavailableVehicles, color: '#ef4444' },
  ];

  const reeferPct = Math.round((summary.availableReefers / summary.totalReefers) * 100);

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '18px',
      }}
    >
      <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: '0 0 14px' }}>
        Fleet Availability
      </h2>

      {/* Stat row */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '14px' }}>
        {stats.map((stat) => (
          <div key={stat.label} style={{ flex: 1, textAlign: 'center' }}>
            <div
              style={{
                fontSize: '11px',
                color: '#94a3b8',
                fontWeight: 500,
                marginBottom: '4px',
              }}
            >
              {stat.label}
            </div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: stat.color,
                lineHeight: 1,
              }}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Reefer bar */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '6px',
          }}
        >
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
            Reefer Availability
          </span>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
            {summary.availableReefers} / {summary.totalReefers} available
          </span>
        </div>
        <div
          style={{
            height: '6px',
            borderRadius: '99px',
            backgroundColor: '#e2e8f0',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${reeferPct}%`,
              borderRadius: '99px',
              backgroundColor: '#F59E0B',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>
    </div>
  );
};

// ── Today's Planning ─────────────────────────────────────────

interface TodaysPlanningPanelProps {
  summary: DashboardSummary;
  onContinuePlanning: () => void;
}

const TodaysPlanningPanel: React.FC<TodaysPlanningPanelProps> = ({
  summary,
  onContinuePlanning,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '18px',
      }}
    >
      <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', margin: '0 0 12px' }}>
        Today's Planning
      </h2>

      {/* Progress label */}
      <div
        style={{
          fontSize: '12px',
          color: '#64748b',
          fontWeight: 500,
          marginBottom: '8px',
        }}
      >
        {summary.plannedOrders} of {summary.totalOrders} orders planned
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: '8px',
          borderRadius: '99px',
          backgroundColor: '#e2e8f0',
          overflow: 'hidden',
          marginBottom: '4px',
          position: 'relative',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${summary.plannedPercent}%`,
            borderRadius: '99px',
            backgroundColor: '#10b981',
            transition: 'width 0.4s ease',
          }}
        />
      </div>

      {/* Percent + sub-stats */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '14px',
        }}
      >
        <div style={{ display: 'flex', gap: '14px' }}>
          <span
            style={{
              fontSize: '11px',
              color: '#F59E0B',
              fontWeight: 600,
            }}
          >
            {summary.unplannedOrders} Unplanned
          </span>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
            {summary.deferredOrders} Deferred
          </span>
        </div>
        <span
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: '#10b981',
          }}
        >
          {summary.plannedPercent}%
        </span>
      </div>

      {/* CTA */}
      <button
        type="button"
        id="continue-planning-btn"
        onClick={onContinuePlanning}
        style={{
          width: '100%',
          backgroundColor: '#F59E0B',
          color: '#0f172a',
          fontWeight: 700,
          fontSize: '13px',
          padding: '10px 16px',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
          transition: 'background-color 0.15s ease',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#D97706';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F59E0B';
        }}
      >
        Continue Planning
      </button>
    </div>
  );
};

// ── Exports ──────────────────────────────────────────────────

export { LiveOperationsPanel, FleetAvailabilityPanel, TodaysPlanningPanel };
