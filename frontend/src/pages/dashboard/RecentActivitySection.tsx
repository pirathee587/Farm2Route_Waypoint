// ============================================================
// RecentActivitySection — Activity feed at the bottom
// ============================================================

import React from 'react';
import type { RecentActivityItem } from '@/entities/dashboard/dashboardTypes';

const dotColorMap: Record<RecentActivityItem['color'], string> = {
  blue: '#3b82f6',
  red: '#ef4444',
  orange: '#F59E0B',
  green: '#10b981',
};

interface RecentActivitySectionProps {
  items: RecentActivityItem[];
  onViewAll: () => void;
}

export const RecentActivitySection: React.FC<RecentActivitySectionProps> = ({
  items,
  onViewAll,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '20px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
        }}
      >
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
          Recent Activity
        </h2>
        <button
          type="button"
          id="view-all-activity"
          onClick={onViewAll}
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#F59E0B',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 0',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = '0.75';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = '1';
          }}
        >
          View All
        </button>
      </div>

      {/* Activity rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            {/* Colored dot */}
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: dotColorMap[item.color],
                flexShrink: 0,
                marginTop: '4px',
              }}
            />

            {/* Time */}
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#64748b',
                flexShrink: 0,
                minWidth: '36px',
              }}
            >
              {item.time}
            </span>

            {/* Description */}
            <span
              style={{
                fontSize: '13px',
                color: '#1e293b',
                lineHeight: 1.5,
              }}
            >
              {item.description}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
