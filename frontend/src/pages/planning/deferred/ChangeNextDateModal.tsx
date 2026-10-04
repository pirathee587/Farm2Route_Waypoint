import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { DeferredOrder } from '@/entities/planning/planningTypes';

interface Props {
  order: DeferredOrder;
  onCancel: () => void;
  onUpdateDate: (newDate: string, reasonForChange: string) => Promise<void>;
  submitting: boolean;
  error: string | null;
}

export const ChangeNextDateModal: React.FC<Props> = ({
  order,
  onCancel,
  onUpdateDate,
  submitting,
  error,
}) => {
  const [newDate, setNewDate] = useState('');
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate) {
      setValidationError('Please select a new date.');
      return;
    }
    setValidationError('');
    await onUpdateDate(newDate, reason);
  };

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
          maxWidth: '480px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
          overflow: 'hidden',
        }}
      >
        {/* Modal header */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>
              Change Next Planned Date
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Update when this order should return for planning review.
            </div>
          </div>
          <button
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px 24px' }}>
          {/* Order summary chip */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '20px',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{order.id}</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              {order.outletShort} · {order.requirement}
            </div>
          </div>

          {/* Current date / New date row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#94a3b8',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginBottom: '6px',
                }}
              >
                Current Date
              </label>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#374151',
                  padding: '9px 12px',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                }}
              >
                {order.nextPlannedDateLabel}
              </div>
            </div>

            <div>
              <label
                htmlFor="new-date"
                style={{
                  display: 'block',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#94a3b8',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginBottom: '6px',
                }}
              >
                New Date <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                id="new-date"
                type="date"
                value={newDate}
                onChange={e => { setNewDate(e.target.value); setValidationError(''); }}
                style={{
                  width: '100%',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#0f172a',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${validationError ? '#EF4444' : '#F59E0B'}`,
                  outline: 'none',
                  boxSizing: 'border-box',
                  backgroundColor: '#FFFBEB',
                }}
              />
              {validationError && (
                <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px' }}>{validationError}</div>
              )}
            </div>
          </div>

          {/* Reason for change */}
          <div style={{ marginBottom: '20px' }}>
            <label
              htmlFor="reason-for-change"
              style={{
                display: 'block',
                fontSize: '10px',
                fontWeight: 700,
                color: '#94a3b8',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}
            >
              Reason for Change
            </label>
            <textarea
              id="reason-for-change"
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              placeholder="Refrigerated capacity expected to be available."
              style={{
                width: '100%',
                fontSize: '13px',
                color: '#374151',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
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
              }}
            >
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              style={{
                padding: '9px 20px',
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
              type="submit"
              disabled={submitting}
              style={{
                padding: '9px 22px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#0f172a',
                backgroundColor: submitting ? '#FCD34D' : '#F59E0B',
                border: 'none',
                borderRadius: '8px',
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Updating…' : 'Update Date'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
