import React from 'react';
import { Truck, CheckCircle2, RotateCw, Clock } from 'lucide-react';
import { SummaryMetricItem } from '../types';

interface SummaryCardProps {
  item: SummaryMetricItem;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ item }) => {
  const getIconConfig = () => {
    switch (item.iconType) {
      case 'truck':
        return {
          icon: Truck,
          bg: '#FEF3C7',
          color: '#D97706',
        };
      case 'check':
        return {
          icon: CheckCircle2,
          bg: '#FEF9C3',
          color: '#65A30D',
        };
      case 'progress':
        return {
          icon: RotateCw,
          bg: '#FEF3C7',
          color: '#D97706',
        };
      case 'pending':
        return {
          icon: Clock,
          bg: '#FEF3C7',
          color: '#D97706',
        };
      default:
        return {
          icon: Truck,
          bg: '#FEF3C7',
          color: '#D97706',
        };
    }
  };

  const { icon: Icon, bg, color } = getIconConfig();

  return (
    <div
      className="summary-card"
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      {/* Icon Badge */}
      <div
        style={{
          width: '46px',
          height: '46px',
          borderRadius: '10px',
          backgroundColor: bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={22} style={{ color }} strokeWidth={2.2} />
      </div>

      {/* Content */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#0F172A',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            {item.count}
          </span>
          <span
            style={{
              fontSize: '13.5px',
              fontWeight: 600,
              color: '#1E293B',
              lineHeight: 1.2,
            }}
          >
            {item.title}
          </span>
        </div>
        <span
          style={{
            fontSize: '11.5px',
            color: '#94A3B8',
            marginTop: '3px',
            fontWeight: 400,
          }}
        >
          {item.subtext}
        </span>
      </div>
    </div>
  );
};
