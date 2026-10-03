import React, { useState, useEffect } from 'react';
import { DispatcherLayout } from '@/shared/layouts/DispatcherLayout';
import type { DispatcherPage } from '@/shared/layouts/DispatcherSidebar';
import { fetchOrderDetails } from '@/features/order-management/ordersApi';
import type { OrderDetails } from '@/entities/order/orderTypes';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { ChevronLeft } from 'lucide-react';

interface OrderDetailsPageProps {
  orderId: string;
  onNavigateGlobal?: (page: string) => void;
  onBack: () => void;
  onPlanOrder: (orders: OrderDetails[]) => void;
}

export const OrderDetailsPage: React.FC<OrderDetailsPageProps> = ({ orderId, onNavigateGlobal, onBack, onPlanOrder }) => {
  const [data, setData] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState<DispatcherPage>('orders');

  useEffect(() => {
    let active = true;
    fetchOrderDetails(orderId).then(res => {
      if (active) {
        setData(res as OrderDetails);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [orderId]);

  const handleNavigate = (page: DispatcherPage) => {
    setActivePage(page);
    if (onNavigateGlobal) onNavigateGlobal(page);
  };

  if (loading) {
    return (
      <DispatcherLayout activePage={activePage} onNavigate={handleNavigate}>
        <div style={{ padding: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          Loading order details...
        </div>
      </DispatcherLayout>
    );
  }

  if (!data) {
    return (
      <DispatcherLayout activePage="orders" onNavigate={handleNavigate}>
        <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <strong>Order not found.</strong>
          <button onClick={onBack} style={{ padding: '9px 18px', borderRadius: '8px', backgroundColor: '#0f172a', color: '#fff' }}>Back to Orders Queue</button>
        </div>
      </DispatcherLayout>
    );
  }

  return (
    <DispatcherLayout activePage={activePage} onNavigate={handleNavigate}>
      <div style={{ padding: '28px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        
        {/* Back Navigation */}
        <button 
          onClick={onBack}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '6px', 
            color: '#3b82f6', fontSize: '13px', fontWeight: 600, 
            background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '24px' 
          }}
        >
          <ChevronLeft size={16} />
          Back to Orders Queue
        </button>

        {/* Page Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              Order Details
            </h1>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0' }}>
              Review order contents and delivery requirements before planning.
            </p>
          </div>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Monday, 25 September 2026</span>
        </div>

        {/* Top Order Card */}
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e2e8f0' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>{data.id}</span>
              {data.status === 'Unplanned' && <span style={{ padding: '4px 16px', borderRadius: '20px', backgroundColor: '#fff', border: '1px solid #FDE68A', color: '#D97706', fontSize: '11px', fontWeight: 700 }}>UNPLANNED</span>}
              {data.isNew && <span style={{ padding: '4px 16px', borderRadius: '20px', backgroundColor: '#FEF3C7', color: '#D97706', fontSize: '11px', fontWeight: 700 }}>NEW</span>}
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>{data.outletName}</div>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>{data.depot} Depot — {data.district}</div>
            {data.receivedAt && <div style={{ fontSize: '12px', color: '#94a3b8' }}>{data.receivedAt}</div>}
          </div>

          <div style={{ display: 'flex', gap: '48px' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Delivery Window</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>{data.deliveryWindow}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Temperature</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 600, color: '#38BDF8' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: '#F0F9FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                {data.temperature}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Requirement</div>
              <StatusBadge variant="info" label={data.constraint} />
            </div>
          </div>
        </div>

        {/* Main Grid Content */}
        <div className="order-details-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
          
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Order Items */}
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0' }}>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>Order Items</h2>
                <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>3 item groups</div>
              </div>
              
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Item</th>
                    <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Qty</th>
                    <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Weight</th>
                    <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '20px 24px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>{item.name}</div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: item.temperature === 'Chilled' ? '#38BDF8' : '#94a3b8' }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            {item.temperature === 'Chilled' ? (
                              <>
                                <line x1="2" y1="12" x2="22" y2="12" />
                                <line x1="12" y1="2" x2="12" y2="22" />
                                <line x1="20" y1="16" x2="17" y2="12" />
                                <line x1="17" y1="12" x2="20" y2="8" />
                                <line x1="4" y1="8" x2="7" y2="12" />
                                <line x1="7" y1="12" x2="4" y2="16" />
                              </>
                            ) : (
                               <rect x="3" y="3" width="18" height="18" rx="2" />
                            )}
                          </svg>
                          {item.temperature}
                        </div>
                      </td>
                      <td style={{ padding: '20px 24px', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{item.qty}</td>
                      <td style={{ padding: '20px 24px', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{item.weightKg} kg</td>
                      <td style={{ padding: '20px 24px', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{item.volumeM3} m³</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ padding: '20px 24px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Order Total</td>
                    <td style={{ padding: '20px 24px' }}></td>
                    <td style={{ padding: '20px 24px', fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>{data.weightKg} kg</td>
                    <td style={{ padding: '20px 24px', fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>{data.volumeM3} m³</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Delivery Information */}
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
              <h2 style={{ margin: '0 0 24px', fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>Delivery Information</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Outlet</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{data.outletName}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>District</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{data.district}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Depot</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{data.depot}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Delivery Window</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{data.deliveryWindow}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Access</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{data.accessRestriction}</div>
                </div>
              </div>
            </div>

            <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'left', marginTop: '8px' }}>
              Order loaded from planning audit • Last updated 09:45
            </div>

          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Planning Requirements */}
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
              <h2 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>Planning Requirements</h2>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '24px' }}>Requirements Dispatcher must certify.</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>Temperature</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{data.temperature}</span>
                    <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 500, width: '100px', textAlign: 'left' }}>Reefer required</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>Weight</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{data.weightKg} kg</span>
                    <span style={{ fontSize: '12px', color: '#94a3b8', width: '100px', textAlign: 'left' }}>Vehicle capacity</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>Volume</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{data.volumeM3} m³</span>
                    <span style={{ fontSize: '12px', color: '#94a3b8', width: '100px', textAlign: 'left' }}>Vehicle capacity</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>Delivery Window</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{data.deliveryWindow}</span>
                    <span style={{ fontSize: '12px', color: '#94a3b8', width: '100px', textAlign: 'left' }}>Time sensitive</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>Depot</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{data.depot}</span>
                    <span style={{ fontSize: '12px', color: '#94a3b8', width: '100px', textAlign: 'left' }}>Home depot</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>Outlet Access</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>Standard</span>
                    <span style={{ fontSize: '12px', color: '#94a3b8', width: '100px', textAlign: 'left' }}>Truck accessible</span>
                  </div>
                </div>
              </div>

              {/* Alert */}
              <div style={{ marginTop: '24px', backgroundColor: '#FEF3C7', borderRadius: '8px', padding: '16px', display: 'flex', gap: '12px' }}>
                <div style={{ color: '#D97706' }}>
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                     <circle cx="12" cy="12" r="10"></circle>
                     <line x1="12" y1="8" x2="12" y2="12"></line>
                     <line x1="12" y1="16" x2="12.01" y2="16"></line>
                   </svg>
                </div>
                <div style={{ fontSize: '13px', color: '#92400E', fontWeight: 500 }}>
                  <strong style={{ display: 'block', marginBottom: '2px' }}>Requires refrigerated vehicle and early delivery.</strong>
                  Validate against vehicle and route constraints.
                </div>
              </div>
            </div>

            {/* Planning Action */}
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
              <h2 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>Planning Action</h2>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px', lineHeight: 1.5 }}>
                This order is currently unplanned.<br/>
                Add it to a feasible trip before confirming the delivery plan.
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <button 
                  onClick={onBack}
                  style={{ 
                    flex: 1, padding: '10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', 
                    backgroundColor: '#fff', color: '#1e293b', fontSize: '13px', fontWeight: 600, cursor: 'pointer' 
                  }}
                >
                  Back to Queue
                </button>
                <button 
                  onClick={() => onPlanOrder([data])}
                  style={{ 
                    flex: 1.5, padding: '10px 16px', borderRadius: '8px', border: 'none', 
                    backgroundColor: '#F59E0B', color: '#0f172a', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}
                >
                  Plan This Order →
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </DispatcherLayout>
  );
};
