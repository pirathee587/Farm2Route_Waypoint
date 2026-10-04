import React from 'react';
import type { AffectedOrder } from '@/entities/planning/planningTypes';
import { AlertCircle } from 'lucide-react';

interface ConfirmDeferralModalProps {
  order: AffectedOrder;
  formData: {
    reason: string;
    nextPlannedDate: string;
    operationalNote: string;
  };
  onBack: () => void;
  onConfirm: () => void;
  submitting?: boolean;
}

export const ConfirmDeferralModal: React.FC<ConfirmDeferralModalProps> = ({
  order,
  formData,
  onBack,
  onConfirm,
  submitting = false,
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '500px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
          textAlign: 'center',
        }}
      >
        <div style={{ padding: '36px 32px 24px' }}>
          {/* Top Exclamation Icon */}
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#FEF3C7',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <AlertCircle size={24} color="#D97706" />
          </div>

          <h2
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#0f172a',
              margin: '0 0 6px',
              letterSpacing: '-0.02em',
            }}
          >
            Confirm Order Deferral?
          </h2>
          <p
            style={{
              fontSize: '13px',
              color: '#64748b',
              margin: '0 0 24px',
            }}
          >
            This order will be removed from the current delivery plan.
          </p>

          {/* Details Grid */}
          <div
            style={{
              textAlign: 'left',
              display: 'grid',
              gridTemplateColumns: '130px 1fr',
              rowGap: '12px',
              columnGap: '16px',
              padding: '16px 20px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #f1f5f9',
              marginBottom: '20px',
            }}
          >
            <div style={{ fontSize: '13px', color: '#64748b' }}>Order:</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
              {order.id}
            </div>

            <div style={{ fontSize: '13px', color: '#64748b' }}>Outlet:</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
              {order.outletShort}
            </div>

            <div style={{ fontSize: '13px', color: '#64748b' }}>Reason:</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
              {formData.reason}
            </div>

            <div style={{ fontSize: '13px', color: '#64748b' }}>Next planned date:</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
              {formData.nextPlannedDate}
            </div>
          </div>

          {/* Warning / Note banner */}
          <div
            style={{
              backgroundColor: '#FEF9C3',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '11px',
              color: '#92400E',
              lineHeight: 1.4,
              textAlign: 'left',
            }}
          >
            The reason and next service date will be recorded for future planning and operational visibility.
          </div>
        </div>

        {/* Modal Actions */}
        <div
          style={{
            padding: '16px 32px 24px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            type="button"
            onClick={onBack}
            disabled={submitting}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Back
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#DC2626',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!submitting) e.currentTarget.style.backgroundColor = '#B91C1C';
            }}
            onMouseLeave={(e) => {
              if (!submitting) e.currentTarget.style.backgroundColor = '#DC2626';
            }}
          >
            {submitting ? 'Confirming...' : 'Confirm Deferral'}
          </button>
        </div>
      </div>
    </div>
  );
};
