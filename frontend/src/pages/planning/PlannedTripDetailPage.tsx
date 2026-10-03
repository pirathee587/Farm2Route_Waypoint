import React, { useState, useEffect } from 'react';
import { fetchPlannedTrip } from '@/features/planning-allocation/routePlanningApi';
import type { DraftTrip } from '@/entities/planning/planningTypes';
import { ChevronLeft, Check } from 'lucide-react';
import { DispatcherSidebar } from '@/shared/layouts/DispatcherSidebar';

interface PlannedTripDetailPageProps {
  tripId: string;
  onNavigateGlobal?: (page: string) => void;
}

export const PlannedTripDetailPage: React.FC<PlannedTripDetailPageProps> = ({ tripId, onNavigateGlobal }) => {
  const [trip, setTrip] = useState<DraftTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchPlannedTrip(tripId).then(data => {
      if (mounted) setTrip(data);
    }).catch(() => { if (mounted) setNotFound(true); }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [tripId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100%', backgroundColor: '#f1f5f9', overflow: 'hidden' }}>
        <DispatcherSidebar activePage="route-planning" onNavigate={onNavigateGlobal || (() => {})} />
        <main style={{ flex: 1, minWidth: 0, padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Loading planned trip...
        </main>
      </div>
    );
  }

  if (notFound || !trip) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100%', backgroundColor: '#f1f5f9' }}>
        <DispatcherSidebar activePage="route-planning" onNavigate={onNavigateGlobal || (() => {})} />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', justifyContent: 'center' }}>
          <strong>Planned trip not found.</strong>
          <button onClick={() => onNavigateGlobal?.('planning')} style={{ padding: '9px 18px', borderRadius: '8px', backgroundColor: '#0f172a', color: '#fff' }}>Back to Route Planning</button>
        </main>
      </div>
    );
  }

  const { vehicle, validation } = trip;

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', backgroundColor: '#f1f5f9', overflow: 'hidden' }}>
      <DispatcherSidebar activePage="route-planning" onNavigate={onNavigateGlobal || (() => {})} />
      
      <main className="dispatcher-detail-content" style={{ flex: 1, minWidth: 0, padding: '24px 32px', height: '100vh', overflowY: 'auto' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <button 
            onClick={() => onNavigateGlobal?.('planning')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '16px' }}
          >
            <ChevronLeft size={16} /> Back to Route Planning
          </button>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>Planned Trip Detail</h1>
              <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Review the confirmed trip, assigned resources and validated constraints.</p>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#16A34A', backgroundColor: '#DCFCE7', padding: '6px 16px', borderRadius: '16px', textTransform: 'uppercase' }}>
              {trip.status}
            </span>
          </div>
        </div>

        {/* Top Summary Card */}
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', margin: '0 0 12px' }}>{trip.id}</h2>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>
              {trip.depot} <span style={{ color: '#F59E0B', margin: '0 4px' }}>→</span> Colombo <span style={{ color: '#F59E0B', margin: '0 4px' }}>→</span> Nugegoda
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>25 Sep 2026</div>
          </div>
          
          <div style={{ display: 'flex', gap: '64px' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Vehicle</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>{vehicle?.id}</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Refrigerated Truck · Trip {vehicle ? vehicle.tripsToday + 1 : 1} / 2</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Driver</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>{vehicle?.driverName}</div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#3b82f6', backgroundColor: '#EFF6FF', padding: '4px 12px', borderRadius: '12px' }}>ASSIGNED</span>
            </div>
          </div>
        </div>

        {/* Two columns */}
        <div className="planned-trip-grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
          
          {/* Route & Orders */}
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '2px solid #3b82f6', overflow: 'hidden' }}>
            <div style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>Route & Orders</h3>
              <div style={{ fontSize: '13px', color: '#64748b', paddingBottom: '24px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
                {trip.stops.length} delivery stops · {trip.stops.length} orders
              </div>

              {/* Timeline */}
              <div style={{ position: 'relative', paddingLeft: '16px' }}>
                <div style={{ position: 'absolute', top: '16px', bottom: '16px', left: '28px', width: '2px', backgroundColor: '#e2e8f0' }} />
                
                {/* Depot start */}
                <div style={{ display: 'flex', gap: '24px', position: 'relative', marginBottom: '32px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#1e293b', color: '#fff', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>1</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>{trip.depot} Depot</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>Start · 06:30</div>
                  </div>
                </div>

                {/* Stops */}
                {trip.stops.map((stop, index) => (
                  <div key={stop.id} style={{ display: 'flex', gap: '24px', position: 'relative', marginBottom: '32px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#F59E0B', color: '#fff', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>{index + 2}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>{stop.order.outletName}</div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#3b82f6' }}>{stop.order.id}</div>
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#16A34A', backgroundColor: '#DCFCE7', padding: '4px 12px', borderRadius: '12px', textTransform: 'uppercase' }}>
                          {stop.order.brand}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px', marginTop: '16px' }}>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>Delivery Window</div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>{stop.order.deliveryWindow}</div>
                        
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>Temperature</div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#3b82f6' }}>{stop.order.temperature}</div>
                        
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>Load</div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>{stop.order.weightKg} kg · {stop.order.volumeM3} m³</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom summary */}
            <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>{trip.distanceKm} km</div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Distance</div>
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>{Math.floor(trip.estDurationMins / 60)} hr {trip.estDurationMins % 60} min</div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Est. Duration</div>
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>{trip.stops.length}</div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Stops</div>
              </div>
            </div>
          </div>

          {/* Right Column: Capacity & Validation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Load Capacity */}
            {validation && (
              <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: 0 }}>Load Capacity</h3>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#3b82f6', backgroundColor: '#EFF6FF', padding: '4px 12px', borderRadius: '12px' }}>CHILLED</span>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>
                    <span>Weight</span>
                    <div style={{ color: '#1e293b' }}>
                      <span>{validation.weightUsageKg.toLocaleString()} / {validation.weightCapacityKg.toLocaleString()} kg</span>
                      <span style={{ color: '#F59E0B', marginLeft: '16px' }}>{validation.weightPercent}%</span>
                    </div>
                  </div>
                  <div style={{ height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, validation.weightPercent)}%`, backgroundColor: '#F59E0B', borderRadius: '3px' }} />
                  </div>
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>
                    <span>Volume</span>
                    <div style={{ color: '#1e293b' }}>
                      <span>{validation.volumeUsageM3.toFixed(1)} / {validation.volumeCapacityM3.toFixed(1)} m³</span>
                      <span style={{ color: '#F59E0B', marginLeft: '16px' }}>{validation.volumePercent}%</span>
                    </div>
                  </div>
                  <div style={{ height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, validation.volumePercent)}%`, backgroundColor: '#F59E0B', borderRadius: '3px' }} />
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: '#16A34A', fontWeight: 500 }}>
                  Capacity is within the vehicle's operating limits.
                </div>
              </div>
            )}

            {/* Constraint Validation */}
            {validation && (
              <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>Constraint Validation</h3>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '24px' }}>All required checks passed before confirmation.</div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Check size={14} color="#16A34A" /> <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>Weight capacity</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#16A34A' }}>Within limit</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Check size={14} color="#16A34A" /> <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>Volume capacity</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#16A34A' }}>Within limit</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Check size={14} color="#16A34A" /> <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>Temperature requirement</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#16A34A' }}>Reefer assigned</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Check size={14} color="#16A34A" /> <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>Delivery windows</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#16A34A' }}>Feasible</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Check size={14} color="#16A34A" /> <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>Home depot</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#16A34A' }}>{trip.depot}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Check size={14} color="#16A34A" /> <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>Fuel quota</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#16A34A' }}>Within quota</span>
                  </div>
                </div>

                <div style={{ backgroundColor: '#DCFCE7', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Check size={16} color="#16A34A" />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#16A34A', textTransform: 'uppercase' }}>Ready for Loading</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#16A34A', paddingLeft: '24px' }}>
                    Confirmed trip is available to the loading workflow.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer State Box */}
        <div style={{ backgroundColor: '#DCFCE7', borderRadius: '12px', padding: '24px', marginTop: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Check size={16} color="#16A34A" />
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#16A34A' }}>Plan confirmed</span>
          </div>
          <div style={{ fontSize: '12px', color: '#16A34A', paddingLeft: '24px' }}>
            {trip.id} is confirmed and ready for loading execution.
          </div>
        </div>

      </main>
    </div>
  );
};
