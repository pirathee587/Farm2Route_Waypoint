import React, { useState, useEffect } from 'react';
import { DispatcherLayout } from '@/shared/layouts/DispatcherLayout';
import type { DispatcherPage } from '@/shared/layouts/DispatcherSidebar';
import { SummaryCard } from '@/pages/dashboard/SummaryCard';
import { OrdersFilterBar } from './OrdersFilterBar';
import type { StatusFilter, ActiveFilters } from './OrdersFilterBar';
import { OrdersTable } from './OrdersTable';
import { SelectedOrdersBar } from './SelectedOrdersBar';
import { fetchOrdersQueueData } from '@/features/order-management/ordersApi';
import type { OrdersQueueData, QueueOrder } from '@/entities/order/orderTypes';
import { Bell } from 'lucide-react';

const PageHeader = () => (
  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
        Orders Queue
      </h1>
      <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0' }}>
        Review, prioritise and prepare today's delivery orders for planning.
      </p>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>{new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</span>
      <button style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}>
        <Bell size={16} color="#64748b" />
        <span style={{ position: 'absolute', top: '8px', right: '8px', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
      </button>
    </div>
  </div>
);

interface OrdersQueuePageProps {
  onNavigateGlobal?: (page: string) => void;
  onViewOrderDetails?: (orderId: string) => void;
  onPlanOrders?: (orders: QueueOrder[]) => void;
}

export const OrdersQueuePage: React.FC<OrdersQueuePageProps> = ({ onNavigateGlobal, onViewOrderDetails, onPlanOrders }) => {
  const [data, setData] = useState<OrdersQueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    brand: 'All',
    temperature: 'All',
    constraint: 'All',
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activePage, setActivePage] = useState<DispatcherPage>('orders');

  useEffect(() => {
    let active = true;
    fetchOrdersQueueData().then(res => {
      if (active) setData(res);
    }).catch(error => {
      if (active) setLoadError(error instanceof Error ? error.message : 'Unable to load orders.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const handleNavigate = (page: DispatcherPage) => {
    setActivePage(page);
    if (onNavigateGlobal) onNavigateGlobal(page);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (!data) return;
    const visibleIds = filteredOrders.map(o => o.id);
    const allVisibleSelected = visibleIds.every(id => selectedIds.includes(id));
    if (allVisibleSelected) {
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...visibleIds])]);
    }
  };

  const handleClearSelection = () => setSelectedIds([]);

  const handlePlanSelected = () => {
    if (onPlanOrders && selectedOrderObjects.length > 0) {
      onPlanOrders(selectedOrderObjects);
    }
  };

  const handleViewDetails = (id: string) => {
    if (onViewOrderDetails) onViewOrderDetails(id);
  };

  if (loading || !data) {
    return (
      <DispatcherLayout activePage={activePage} onNavigate={handleNavigate}>
        <div style={{ padding: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', fontSize: '14px' }}>
          {loading ? 'Loading orders...' : loadError || 'No orders are available.'}
        </div>
      </DispatcherLayout>
    );
  }

  // ── Apply all filters ──────────────────────────────────────
  const filteredOrders = data.orders.filter(order => {
    // Search: order ID, outlet name, or route area (district)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matches =
        order.id.toLowerCase().includes(term) ||
        order.outletName.toLowerCase().includes(term) ||
        order.routeArea.toLowerCase().includes(term);
      if (!matches) return false;
    }

    // Status filter
    if (statusFilter !== 'All') {
      if (statusFilter === 'New') {
        if (!order.isNew) return false;
      } else {
        if (order.status !== statusFilter) return false;
      }
    }

    // Brand filter
    if (activeFilters.brand !== 'All') {
      if (order.brand !== activeFilters.brand) return false;
    }

    // Temperature filter
    if (activeFilters.temperature !== 'All') {
      if (order.temperature !== activeFilters.temperature) return false;
    }

    // Constraint filter
    if (activeFilters.constraint !== 'All') {
      if (order.constraint !== activeFilters.constraint) return false;
    }

    return true;
  });

  const selectedOrderObjects = data.orders.filter(o => selectedIds.includes(o.id));

  return (
    <DispatcherLayout activePage={activePage} onNavigate={handleNavigate}>
      <div style={{ padding: '28px', maxWidth: '1400px', margin: '0 auto', width: '100%', position: 'relative' }}>
        <PageHeader />

        {/* Summary Cards */}
        <div className="orders-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '24px' }}>
          <SummaryCard label="Total Orders" value={data.summary.totalOrders} subLabel="Today" dotColor="#3b82f6" />
          <SummaryCard label="Fresh" value={data.summary.fresh} subLabel="Chilled priority" dotColor="#10b981" />
          <SummaryCard label="Style" value={data.summary.style} subLabel="Ambient" dotColor="#a855f7" />
          <SummaryCard label="Tech" value={data.summary.tech} subLabel="Ambient" dotColor="#3b82f6" />
          <SummaryCard label="Unplanned" value={data.summary.unplanned} subLabel="Needs planning" dotColor="#F59E0B" />
          <SummaryCard label="Deferred" value={data.summary.deferred} subLabel="Need follow-up" dotColor="#ef4444" />
        </div>

        {/* Filter Bar — fully wired */}
        <OrdersFilterBar
          searchTerm={searchTerm}
          onSearch={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilter={setStatusFilter}
          activeFilters={activeFilters}
          onApplyFilters={setActiveFilters}
          onPlanOrders={handlePlanSelected}
          summary={{
            totalOrders: data.summary.totalOrders,
            fresh: data.summary.fresh,
            style: data.summary.style,
            tech: data.summary.tech,
          }}
        />

        {/* Orders Table */}
        <OrdersTable
          orders={filteredOrders}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
          onViewDetails={handleViewDetails}
        />

        {/* Empty state */}
        {filteredOrders.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📦</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>No orders match the selected filters</div>
            <div style={{ fontSize: '13px', marginBottom: '20px' }}>Try adjusting your search or filter criteria.</div>
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('All');
                setActiveFilters({ brand: 'All', temperature: 'All', constraint: 'All' });
              }}
              style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#1e293b', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Sticky Selection Bar */}
        <SelectedOrdersBar
          selectedOrders={selectedOrderObjects}
          onClear={handleClearSelection}
          onPlan={handlePlanSelected}
        />
      </div>
    </DispatcherLayout>
  );
};
