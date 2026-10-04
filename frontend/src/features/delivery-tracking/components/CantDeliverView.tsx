import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';

interface CantDeliverViewProps {
  onBack: () => void;
  onSubmitReport: (reason: string, note: string) => void;
}

const REASONS = [
  'Outlet closed',
  'Access denied',
  'Wrong vehicle / temperature',
  'Wrong delivery window',
  'Other',
];

export const CantDeliverView: React.FC<CantDeliverViewProps> = ({
  onBack,
  onSubmitReport,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('Access denied');
  const [note, setNote] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => {
      onSubmitReport(selectedReason, note);
    }, 1000);
  };

  return (
    <div className="driver-screen-content animate-fade-in">
      {/* Header */}
      <div className="driver-header-nav">
        <button
          type="button"
          className="driver-back-btn"
          onClick={onBack}
          aria-label="Back"
        >
          <ChevronLeft size={22} strokeWidth={2.5} />
        </button>
        <h1 className="driver-header-title">Can’t Deliver</h1>
      </div>

      {/* Outlet Summary Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 20,
          padding: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Yellow circle with dot icon */}
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: '#fef9c3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: '#eab308',
              }}
            />
          </div>

          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
              Keells - K-Zone Moratuwa
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#64748b',
                marginTop: 1,
              }}
            >
              OUT027
            </div>
            <div
              style={{
                fontSize: 11.5,
                color: '#64748b',
                fontWeight: 500,
                marginTop: 2,
              }}
            >
              Mall access window
            </div>
          </div>
        </div>

        <div
          style={{
            fontSize: 12.5,
            fontWeight: 700,
            color: '#2563eb',
            textAlign: 'right',
            whiteSpace: 'nowrap',
          }}
        >
          09:30 AM – 10:00 AM
        </div>
      </div>

      {/* "What happened?" Section */}
      <div style={{ marginTop: 24 }}>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: '#0f172a',
            margin: '0 0 4px 0',
          }}
        >
          What happened?
        </h2>
        <p
          style={{
            fontSize: 13,
            color: '#64748b',
            margin: '0 0 16px 0',
          }}
        >
          Choose the closest reason. No long typing needed.
        </p>

        {/* Reason options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {REASONS.map((reason) => {
            const isSelected = selectedReason === reason;
            return (
              <button
                key={reason}
                type="button"
                onClick={() => setSelectedReason(reason)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '14px 16px',
                  borderRadius: 16,
                  border: isSelected
                    ? '2px solid #facc15'
                    : '1px solid #e2e8f0',
                  backgroundColor: isSelected ? '#fefce8' : '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  width: '100%',
                }}
              >
                {/* Radio Circle */}
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    border: isSelected
                      ? '6px solid #eab308'
                      : '2px solid #94a3b8',
                    backgroundColor: '#ffffff',
                    marginRight: 14,
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                />
                <span
                  style={{
                    fontSize: 14.5,
                    fontWeight: isSelected ? 800 : 600,
                    color: '#0f172a',
                  }}
                >
                  {reason}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Add a short note */}
      <div style={{ marginTop: 20 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
            Add a short note
          </span>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
            Optional
          </span>
        </div>

        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Describe what happened..."
          style={{
            width: '100%',
            borderRadius: 14,
            border: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            padding: '12px 14px',
            fontSize: 13.5,
            fontFamily: 'inherit',
            color: '#0f172a',
            resize: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Submit Button */}
      <div style={{ marginTop: 'auto', paddingTop: 20 }}>
        <button
          type="button"
          onClick={handleSubmit}
          className="driver-btn-primary"
          disabled={isSubmitted}
        >
          {isSubmitted ? 'Recording Deferral...' : 'Report Issue'}
        </button>
        <div
          style={{
            fontSize: 11,
            color: '#64748b',
            textAlign: 'center',
            marginTop: 8,
            fontWeight: 500,
            lineHeight: 1.3,
          }}
        >
          This outlet's deferral will be recorded to prevent repeated untracked skips.
        </div>
      </div>
    </div>
  );
};
