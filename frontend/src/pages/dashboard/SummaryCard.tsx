// ============================================================
// SummaryCard — Dashboard KPI card component
// ============================================================

import React from 'react';

interface SummaryCardProps {
  label: string;
  value: string | number;
  subLabel?: string;
  dotColor?: string;
  id?: string;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  label,
  value,
  subLabel,
  dotColor,
  id,
}) => {
  return (
    <div
      id={id}
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        minWidth: 0,
        flex: 1,
      }}
    >
      {/* Label row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          marginBottom: '4px',
        }}
      >
        {dotColor && (
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: dotColor,
              flexShrink: 0,
              display: 'inline-block',
            }}
          />
        )}
        <span
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: '#64748b',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
      </div>

      {/* Value */}
      <div
        style={{
          fontSize: '26px',
          fontWeight: 700,
          color: '#0f172a',
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </div>

      {/* Sub label */}
      {subLabel && (
        <div
          style={{
            fontSize: '11px',
            color: '#94a3b8',
            fontWeight: 400,
            marginTop: '2px',
          }}
        >
          {subLabel}
        </div>
      )}
    </div>
  );
};
