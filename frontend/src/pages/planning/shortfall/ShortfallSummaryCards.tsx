import React from 'react';
import type { ShortfallSummary } from '@/entities/planning/planningTypes';

interface ShortfallSummaryCardsProps {
  summary: ShortfallSummary;
}

export const ShortfallSummaryCards: React.FC<ShortfallSummaryCardsProps> = ({ summary }) => {
  const cards = [
    {
      dotColor: '#3B82F6',
      label: 'Orders Requiring Service',
      value: summary.ordersRequiringService,
      sublabel: "Today's demand",
      sublabelColor: '#3B82F6',
    },
    {
      dotColor: '#10B981',
      label: 'Can Be Served',
      value: summary.canBeServed,
      sublabel: 'Feasible',
      sublabelColor: '#10B981',
    },
    {
      dotColor: '#F59E0B',
      label: 'Require Decision',
      value: summary.requireDecision,
      sublabel: 'Dispatcher action',
      sublabelColor: '#D97706',
    },
    {
      dotColor: '#EF4444',
      label: 'Reefer Capacity',
      value: summary.reeferCapacity,
      sublabel: `${summary.reeferAvailable} currently available`,
      sublabelColor: '#EF4444',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '20px',
      }}
    >
      {cards.map((card, idx) => (
        <div
          key={idx}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '16px 20px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '10px',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: card.dotColor,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: '#64748b',
                whiteSpace: 'nowrap',
              }}
            >
              {card.label}
            </span>
          </div>

          <div
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: '#0f172a',
              lineHeight: 1.1,
              marginBottom: '6px',
              letterSpacing: '-0.02em',
            }}
          >
            {card.value}
          </div>

          <div
            style={{
              fontSize: '11px',
              fontWeight: 500,
              color: card.sublabelColor,
            }}
          >
            {card.sublabel}
          </div>
        </div>
      ))}
    </div>
  );
};
