import React, { useState } from 'react';
import type { QueueOrder } from '@/entities/order/orderTypes';
import { Search, SlidersHorizontal, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { orderReference } from '@/shared/utils/displayReferences';

interface UnplannedOrdersColumnProps {
  orders: QueueOrder[];
  onAddOrder: (order: QueueOrder) => void;
}

export const UnplannedOrdersColumn: React.FC<UnplannedOrdersColumnProps> = ({ orders, onAddOrder }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [activeTab, setActiveTab] = useState<'All' | 'Unplanned' | 'Deferred'>('All');
  const [filterType, setFilterType] = useState<'All' | 'Chilled' | 'Ambient' | 'Tight Window'>('All');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [sortByPriority, setSortByPriority] = useState(false);

  // Filter & search orders
  const filteredOrders = orders.filter(order => {
    // Status tab filter
    if (activeTab === 'Unplanned' && order.status !== 'Unplanned') return false;
    if (activeTab === 'Deferred' && order.status !== 'Deferred') return false;

    const matchesSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.outletName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.routeArea.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filterType === 'Chilled') return order.temperature === 'Chilled';
    if (filterType === 'Ambient') return order.temperature === 'Ambient';
    if (filterType === 'Tight Window') return order.timeSensitive || order.constraint === 'Tight Window';

    return true;
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortByPriority) {
      if (a.timeSensitive && !b.timeSensitive) return -1;
      if (!a.timeSensitive && b.timeSensitive) return 1;
    }
    return 0;
  });

  // Display top 3 when collapsed, or all when expanded
  const displayedOrders = showAll ? sortedOrders : sortedOrders.slice(0, 3);

  const getBrandBadgeColor = (brand: string) => {
    switch (brand?.toLowerCase()) {
      case 'fresh': return { bg: '#DCFCE7', text: '#16A34A' };
      case 'style': return { bg: '#F3E8FF', text: '#7E22CE' };
      case 'tech': return { bg: '#EFF6FF', text: '#2563EB' };
      default: return { bg: '#F1F5F9', text: '#475569' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '620px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: 0 }}>Unplanned Orders</h2>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#D97706', backgroundColor: '#FEF3C7', padding: '3px 10px', borderRadius: '12px' }}>
            {orders.length} orders
          </span>
        </div>

        {/* Quick Tabs: All / Unplanned / Deferred */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', padding: '3px', backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
          {(['All', 'Unplanned', 'Deferred'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '5px 8px',
                fontSize: '11px',
                fontWeight: activeTab === tab ? 700 : 500,
                color: activeTab === tab ? '#0f172a' : '#64748b',
                backgroundColor: activeTab === tab ? '#fff' : 'transparent',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: activeTab === tab ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
        
        {/* Search input */}
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search orders..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
          <button 
            onClick={() => setFilterMenuOpen(!filterMenuOpen)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: filterType !== 'All' ? '#F59E0B' : '#475569', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <SlidersHorizontal size={14} /> Filter {filterType !== 'All' ? `(${filterType})` : ''}
          </button>

          {filterMenuOpen && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 20, width: '140px' }}>
              {(['All', 'Chilled', 'Ambient', 'Tight Window'] as const).map(ft => (
                <div 
                  key={ft}
                  onClick={() => {
                    setFilterType(ft);
                    setFilterMenuOpen(false);
                  }}
                  style={{ padding: '8px 12px', fontSize: '12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontWeight: filterType === ft ? 700 : 500, color: filterType === ft ? '#F59E0B' : '#1e293b' }}
                >
                  {ft}
                </div>
              ))}
            </div>
          )}

          <button 
            onClick={() => setSortByPriority(!sortByPriority)}
            style={{ fontSize: '12px', fontWeight: 600, color: sortByPriority ? '#F59E0B' : '#475569', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {sortByPriority ? 'Priority: High First' : 'Priority ▾'}
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div style={{ padding: '16px', backgroundColor: '#f8fafc', flex: 1, overflowY: 'auto' }}>
        {sortedOrders.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
            No orders match your criteria.
          </div>
        ) : (
          displayedOrders.map(order => {
            const brandColors = getBrandBadgeColor(order.brand);
            const isDeferred = order.status === 'Deferred';

            return (
              <div 
                key={order.id} 
                style={{ 
                  backgroundColor: '#fff', 
                  borderRadius: '12px', 
                  border: isDeferred ? '1px solid #FECACA' : '1px solid #e2e8f0', 
                  padding: '16px', 
                  marginBottom: '14px', 
                  position: 'relative', 
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}
              >
                {/* Yellow / Red left border indicator */}
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', backgroundColor: isDeferred ? '#EF4444' : '#F59E0B' }} />
                
                {/* Order ID & Brand / Status Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', letterSpacing: '-0.01em' }}>{order.reference || orderReference(order.id)}</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {isDeferred && (
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#DC2626', backgroundColor: '#FEE2E2', padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase' }}>
                        DEFERRED
                      </span>
                    )}
                    <span style={{ fontSize: '10px', fontWeight: 700, color: brandColors.text, backgroundColor: brandColors.bg, padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase' }}>
                      {order.brand}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize:'12px',fontWeight:600,color:'#475569',marginBottom:'8px' }}>{order.productSummary || 'Order items'}{order.quantity ? ` · Qty ${order.quantity}` : ''}</div>

                {/* Outlet name & Route */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '2px' }}>{order.outletName}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Peliyagoda · {order.routeArea}</div>
                </div>

                {/* Badges: Temperature, Constraint */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#0284C7', backgroundColor: '#E0F2FE', padding: '3px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ❄ {order.temperature}
                  </span>
                  {order.constraint && order.constraint !== 'Valid' && (
                    <span style={{ 
                      fontSize: '10px', 
                      fontWeight: 700, 
                      color: order.constraint === 'Tight Window' ? '#D97706' : order.constraint === 'Van Only' ? '#2563EB' : '#475569', 
                      backgroundColor: order.constraint === 'Tight Window' ? '#FEF3C7' : order.constraint === 'Van Only' ? '#EFF6FF' : '#F1F5F9', 
                      padding: '3px 8px', 
                      borderRadius: '4px', 
                      textTransform: 'uppercase' 
                    }}>
                      {order.constraint}
                    </span>
                  )}
                </div>

                {/* Weight, Volume, Delivery Window & + Add to trip */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #f8fafc', paddingTop: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>{order.weightKg} kg</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>{order.volumeM3} m³</span>
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: order.timeSensitive ? '#D97706' : '#64748b', marginBottom: '6px' }}>
                      {order.deliveryWindow}
                    </div>
                    <button 
                      onClick={() => onAddOrder(order)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '12px', fontWeight: 700, color: '#D97706', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      + Add to trip <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {/* Toggle View all / Show fewer */}
        {sortedOrders.length > 3 && (
          <div style={{ textAlign: 'center', marginTop: '8px', marginBottom: '8px' }}>
            <button 
              onClick={() => setShowAll(!showAll)}
              style={{ fontSize: '13px', fontWeight: 600, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              {showAll ? (
                <>Show fewer orders <ChevronUp size={14} /></>
              ) : (
                <>View all {sortedOrders.length} orders <ChevronDown size={14} /></>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
