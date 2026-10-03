import React from 'react';
import type { AffectedOrder } from '@/entities/planning/planningTypes';
import { Check } from 'lucide-react';

interface OrderDecisionPanelProps {
  order: AffectedOrder | null;
  onKeepInPlan: (order: AffectedOrder) => void;
  onOpenDeferModal: (order: AffectedOrder) => void;
  submitting?: boolean;
}

export const OrderDecisionPanel: React.FC<OrderDecisionPanelProps> = ({
  order,
  onKeepInPlan,
  onOpenDeferModal,
  submitting = false,
}) => {
  if (!order) {
    return (
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#94a3b8',
          fontSize: '13px',
          minHeight: '380px',
        }}
      >
        Select an affected order from the table to review.
      </div>
    );
  }

  const getBrandBadge = (brand: string) => {
    switch (brand.toLowerCase()) {
      case 'fresh':
        return { bg: '#DCFCE7', text: '#16A34A', label: 'FRESH' };
      case 'style':
        return { bg: '#F3E8FF', text: '#7E22CE', label: 'STYLE' };
      case 'tech':
        return { bg: '#EFF6FF', text: '#2563EB', label: 'TECH' };
      default:
        return { bg: '#F1F5F9', text: '#475569', label: brand.toUpperCase() };
    }
  };

  const brandBadge = getBrandBadge(order.brand);

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h2
          style={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#0f172a',
            margin: '0 0 2px',
          }}
        >
          Order Decision
        </h2>
        <p
          style={{
            fontSize: '12px',
            color: '#64748b',
            margin: 0,
          }}
        >
          Review selected order
        </p>
      </div>

      {/* Order Info Title */}
      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '4px',
          }}
        >
          <span
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#0f172a',
              letterSpacing: '-0.02em',
            }}
          >
            {order.id}
          </span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: brandBadge.text,
              backgroundColor: brandBadge.bg,
              padding: '3px 8px',
              borderRadius: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {brandBadge.label}
          </span>
        </div>

        <div
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#1e293b',
            marginBottom: '2px',
          }}
        >
          {order.outletName}
        </div>
        <div
          style={{
            fontSize: '11px',
            color: '#64748b',
          }}
        >
          {order.depot} · {order.district}
        </div>
      </div>

      {/* Specs Box */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #f1f5f9',
          borderRadius: '8px',
          padding: '12px 14px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '10px',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#0284C7',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            ❄ {order.requirement.toUpperCase()}
          </span>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#1e293b',
            }}
          >
            {order.weightKg} kg
          </span>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#1e293b',
            }}
          >
            {order.volumeM3} m³
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '8px',
          }}
        >
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            DELIVERY WINDOW
          </span>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: order.timeSensitive ? '#DC2626' : '#1e293b',
            }}
          >
            {order.deliveryWindow}
          </span>
        </div>
      </div>

      {/* Planning Recommendation Card */}
      <div
        style={{
          backgroundColor: '#FEF3C7',
          borderRadius: '8px',
          padding: '14px 16px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            fontSize: '10px',
            fontWeight: 700,
            color: '#B45309',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '8px',
          }}
        >
          PLANNING RECOMMENDATION
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '10px',
            marginBottom: '6px',
          }}
        >
          <span
            style={{
              fontSize: '16px',
              fontWeight: 800,
              color: '#78350F',
            }}
          >
            {order.recommendation.action}
          </span>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: '#92400E',
            }}
          >
            {order.recommendation.reason}
          </span>
        </div>

        <div
          style={{
            fontSize: '11px',
            color: '#B45309',
            fontStyle: 'normal',
          }}
        >
          Dispatcher makes the final decision.
        </div>
      </div>

      {/* Decision State / Actions */}
      <div style={{ marginTop: 'auto' }}>
        {order.decisionState === 'Deferred' ? (
          /* Decision Recorded (Screenshot 4) */
          <div
            style={{
              backgroundColor: '#F0FDF4',
              border: '1px solid #DCFCE7',
              borderRadius: '8px',
              padding: '14px 16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px',
                color: '#166534',
                fontSize: '13px',
                fontWeight: 700,
              }}
            >
              <Check size={16} color="#16A34A" strokeWidth={2.5} />
              <span>Decision recorded</span>
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#15803D',
                marginBottom: '4px',
                fontWeight: 500,
              }}
            >
              Action: <span style={{ fontWeight: 600 }}>Deferred</span>
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#15803D',
              }}
            >
              Next planned date:{' '}
              <span style={{ fontWeight: 600 }}>
                {order.deferralRecord?.nextPlannedDate || '26 Sep 2026'}
              </span>
            </div>
          </div>
        ) : order.decisionState === 'Kept' ? (
          /* Kept in Plan */
          <div
            style={{
              backgroundColor: '#EFF6FF',
              border: '1px solid #DBEAFE',
              borderRadius: '8px',
              padding: '14px 16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '6px',
                color: '#1E40AF',
                fontSize: '13px',
                fontWeight: 700,
              }}
            >
              <Check size={16} color="#2563EB" strokeWidth={2.5} />
              <span>Kept in Plan</span>
            </div>
            <div
              style={{
                fontSize: '11px',
                color: '#1D4ED8',
              }}
            >
              Order remains active for vehicle reassignment and replanning.
            </div>
          </div>
        ) : (
          /* Unresolved: Show Action Buttons */
          <div
            style={{
              display: 'flex',
              gap: '12px',
            }}
          >
            <button
              type="button"
              onClick={() => onKeepInPlan(order)}
              disabled={submitting}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f8fafc';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
              }}
            >
              Keep in Plan
            </button>

            <button
              type="button"
              onClick={() => onOpenDeferModal(order)}
              disabled={submitting}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#F59E0B',
                color: '#0f172a',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#D97706';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F59E0B';
              }}
            >
              Defer Order
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
