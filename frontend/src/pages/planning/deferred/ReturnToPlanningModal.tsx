import React from 'react';
import { RefreshCw } from 'lucide-react';
import type { DeferredOrder } from '@/entities/planning/planningTypes';

interface Props {
  order: DeferredOrder;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
  submitting: boolean;
  error: string | null;
}

export const ReturnToPlanningModal: React.FC<Props> = ({
  order,
  onCancel,
  onConfirm,
  submitting,
  error,
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '440px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
          overflow: 'hidden',
          padding: '32px 28px 28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            backgroundColor: '#FEF3C7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
          }}
        >
          <RefreshCw size={22} color="#F59E0B" strokeWidth={2.5} />
        </div>

        {/* Title */}
        <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
          Return Order to Planning?
        </div>

        {/* Subtitle */}
        <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
          {order.id} will return as an Unplanned order.
        </div>

        {/* Info box */}
        <div
          style={{
            backgroundColor: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: '10px',
            padding: '14px 16px',
            textAlign: 'left',
            width: '100%',
            marginBottom: '24px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#92400E',
              marginBottom: '6px',
            }}
          >
            This does not automatically make the order Planned.
          </div>
          <div style={{ fontSize: '12px', color: '#78350F', lineHeight: 1.6 }}>
            Nivethan must allocate it to a feasible vehicle and trip through Route Planning.
          </div>
        </div>

        {/* API error */}
        {error && (
          <div
            style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '12px',
              color: '#B91C1C',
              marginBottom: '16px',
              width: '100%',
              textAlign: 'left',
              boxSizing: 'border-box',
            }}
          >
            {error}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#64748b',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            style={{
              flex: 2,
              padding: '10px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#0f172a',
              backgroundColor: submitting ? '#FCD34D' : '#F59E0B',
              border: 'none',
              borderRadius: '8px',
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Returning…' : 'Return this order to planning?'}
          </button>
        </div>
      </div>
    </div>
  );
};
