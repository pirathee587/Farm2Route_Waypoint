import React from 'react';
import type { QueueOrder } from '@/entities/order/orderTypes';

interface SelectedOrdersBarProps {
  selectedOrders: QueueOrder[];
  onClear: () => void;
  onPlan: () => void;
}

export const SelectedOrdersBar: React.FC<SelectedOrdersBarProps> = ({
  selectedOrders,
  onClear,
  onPlan,
}) => {
  if (selectedOrders.length === 0) return null;

  const totalWeight = selectedOrders.reduce((sum, order) => sum + order.weightKg, 0);
  const totalVolume = selectedOrders.reduce((sum, order) => sum + order.volumeM3, 0);
  // Find primary requirement. If any is chilled, we show Reefer Required
  const needsReefer = selectedOrders.some(order => order.temperature === 'Chilled' || order.temperature === 'Frozen');

  return (
      <div className="selected-orders-bar"
      style={{
        position: 'fixed',
        bottom: '24px',
        left: 'calc(50vw + 100px)',
        transform: 'translateX(-50%)',
        backgroundColor: '#0f172a',
        borderRadius: '12px',
        padding: '16px 13px',
        display: 'flex',
        alignItems: 'center',
        gap: '48px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
        zIndex: 50,
        minWidth: '820px',
        width: '960px',
        maxWidth: '1200px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f172a', fontWeight: 700 }}>
          {selectedOrders.length}
        </div>
        <div>
          <div style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>Orders Selected</div>
          <div style={{ color: '#94a3b8', fontSize: '11px' }}>Ready for planning</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <div>
          <div style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>Total Weight</div>
          <div style={{ color: '#fff', fontSize: '15px', fontWeight: 700 }}>{totalWeight} kg</div>
        </div>
        <div>
          <div style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>Total Volume</div>
          <div style={{ color: '#fff', fontSize: '15px', fontWeight: 700 }}>{totalVolume.toFixed(1)} m³</div>
        </div>
        <div>
          <div style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>Requirement</div>
          <div style={{ color: '#F59E0B', fontSize: '13px', fontWeight: 600 }}>{needsReefer ? 'Reefer Required' : 'Standard'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: 'auto' }}>
        <button
          onClick={onClear}
          style={{
            backgroundColor: 'transparent',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.2)',
            padding: '10px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Clear Selection
        </button>
        
        <button
          onClick={onPlan}
          style={{
            backgroundColor: '#F59E0B',
            color: '#0f172a',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          Plan Selected Orders →
        </button>
      </div>
    </div>
  );
};
