import React from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { Brand, PlanningStatus, TemperatureRequirement } from '@/entities/order/orderTypes';

export type StatusFilter = 'All' | 'New' | PlanningStatus;
export type BrandFilter = 'All' | Brand;
export type TempFilter = 'All' | TemperatureRequirement;
export type ConstraintFilter = 'All' | 'Reefer Required' | 'Van Only' | 'Tight Window';

export interface ActiveFilters {
  brand: BrandFilter;
  temperature: TempFilter;
  constraint: ConstraintFilter;
}

interface OrdersFilterBarProps {
  searchTerm: string;
  onSearch: (term: string) => void;
  statusFilter: StatusFilter;
  onStatusFilter: (status: StatusFilter) => void;
  activeFilters: ActiveFilters;
  onApplyFilters: (filters: ActiveFilters) => void;
  onPlanOrders: () => void;
  summary: { totalOrders: number; fresh: number; style: number; tech: number };
}

export const OrdersFilterBar: React.FC<OrdersFilterBarProps> = ({
  searchTerm,
  onSearch,
  statusFilter,
  onStatusFilter,
  activeFilters,
  onApplyFilters,
  onPlanOrders,
  summary,
}) => {
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<ActiveFilters>(activeFilters);

  const hasActiveFilters =
    activeFilters.brand !== 'All' ||
    activeFilters.temperature !== 'All' ||
    activeFilters.constraint !== 'All';

  const statusPills: { label: StatusFilter; activeStyle: React.CSSProperties; inactiveStyle: React.CSSProperties }[] = [
    {
      label: 'All',
      activeStyle: { backgroundColor: '#0f172a', color: '#fff', border: '1px solid #0f172a' },
      inactiveStyle: { backgroundColor: 'transparent', color: '#64748b', border: '1px solid #e2e8f0' },
    },
    {
      label: 'New',
      activeStyle: { backgroundColor: '#FEF3C7', color: '#D97706', border: '1px solid #FDE68A' },
      inactiveStyle: { backgroundColor: 'transparent', color: '#64748b', border: '1px solid #e2e8f0' },
    },
    {
      label: 'Unplanned',
      activeStyle: { backgroundColor: '#FEF3C7', color: '#D97706', border: '1px solid #FDE68A' },
      inactiveStyle: { backgroundColor: 'transparent', color: '#64748b', border: '1px solid #e2e8f0' },
    },
    {
      label: 'Planned',
      activeStyle: { backgroundColor: '#DCFCE7', color: '#16A34A', border: '1px solid #BBF7D0' },
      inactiveStyle: { backgroundColor: 'transparent', color: '#64748b', border: '1px solid #e2e8f0' },
    },
    {
      label: 'Deferred',
      activeStyle: { backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA' },
      inactiveStyle: { backgroundColor: 'transparent', color: '#64748b', border: '1px solid #e2e8f0' },
    },
  ];

  const handleOpenPanel = () => {
    setDraft(activeFilters);
    setPanelOpen(true);
  };

  const handleApply = () => {
    onApplyFilters(draft);
    setPanelOpen(false);
  };

  const handleReset = () => {
    const cleared: ActiveFilters = { brand: 'All', temperature: 'All', constraint: 'All' };
    setDraft(cleared);
    onApplyFilters(cleared);
    setPanelOpen(false);
  };

  return (
    <div style={{ marginBottom: '24px', position: 'relative' }}>
      {/* Top Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        
        {/* Brand Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {([
            { id: 'All', label: 'All Orders', count: summary.totalOrders },
            { id: 'Fresh', label: 'Fresh', count: summary.fresh },
            { id: 'Style', label: 'Style', count: summary.style },
            { id: 'Tech', label: 'Tech', count: summary.tech },
          ] as const).map((tab) => {
            const isActive = activeFilters.brand === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onApplyFilters({ ...activeFilters, brand: tab.id as BrandFilter })}
                style={{
                  backgroundColor: isActive ? '#0f172a' : 'transparent',
                  color: isActive ? '#fff' : '#475569',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: isActive ? '1px solid #0f172a' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
                <span style={{ color: isActive ? '#F59E0B' : '#94a3b8', fontSize: '12px' }}>{tab.count}</span>
              </button>
            );
          })}
        </div>

        {/* Search + Filter + Plan */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative', width: '240px' }}>
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search order, outlet or district"
              value={searchTerm}
              onChange={(e) => onSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px 8px 30px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                fontSize: '13px',
                color: '#1e293b',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {searchTerm && (
              <button
                onClick={() => onSearch('')}
                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          <button
            onClick={handleOpenPanel}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', borderRadius: '8px',
              border: hasActiveFilters ? '1px solid #F59E0B' : '1px solid #e2e8f0',
              backgroundColor: hasActiveFilters ? '#FEF3C7' : '#fff',
              fontSize: '13px', fontWeight: 600,
              color: hasActiveFilters ? '#D97706' : '#1e293b',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <SlidersHorizontal size={14} />
            Filters
            {hasActiveFilters && (
              <span style={{ backgroundColor: '#F59E0B', color: '#0f172a', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>!</span>
            )}
          </button>

          <button
            onClick={onPlanOrders}
            style={{
              padding: '8px 18px', borderRadius: '8px', border: 'none',
              backgroundColor: '#F59E0B', fontSize: '13px', fontWeight: 700,
              color: '#0f172a', cursor: 'pointer',
            }}
          >
            Plan Orders
          </button>
        </div>
      </div>

      {/* Status Pills Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>STATUS</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {statusPills.map((pill) => {
              const isActive = statusFilter === pill.label;
              return (
                <button
                  key={pill.label}
                  onClick={() => onStatusFilter(pill.label)}
                  style={{
                    padding: '4px 14px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    ...(isActive ? pill.activeStyle : pill.inactiveStyle),
                  }}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '12px', color: '#94a3b8' }}>
          <span>Depot: <span style={{ color: '#1e293b', fontWeight: 500 }}>All</span></span>
          <span>Temperature: <span style={{ color: activeFilters.temperature !== 'All' ? '#D97706' : '#1e293b', fontWeight: 500 }}>{activeFilters.temperature}</span></span>
          <span>Delivery Window: <span style={{ color: '#1e293b', fontWeight: 500 }}>All</span></span>
        </div>
      </div>

      {/* Filter Panel Overlay */}
      {panelOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setPanelOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 40, backgroundColor: 'rgba(0,0,0,0.1)' }}
          />
          {/* Panel */}
          <div
            style={{
              position: 'absolute', top: '100%', right: 0, zIndex: 50,
              backgroundColor: '#fff', borderRadius: '12px', padding: '24px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              border: '1px solid #e2e8f0',
              width: '340px',
              marginTop: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>Filter Orders</div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Narrow the queue by operational requirements.</div>
              </div>
              <button onClick={() => setPanelOpen(false)} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              {/* Planning Status */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.05em' }}>Planning Status</div>
                {(['All', 'New', 'Unplanned', 'Planned', 'Deferred'] as StatusFilter[]).map(s => (
                  <label key={s} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', cursor: 'pointer', fontSize: '13px', color: '#1e293b', fontWeight: 500 }}>
                    <input
                      type="checkbox"
                      checked={statusFilter === s || s === 'All'}
                      onChange={() => onStatusFilter(s)}
                      style={{ accentColor: '#F59E0B', width: '14px', height: '14px' }}
                    />
                    {s}
                  </label>
                ))}
              </div>

              {/* Temperature */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.05em' }}>Temperature</div>
                {(['All', 'Chilled', 'Ambient', 'Frozen'] as const).map(t => (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', cursor: 'pointer', fontSize: '13px', color: '#1e293b', fontWeight: 500 }}>
                    <input
                      type="checkbox"
                      checked={draft.temperature === t}
                      onChange={() => setDraft(d => ({ ...d, temperature: t }))}
                      style={{ accentColor: '#F59E0B', width: '14px', height: '14px' }}
                    />
                    {t}
                  </label>
                ))}
              </div>
            </div>

            {/* Brand */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.05em' }}>Brand</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(['All', 'Fresh', 'Style', 'Tech'] as BrandFilter[]).map(b => (
                  <button
                    key={b}
                    onClick={() => setDraft(d => ({ ...d, brand: b }))}
                    style={{
                      padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.1s',
                      backgroundColor: draft.brand === b ? '#0f172a' : '#f1f5f9',
                      color: draft.brand === b ? '#fff' : '#475569',
                      border: 'none',
                    }}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Special Constraints */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.05em' }}>Special Constraints</div>
              {(['All', 'Reefer Required', 'Van Only', 'Tight Window'] as ConstraintFilter[]).map(c => (
                <label key={c} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', cursor: 'pointer', fontSize: '13px', color: '#1e293b', fontWeight: 500 }}>
                  <input
                    type="checkbox"
                    checked={draft.constraint === c}
                    onChange={() => setDraft(d => ({ ...d, constraint: c }))}
                    style={{ accentColor: '#F59E0B', width: '14px', height: '14px' }}
                  />
                  {c === 'All' ? 'No filter' : c}
                </label>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleReset}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#64748b', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Reset
              </button>
              <button
                onClick={handleApply}
                style={{ flex: 2, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#F59E0B', color: '#0f172a', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
