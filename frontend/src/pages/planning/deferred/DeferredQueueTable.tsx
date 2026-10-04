import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { DeferredOrder, DeferralReasonCategory } from '@/entities/planning/planningTypes';

const PAGE_SIZE = 6;

interface Props {
  orders: DeferredOrder[];
  selectedId: string | null;
  activeFilter: 'All' | DeferralReasonCategory;
  onSelectOrder: (order: DeferredOrder) => void;
  onFilterChange: (f: 'All' | DeferralReasonCategory) => void;
  totalCounts: Record<string, number>;
}

const BRAND_COLORS: Record<string, string> = {
  Fresh: '#22c55e',
  Style: '#8B5CF6',
  Tech:  '#3B82F6',
};

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  Scheduled: { bg: '#D1FAE5', color: '#065F46' },
  Pending:   { bg: '#FEF3C7', color: '#92400E' },
  Review:    { bg: '#FEE2E2', color: '#991B1B' },
};

export const DeferredQueueTable: React.FC<Props> = ({
  orders,
  selectedId,
  activeFilter,
  onSelectOrder,
  onFilterChange,
  totalCounts,
}) => {
  const [page, setPage] = React.useState(1);

  // Reset to page 1 when filter changes
  React.useEffect(() => { setPage(1); }, [activeFilter]);

  const filtered =
    activeFilter === 'All'
      ? orders
      : orders.filter(o => o.deferralReasonCategory === activeFilter);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const TABS: { key: 'All' | DeferralReasonCategory; label: string }[] = [
    { key: 'All',      label: `All ${totalCounts['All'] ?? 0}` },
    { key: 'Capacity', label: `Capacity ${totalCounts['Capacity'] ?? 0}` },
    { key: 'Window',   label: `Window ${totalCounts['Window'] ?? 0}` },
    { key: 'Vehicle',  label: `Vehicle ${totalCounts['Vehicle'] ?? 0}` },
    { key: 'Other',    label: `Other ${totalCounts['Other'] ?? 0}` },
  ];

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>
          Deferred Delivery Queue
        </div>
        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
          Orders waiting for the next feasible delivery plan
        </div>
      </div>

      {/* Column headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1.2fr 0.8fr 1.2fr 1fr 0.9fr 40px',
          padding: '8px 20px',
          borderBottom: '1px solid #f1f5f9',
          backgroundColor: '#f8fafc',
        }}
      >
        {['ORDER', 'OUTLET', 'BRAND', 'DEFERRAL REASON', 'NEXT PLANNED', 'STATUS', ''].map(col => (
          <div
            key={col}
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#94a3b8',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {col}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div style={{ flex: 1 }}>
        {paginated.length === 0 ? (
          <div
            style={{
              padding: '48px 20px',
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: '13px',
            }}
          >
            No deferred orders currently require review.
          </div>
        ) : (
          paginated.map(order => {
            const isSelected = order.id === selectedId;
            const statusStyle = STATUS_STYLES[order.queueStatus] ?? STATUS_STYLES['Pending'];
            return (
              <div
                key={order.id}
                onClick={() => onSelectOrder(order)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.4fr 1.2fr 0.8fr 1.2fr 1fr 0.9fr 40px',
                  padding: '12px 20px',
                  borderBottom: '1px solid #f1f5f9',
                  backgroundColor: isSelected ? '#FFFBEB' : '#ffffff',
                  borderLeft: isSelected ? '3px solid #F59E0B' : '3px solid transparent',
                  cursor: 'pointer',
                  transition: 'background-color 0.1s',
                  alignItems: 'center',
                }}
                onMouseEnter={e => {
                  if (!isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor = '#f8fafc';
                }}
                onMouseLeave={e => {
                  if (!isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor = '#ffffff';
                }}
              >
                {/* Order ID */}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{order.id}</div>
                  <div style={{ fontSize: '11px', color: '#3b82f6', marginTop: '2px', cursor: 'pointer' }}>
                    View details
                  </div>
                </div>

                {/* Outlet */}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>{order.outletShort}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>{order.depot}</div>
                </div>

                {/* Brand */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: BRAND_COLORS[order.brand] ?? '#64748b',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#374151' }}>{order.brand}</span>
                </div>

                {/* Deferral Reason */}
                <div style={{ fontSize: '12px', color: '#374151' }}>{order.deferralReasonLabel}</div>

                {/* Next Planned */}
                <div style={{ fontSize: '12px', color: '#374151' }}>{order.nextPlannedDateLabel}</div>

                {/* Status */}
                <div>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: statusStyle.color,
                      backgroundColor: statusStyle.bg,
                      padding: '3px 8px',
                      borderRadius: '20px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {order.queueStatus}
                  </span>
                </div>

                {/* Chevron */}
                <ChevronRight size={14} color="#94a3b8" />
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} deferred orders.
          </span>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: p === page ? '#F59E0B' : '#e2e8f0',
                  backgroundColor: p === page ? '#F59E0B' : '#ffffff',
                  color: p === page ? '#0f172a' : '#64748b',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                {p}
              </button>
            ))}
            {page < totalPages && (
              <button
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  color: '#64748b',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                ›
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
