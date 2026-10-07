import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import type { QueueOrder } from '@/entities/order/orderTypes';
import { StatusBadge } from '@/shared/components/StatusBadge';

interface OrdersTableProps {
  orders: QueueOrder[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onViewDetails: (id: string) => void;
}

export const OrdersTable: React.FC<OrdersTableProps> = ({
  orders,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onViewDetails,
}) => {
  const allSelected = orders.length > 0 && selectedIds.length === orders.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < orders.length;

  const renderStatus = (status: string) => {
    switch (status) {
      case 'Unplanned':
        return <StatusBadge variant="warning" label={status} />;
      case 'Planned':
        return <StatusBadge variant="success" label={status} />;
      case 'Deferred':
        return <StatusBadge variant="critical" label={status} />;
      default:
        return <StatusBadge variant="info" label={status} />;
    }
  };

  const renderConstraint = (constraint: string) => {
    switch (constraint) {
      case 'Reefer Required':
        return <StatusBadge variant="info" label={constraint} />;
      case 'Tight Window':
      case 'Van Only':
        return <StatusBadge variant="warning" label={constraint} />;
      case 'Reefer Capacity':
        return <StatusBadge variant="critical" label={constraint} />;
      case 'Valid':
        return <StatusBadge variant="success" label={constraint} />;
      default:
        return null;
    }
  };

  const renderTempIcon = (temp: string) => {
    if (temp === 'Chilled') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38BDF8', fontSize: '13px', fontWeight: 500 }}>
          <div style={{ width: '24px', height: '24px', borderRadius: '4px', backgroundColor: '#F0F9FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          Chilled
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px', fontWeight: 500 }}>
        <div style={{ width: '24px', height: '24px', borderRadius: '4px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
             <rect x="3" y="3" width="18" height="18" rx="2" />
          </svg>
        </div>
        Ambient
      </div>
    );
  };

  const renderBrand = (brand: string) => {
    let color = '#3b82f6';
    if (brand === 'Fresh') color = '#10b981';
    if (brand === 'Style') color = '#a855f7';
    
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: color }} />
        {brand}
      </div>
    );
  };

  if (orders.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        No orders match the selected filters.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', overflowX: 'auto', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
      {/* Header section of the table container */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>Today's Orders</h2>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{orders.length} orders</div>
        </div>
        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
          Last updated 09:45
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
            <th style={{ padding: '12px 16px', width: '40px' }}>
              <input 
                type="checkbox" 
                checked={allSelected} 
                ref={input => { if (input) input.indeterminate = someSelected; }}
                onChange={onToggleSelectAll}
                style={{ cursor: 'pointer' }}
              />
            </th>
            <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Order</th>
            <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Outlet / Route</th>
            <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Brand</th>
            <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Window</th>
            <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Temp.</th>
            <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Weight</th>
            <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Volume</th>
            <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
            <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Constraint</th>
            <th style={{ padding: '12px 16px', width: '40px' }}></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const isSelected = selectedIds.includes(order.id);
            // Selected row styling according to screenshot 3
            const rowStyle = isSelected 
              ? { backgroundColor: '#fef3c7', borderLeft: '3px solid #F59E0B' }
              : { borderBottom: '1px solid #f1f5f9' };

            return (
              <tr key={order.id} style={rowStyle}>
                <td style={{ padding: '16px', width: '40px' }}>
                  <input 
                    type="checkbox" 
                    checked={isSelected}
                    onChange={() => onToggleSelect(order.id)}
                    style={{ cursor: 'pointer' }}
                  />
                </td>
                <td style={{ padding: '16px', verticalAlign: 'top' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{order.id}</div>
                  {order.productSummary && <div style={{ fontSize:'12px',color:'#475569',marginTop:'4px',fontWeight:600 }}>{order.productSummary}{order.quantity ? ` · Qty ${order.quantity}` : ''}</div>}
                  {order.receivedAt && (
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {order.receivedAt}
                      {order.isNew && (
                        <span style={{ backgroundColor: '#FEF3C7', color: '#D97706', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>NEW</span>
                      )}
                    </div>
                  )}
                  <button onClick={() => onViewDetails(order.id)} style={{ color: '#3b82f6', fontSize: '11px', fontWeight: 600, marginTop: '4px', padding: 0 }}>View details</button>
                </td>
                <td style={{ padding: '16px', verticalAlign: 'top' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{order.outletName}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{order.routeArea}</div>
                </td>
                <td style={{ padding: '16px', verticalAlign: 'top' }}>
                  {renderBrand(order.brand)}
                </td>
                <td style={{ padding: '16px', verticalAlign: 'top' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{order.deliveryWindow}</div>
                  {order.timeSensitive && (
                    <div style={{ fontSize: '11px', color: '#F59E0B', marginTop: '4px', fontWeight: 500 }}>Time sensitive</div>
                  )}
                </td>
                <td style={{ padding: '16px', verticalAlign: 'top' }}>
                  {renderTempIcon(order.temperature)}
                </td>
                <td style={{ padding: '16px', verticalAlign: 'top', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                  {order.weightKg} kg
                </td>
                <td style={{ padding: '16px', verticalAlign: 'top', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                  {order.volumeM3} m³
                </td>
                <td style={{ padding: '16px', verticalAlign: 'top' }}>
                  {renderStatus(order.status)}
                </td>
                <td style={{ padding: '16px', verticalAlign: 'top' }}>
                  {renderConstraint(order.constraint)}
                </td>
                <td style={{ padding: '16px', verticalAlign: 'top' }}>
                  <button style={{ color: '#94a3b8', cursor: 'pointer' }}>
                    <MoreHorizontal size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {/* Pagination Footer */}
      <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
          Showing 1-{orders.length} of {orders.length} orders
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', fontWeight: 500, color: '#64748b' }}>
          <span style={{ cursor: 'pointer' }}>« Prev</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '24px', height: '24px', borderRadius: '4px', backgroundColor: '#0f172a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
            <span style={{ cursor: 'pointer' }}>2</span>
            <span style={{ cursor: 'pointer' }}>3</span>
          </div>
          <span style={{ cursor: 'pointer' }}>Next »</span>
        </div>
      </div>
    </div>
  );
};
