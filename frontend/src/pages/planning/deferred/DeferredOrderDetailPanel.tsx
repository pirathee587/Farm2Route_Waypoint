import React from 'react';
import { AlertCircle, Clock } from 'lucide-react';
import type { DeferredOrder } from '@/entities/planning/planningTypes';

interface Props {
  order: DeferredOrder | null;
}

const REQUIREMENT_STYLE: Record<string, { bg: string; color: string }> = {
  Chilled: { bg: '#DBEAFE', color: '#1E40AF' },
  Ambient: { bg: '#D1FAE5', color: '#065F46' },
  Frozen:  { bg: '#EDE9FE', color: '#5B21B6' },
};

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  Scheduled: { bg: '#D1FAE5', color: '#065F46' },
  Pending:   { bg: '#FEF3C7', color: '#92400E' },
  Review:    { bg: '#FEE2E2', color: '#991B1B' },
};

// Day/month helper for the big date display
function parseDateParts(isoDate: string): { day: string; monthAbbr: string; fullLabel: string } {
  const d = new Date(isoDate);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const monthAbbr = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase();
  const fullLabel = d.toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
  return { day, monthAbbr, fullLabel };
}

export const DeferredOrderDetailPanel: React.FC<Props> = ({ order }) => {
  if (!order) {
    return (
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '32px 20px',
          textAlign: 'center',
          color: '#94a3b8',
          fontSize: '13px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        Select an order to view details
      </div>
    );
  }

  const reqStyle = REQUIREMENT_STYLE[order.requirement] ?? REQUIREMENT_STYLE['Ambient'];
  const statusStyle = STATUS_BADGE[order.queueStatus] ?? STATUS_BADGE['Pending'];
  const { day, monthAbbr, fullLabel } = parseDateParts(order.nextPlannedDate);

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Deferred Order</span>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            color: statusStyle.color,
            backgroundColor: statusStyle.bg,
            padding: '3px 10px',
            borderRadius: '20px',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {order.queueStatus}
        </span>
      </div>

      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
        {/* Order ID + Outlet */}
        <div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>
            {order.id}
          </div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>{order.outletName}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
            {order.depot} · {order.depotRegion}
          </div>
        </div>

        {/* Delivery Requirements */}
        <div>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#94a3b8',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}
          >
            Delivery Requirements
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: reqStyle.color,
                backgroundColor: reqStyle.bg,
                padding: '4px 10px',
                borderRadius: '20px',
              }}
            >
              {order.requirement.toUpperCase()}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#374151',
                backgroundColor: '#f1f5f9',
                padding: '4px 10px',
                borderRadius: '20px',
              }}
            >
              {order.weightKg} kg
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#374151',
                backgroundColor: '#f1f5f9',
                padding: '4px 10px',
                borderRadius: '20px',
              }}
            >
              {order.volumeM3} m³
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
            Required window: <strong style={{ color: '#374151' }}>{order.deliveryWindow}</strong>
          </div>
        </div>

        {/* Deferral Reason */}
        <div>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#94a3b8',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}
          >
            Deferral Reason
          </div>
          <div
            style={{
              backgroundColor: '#FFF5F5',
              border: '1px solid #FED7D7',
              borderRadius: '8px',
              padding: '12px 14px',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
            }}
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '1px',
              }}
            >
              <AlertCircle size={13} color="#fff" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#C53030', marginBottom: '2px' }}>
                {order.deferralReasonFull}
              </div>
              <div style={{ fontSize: '11px', color: '#744210' }}>{order.deferralNote}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{order.deferredAt}</div>
            </div>
          </div>
        </div>

        {/* Next Planned Delivery */}
        <div>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#94a3b8',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}
          >
            Next Planned Delivery
          </div>
          <div
            style={{
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: '10px',
              padding: '12px 14px',
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: '#16A34A',
                borderRadius: '8px',
                padding: '6px 12px',
                minWidth: '48px',
                color: '#fff',
              }}
            >
              <span style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1 }}>{day}</span>
              <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em', lineHeight: 1, marginTop: '2px' }}>
                {monthAbbr}
              </span>
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#065F46' }}>{fullLabel}</div>
              <div style={{ fontSize: '11px', color: '#4ADE80', marginTop: '2px' }}>
                Planning allocation is feasible
              </div>
              <span
                style={{
                  display: 'inline-block',
                  marginTop: '4px',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#065F46',
                  backgroundColor: '#D1FAE5',
                  padding: '2px 8px',
                  borderRadius: '20px',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.04em',
                }}
              >
                {order.queueStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Order History */}
        <div>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#94a3b8',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: '10px',
            }}
          >
            Order History
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {order.history.map((evt, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: i === 0 ? '#22C55E' : '#F59E0B',
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>{evt.event}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>{evt.timestamp}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
