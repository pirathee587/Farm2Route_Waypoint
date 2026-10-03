// ============================================================
// PlanningAttentionSection — "Needs Attention" alert area
// ============================================================

import React from 'react';
import type { AttentionItem } from '@/entities/dashboard/dashboardTypes';

interface AttentionRowProps {
  item: AttentionItem;
  onAction: (target: string) => void;
}

const severityIcon = (severity: AttentionItem['severity']) => {
  if (severity === 'critical') {
    return (
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          backgroundColor: '#FEE2E2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#EF4444',
          fontWeight: 800,
          fontSize: '14px',
          flexShrink: 0,
        }}
      >
        !
      </div>
    );
  }
  if (severity === 'warning') {
    return (
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          backgroundColor: '#FEF3C7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#D97706',
          fontWeight: 800,
          fontSize: '14px',
          flexShrink: 0,
        }}
      >
        !
      </div>
    );
  }
  // info (snowflake for Reefer)
  return (
    <div
      style={{
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        backgroundColor: '#F0F9FF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#38BDF8', // Lighter blue to match the original
        fontWeight: 800,
        fontSize: '14px',
        flexShrink: 0,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="2" y1="12" x2="22" y2="12" />
        <line x1="12" y1="2" x2="12" y2="22" />
        <line x1="20" y1="16" x2="17" y2="12" />
        <line x1="17" y1="12" x2="20" y2="8" />
        <line x1="4" y1="8" x2="7" y2="12" />
        <line x1="7" y1="12" x2="4" y2="16" />
        <line x1="16" y1="4" x2="12" y2="7" />
        <line x1="12" y1="7" x2="8" y2="4" />
        <line x1="8" y1="20" x2="12" y2="17" />
        <line x1="12" y1="17" x2="16" y2="20" />
      </svg>
    </div>
  );
};

const actionButtonColor = (item: AttentionItem): React.CSSProperties => {
  if (item.severity === 'critical') {
    return {
      color: '#EF4444',
      backgroundColor: '#FEF2F2',
      border: '1px solid #FECACA',
    };
  }
  if (item.severity === 'warning') {
    return {
      color: '#D97706',
      backgroundColor: '#FFFBEB',
      border: '1px solid #FDE68A',
    };
  }
  return {
    color: '#0369A1',
    backgroundColor: '#F0F9FF',
    border: '1px solid #BAE6FD',
  };
};

const AttentionRow: React.FC<AttentionRowProps> = ({ item, onAction }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '14px 16px',
        borderRadius: '8px',
        backgroundColor: '#FAFAFA',
        border: '1px solid #f1f5f9',
      }}
    >
      {severityIcon(item.severity)}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#1e293b',
            lineHeight: 1.4,
          }}
        >
          {item.title}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: '#64748b',
            marginTop: '2px',
            lineHeight: 1.4,
          }}
        >
          {item.description}
        </div>
      </div>

      <button
        type="button"
        id={`attention-action-${item.id}`}
        onClick={() => onAction(item.actionTarget)}
        style={{
          ...actionButtonColor(item),
          fontSize: '12px',
          fontWeight: 600,
          padding: '6px 14px',
          borderRadius: '6px',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          transition: 'opacity 0.15s ease',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = '0.8';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = '1';
        }}
      >
        {item.actionLabel}
      </button>
    </div>
  );
};

interface PlanningAttentionSectionProps {
  items: AttentionItem[];
  onNavigate: (target: string) => void;
}

export const PlanningAttentionSection: React.FC<PlanningAttentionSectionProps> = ({
  items,
  onNavigate,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '4px' }}>
        <h2
          style={{
            fontSize: '15px',
            fontWeight: 700,
            color: '#1e293b',
            margin: 0,
          }}
        >
          Planning Attention
        </h2>
        <p
          style={{
            fontSize: '12px',
            color: '#94a3b8',
            margin: '3px 0 0',
          }}
        >
          Operational items requiring dispatcher action
        </p>
      </div>

      {/* Attention rows */}
      {items.map((item) => (
        <AttentionRow key={item.id} item={item} onAction={onNavigate} />
      ))}
    </div>
  );
};
