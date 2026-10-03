import React, { useState } from 'react';
import type { AffectedOrder } from '@/entities/planning/planningTypes';

export const DEFERRAL_REASONS = [
  'Refrigerated capacity unavailable',
  'Vehicle capacity unavailable',
  'Delivery window infeasible',
  'Outlet access restriction',
  'Weekly fuel quota exceeded',
  'Vehicle route limit reached',
  'No feasible vehicle available',
  'Other operational reason',
];

interface DeferOrderModalProps {
  order: AffectedOrder;
  initialReason?: string;
  initialDate?: string;
  initialNote?: string;
  onCancel: () => void;
  onContinue: (formData: { reason: string; nextPlannedDate: string; operationalNote: string }) => void;
}

export const DeferOrderModal: React.FC<DeferOrderModalProps> = ({
  order,
  initialReason = 'Refrigerated capacity unavailable',
  initialDate = '26 Sep 2026',
  initialNote = '',
  onCancel,
  onContinue,
}) => {
  const [reason, setReason] = useState(initialReason);
  const [nextPlannedDate, setNextPlannedDate] = useState(initialDate);
  const [operationalNote, setOperationalNote] = useState(initialNote);
  const [validationError, setValidationError] = useState('');

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || !nextPlannedDate.trim()) {
      setValidationError('* A reason and next planned date are required.');
      return;
    }
    setValidationError('');
    onContinue({
      reason,
      nextPlannedDate,
      operationalNote,
    });
  };

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
          maxWidth: '520px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Modal Header */}
        <div style={{ padding: '28px 32px 20px' }}>
          <h2
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#0f172a',
              margin: '0 0 4px',
              letterSpacing: '-0.02em',
            }}
          >
            Defer Order
          </h2>
          <p
            style={{
              fontSize: '13px',
              color: '#64748b',
              margin: 0,
            }}
          >
            Record why this order cannot be served in the current plan.
          </p>
        </div>

        <form onSubmit={handleContinue}>
          <div style={{ padding: '0 32px 24px' }}>
            {/* Selected Order Box */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '14px 16px',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#0f172a',
                  marginBottom: '2px',
                }}
              >
                {order.id}
              </div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#1e293b',
                  marginBottom: '4px',
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
                {order.requirement} · {order.weightKg} kg · {order.deliveryWindow}
              </div>
            </div>

            {/* Deferral Reason */}
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="deferral-reason"
                style={{
                  display: 'block',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '6px',
                }}
              >
                DEFERRAL REASON *
              </label>
              <select
                id="deferral-reason"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (validationError) setValidationError('');
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '13px',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                }}
              >
                <option value="">Select reason...</option>
                {DEFERRAL_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Next Planned Date */}
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="next-planned-date"
                style={{
                  display: 'block',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '6px',
                }}
              >
                NEXT PLANNED DATE *
              </label>
              <input
                id="next-planned-date"
                type="text"
                value={nextPlannedDate}
                onChange={(e) => {
                  setNextPlannedDate(e.target.value);
                  if (validationError) setValidationError('');
                }}
                placeholder="e.g. 26 Sep 2026"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '13px',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Operational Note */}
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="operational-note"
                style={{
                  display: 'block',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '6px',
                }}
              >
                OPERATIONAL NOTE
              </label>
              <textarea
                id="operational-note"
                rows={3}
                value={operationalNote}
                onChange={(e) => setOperationalNote(e.target.value)}
                placeholder="Add optional context for the next planning cycle..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '13px',
                  color: '#0f172a',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Inline validation message */}
            {validationError && (
              <div
                style={{
                  fontSize: '11px',
                  color: '#DC2626',
                  fontWeight: 600,
                  marginBottom: '12px',
                }}
              >
                {validationError}
              </div>
            )}
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
              onClick={onCancel}
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
              Cancel
            </button>

            <button
              type="submit"
              style={{
                padding: '10px 24px',
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
              Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
