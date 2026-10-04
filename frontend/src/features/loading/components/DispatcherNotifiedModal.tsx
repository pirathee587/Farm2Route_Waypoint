import React from 'react';
import { Check } from 'lucide-react';

interface DispatcherNotifiedModalProps {
  isOpen: boolean;
  onBackToChecklist: () => void;
  message?: string;
  timestamp?: string;
}

export const DispatcherNotifiedModal: React.FC<DispatcherNotifiedModalProps> = ({
  isOpen,
  onBackToChecklist,
  message,
  timestamp,
}) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onBackToChecklist}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
        padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '460px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25)',
          padding: '36px 32px',
          textAlign: 'center',
          boxSizing: 'border-box',
          animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Large Green Check Circle */}
        <div
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            backgroundColor: '#DCFCE7',
            color: '#10B981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px auto',
          }}
        >
          <Check size={36} strokeWidth={2.6} />
        </div>

        {/* Modal Title */}
        <h2
          style={{
            fontSize: '22px',
            fontWeight: 800,
            color: '#0F172A',
            letterSpacing: '-0.02em',
            margin: '0 0 10px 0',
          }}
        >
          Dispatcher Notified
        </h2>

        {/* Description */}
        <p
          style={{
            fontSize: '13.5px',
            color: '#475569',
            lineHeight: 1.5,
            margin: '0 0 14px 0',
          }}
        >
          {message}
        </p>

        {/* Reported Timestamp */}
        <div
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#D97706',
            marginBottom: '26px',
          }}
        >
          {timestamp}
        </div>

        {/* Back to Item Checklist Button */}
        <button
          type="button"
          onClick={onBackToChecklist}
          style={{
            width: '100%',
            backgroundColor: '#111315',
            color: '#FFFFFF',
            padding: '13px 24px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            transition: 'background-color 0.15s ease',
            boxShadow: '0 4px 12px rgba(17, 19, 21, 0.25)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#1E2328';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#111315';
          }}
        >
          Back to Item Checklist
        </button>
      </div>
    </div>
  );
};
