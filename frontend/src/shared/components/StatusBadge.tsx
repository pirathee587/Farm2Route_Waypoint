// ============================================================
// StatusBadge — reusable status pill for trips, alerts, etc.
// ============================================================

import React from 'react';

export type BadgeVariant =
  | 'in-transit'
  | 'loading'
  | 'ready'
  | 'completed'
  | 'delayed'
  | 'critical'
  | 'warning'
  | 'info'
  | 'success';

interface StatusBadgeProps {
  variant: BadgeVariant;
  label: string;
  size?: 'sm' | 'md';
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  'in-transit': {
    backgroundColor: '#EFF6FF',
    color: '#2563EB',
    border: '1px solid #BFDBFE',
  },
  loading: {
    backgroundColor: '#FFFBEB',
    color: '#D97706',
    border: '1px solid #FDE68A',
  },
  ready: {
    backgroundColor: '#F0FDF4',
    color: '#16A34A',
    border: '1px solid #BBF7D0',
  },
  completed: {
    backgroundColor: '#F0FDF4',
    color: '#15803D',
    border: '1px solid #BBF7D0',
  },
  delayed: {
    backgroundColor: '#FEF2F2',
    color: '#DC2626',
    border: '1px solid #FECACA',
  },
  critical: {
    backgroundColor: '#FEF2F2',
    color: '#DC2626',
    border: '1px solid #FECACA',
  },
  warning: {
    backgroundColor: '#FFFBEB',
    color: '#D97706',
    border: '1px solid #FDE68A',
  },
  info: {
    backgroundColor: '#F0F9FF',
    color: '#0369A1',
    border: '1px solid #BAE6FD',
  },
  success: {
    backgroundColor: '#F0FDF4',
    color: '#16A34A',
    border: '1px solid #BBF7D0',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ variant, label, size = 'sm' }) => {
  const base = variantStyles[variant];
  return (
    <span
      style={{
        ...base,
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: '20px',
        fontWeight: 600,
        fontSize: size === 'sm' ? '11px' : '12px',
        padding: size === 'sm' ? '3px 10px' : '4px 12px',
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
      }}
    >
      {label}
    </span>
  );
};
