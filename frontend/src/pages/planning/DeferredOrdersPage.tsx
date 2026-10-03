import React, { useState, useEffect, useCallback } from 'react';
import { DispatcherSidebar } from '@/shared/layouts/DispatcherSidebar';
import { DeferredSummaryCards } from './deferred/DeferredSummaryCards';
import { DeferredQueueTable } from './deferred/DeferredQueueTable';
import { DeferredOrderDetailPanel } from './deferred/DeferredOrderDetailPanel';
import { ChangeNextDateModal } from './deferred/ChangeNextDateModal';
import { ReturnToPlanningModal } from './deferred/ReturnToPlanningModal';
import {
  fetchDeferredOrders,
  updateNextPlannedDate,
  returnOrderToPlanning,
} from '@/features/planning-allocation/routePlanningApi';
import type {
  DeferredOrder,
  DeferredOrdersSummary,
  DeferralReasonCategory,
} from '@/entities/planning/planningTypes';
import { SlidersHorizontal } from 'lucide-react';

interface Props {
  onNavigateGlobal?: (page: string) => void;
}

type ActiveFilter = 'All' | DeferralReasonCategory;

export const DeferredOrdersPage: React.FC<Props> = ({ onNavigateGlobal }) => {
  const [orders, setOrders] = useState<DeferredOrder[]>([]);
  const [summary, setSummary] = useState<DeferredOrdersSummary>({
    totalDeferred: 0, capacity: 0, window: 0, vehicle: 0, other: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('All');

  // Filter bar state
  const [nextPlannedFilter, setNextPlannedFilter] = useState('all');
  const [depotFilter, setDepotFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [changeDateOpen, setChangeDateOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [changeDateSubmitting, setChangeDateSubmitting] = useState(false);
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [changeDateError, setChangeDateError] = useState<string | null>(null);
  const [returnError, setReturnError] = useState<string | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetchDeferredOrders();
      setOrders(res.orders);
      setSummary(res.summary);
      if (!selectedId && res.orders.length > 0) {
        setSelectedId(res.orders[0].id);
      }
    } catch {
      setLoadError('Unable to load deferred orders.');
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadData(); }, [loadData]);

  const selectedOrder = orders.find(o => o.id === selectedId) ?? null;

  // Filter counts
  const totalCounts: Record<string, number> = {
    All: orders.length,
    Capacity: orders.filter(o => o.deferralReasonCategory === 'Capacity').length,
    Window:   orders.filter(o => o.deferralReasonCategory === 'Window').length,
    Vehicle:  orders.filter(o => o.deferralReasonCategory === 'Vehicle').length,
    Other:    orders.filter(o => o.deferralReasonCategory === 'Other').length,
  };

  // Apply search filter
  const filteredOrders = orders.filter(o => {
    if (activeFilter !== 'All' && o.deferralReasonCategory !== activeFilter) return false;
    if (depotFilter !== 'all' && !o.depot.toLowerCase().includes(depotFilter.toLowerCase())) return false;
    if (nextPlannedFilter === 'tomorrow') {
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
      if (o.nextPlannedDate !== tomorrow.toISOString().slice(0, 10)) return false;
    }
    if (nextPlannedFilter === 'this-week') {
      const date = new Date(o.nextPlannedDate);
      const now = new Date(); const weekEnd = new Date(); weekEnd.setDate(now.getDate() + 7);
      if (date < now || date > weekEnd) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        o.id.toLowerCase().includes(q) ||
        o.outletName.toLowerCase().includes(q) ||
        o.brand.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // --- Change Next Date ---
  const handleUpdateDate = async (newDate: string, reasonForChange: string) => {
    if (!selectedOrder) return;
    setChangeDateSubmitting(true);
    setChangeDateError(null);
    try {
      const res = await updateNextPlannedDate({
        orderId: selectedOrder.id,
        newDate,
        reasonForChange,
      });
      if (res.success) {
        setOrders(prev => prev.map(o => o.id === res.updatedOrder.id ? res.updatedOrder : o));
        setChangeDateOpen(false);
      }
    } catch (err: unknown) {
      setChangeDateError((err as Error).message || 'Failed to update date. Please try again.');
    } finally {
      setChangeDateSubmitting(false);
    }
  };

  // --- Return to Planning ---
  const handleReturnToPlanning = async () => {
    if (!selectedOrder) return;
    setReturnSubmitting(true);
    setReturnError(null);
    try {
      const res = await returnOrderToPlanning({ orderId: selectedOrder.id });
      if (res.success) {
        setReturnModalOpen(false);
        // Navigate to Route Planning — the order is now UNPLANNED
        if (onNavigateGlobal) onNavigateGlobal('planning');
      }
    } catch (err: unknown) {
      setReturnError((err as Error).message || 'Failed to return order. Please try again.');
    } finally {
      setReturnSubmitting(false);
    }
  };

  const TABS: { key: ActiveFilter; label: string }[] = [
    { key: 'All',      label: `All ${totalCounts['All']}` },
    { key: 'Capacity', label: `Capacity ${totalCounts['Capacity']}` },
    { key: 'Window',   label: `Window ${totalCounts['Window']}` },
    { key: 'Vehicle',  label: `Vehicle ${totalCounts['Vehicle']}` },
    { key: 'Other',    label: `Other ${totalCounts['Other']}` },
  ];

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100%',
        backgroundColor: '#f8fafc',
        overflow: 'hidden',
      }}
    >
      {/* Sidebar */}
      <DispatcherSidebar
        activePage="deferred-orders"
        onNavigate={(page) => onNavigateGlobal?.(page)}
      />

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          minWidth: 0,
          height: '100vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          paddingBottom: '80px', // space for bottom action bar
        }}
      >
        {/* Page Header */}
        <div
          style={{
            padding: '24px 32px 0',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#0f172a',
                margin: '0 0 4px',
                letterSpacing: '-0.02em',
              }}
            >
              Deferred Orders
            </h1>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              Review deferred deliveries, recorded reasons and next planned dates.
            </p>
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', paddingTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
            Monday, 25 September 2026
          </div>
        </div>

        <div style={{ padding: '0 32px', flex: 1 }}>
          {/* Summary Cards */}
          {!loading && <DeferredSummaryCards summary={summary} />}

          {/* Filter bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
              flexWrap: 'wrap',
            }}
          >
            {/* Reason filter tabs */}
            <div
              style={{
                display: 'flex',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                overflow: 'hidden',
              }}
            >
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    borderRight: '1px solid #e2e8f0',
                    backgroundColor: activeFilter === tab.key ? '#F59E0B' : 'transparent',
                    color: activeFilter === tab.key ? '#0f172a' : '#64748b',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Next Planned Date filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>
                NEXT PLANNED DATE
              </span>
              <select
                value={nextPlannedFilter}
                onChange={e => setNextPlannedFilter(e.target.value)}
                style={{
                  fontSize: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '5px 8px',
                  color: '#374151',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All dates</option>
                <option value="today">Today</option>
                <option value="tomorrow">Tomorrow</option>
                <option value="this-week">This week</option>
              </select>
            </div>

            {/* Depot filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>DEPOT</span>
              <select
                value={depotFilter}
                onChange={e => setDepotFilter(e.target.value)}
                style={{
                  fontSize: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '5px 8px',
                  color: '#374151',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All depots</option>
                <option value="peliyagoda">Peliyagoda Depot</option>
                <option value="kandy">Kandy Depot</option>
              </select>
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder="Search…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                fontSize: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '5px 10px',
                color: '#374151',
                outline: 'none',
                width: '140px',
              }}
            />

            {/* Filter button */}
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#374151',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              <SlidersHorizontal size={13} />
              Filter
            </button>
          </div>

          {/* Loading */}
          {loadError ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
              <div style={{ marginBottom: '12px' }}>{loadError}</div>
              <button onClick={loadData} style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: '#0f172a', color: '#fff' }}>Retry</button>
            </div>
          ) : loading ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '300px',
                color: '#64748b',
                fontSize: '13px',
              }}
            >
              Loading deferred orders…
            </div>
          ) : (
            /* Two-column layout: queue table + detail panel */
            <div className="deferred-main-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: '1.8fr 1.1fr',
                gap: '20px',
                alignItems: 'start',
              }}
            >
              <DeferredQueueTable
                orders={filteredOrders}
                selectedId={selectedId}
                activeFilter={activeFilter}
                onSelectOrder={o => setSelectedId(o.id)}
                onFilterChange={setActiveFilter}
                totalCounts={totalCounts}
              />
              <DeferredOrderDetailPanel order={selectedOrder} />
            </div>
          )}
        </div>
      </main>

      {/* Bottom Selected-Order Action Bar — centered floating pill */}
      {selectedOrder && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'fit-content',
            maxWidth: 'calc(100vw - 240px)',
            backgroundColor: '#0f172a',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            zIndex: 200,
            whiteSpace: 'nowrap',
          }}
        >
          {/* Order info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
              {selectedOrder.id}
            </span>
            <div style={{ display: 'flex', gap: '12px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                Next planned: <strong style={{ color: '#e2e8f0' }}>{selectedOrder.nextPlannedDateLabel}</strong>
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                Reason: <strong style={{ color: '#e2e8f0' }}>{selectedOrder.deferralReasonFull}</strong>
              </span>
            </div>
          </div>

          <div style={{ width: '1px', height: '32px', backgroundColor: 'rgba(255,255,255,0.1)' }} />

          {/* Actions */}
          <button
            onClick={() => { setChangeDateError(null); setChangeDateOpen(true); }}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#f8fafc',
              backgroundColor: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Change Next Date
          </button>

          <button
            onClick={() => { setReturnError(null); setReturnModalOpen(true); }}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#0f172a',
              backgroundColor: '#F59E0B',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Return to Route Planning →
          </button>
        </div>
      )}

      {/* Change Next Date Modal */}
      {changeDateOpen && selectedOrder && (
        <ChangeNextDateModal
          order={selectedOrder}
          onCancel={() => setChangeDateOpen(false)}
          onUpdateDate={handleUpdateDate}
          submitting={changeDateSubmitting}
          error={changeDateError}
        />
      )}

      {/* Return to Planning Confirmation Modal */}
      {returnModalOpen && selectedOrder && (
        <ReturnToPlanningModal
          order={selectedOrder}
          onCancel={() => setReturnModalOpen(false)}
          onConfirm={handleReturnToPlanning}
          submitting={returnSubmitting}
          error={returnError}
        />
      )}
    </div>
  );
};
