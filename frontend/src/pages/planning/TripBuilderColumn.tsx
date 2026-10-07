import React, { useState, useEffect } from 'react';
import type { DraftTrip, VehicleCandidate, DriverInfo } from '@/entities/planning/planningTypes';
import type { QueueOrder } from '@/entities/order/orderTypes';
import { ChevronDown, Plus, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { fetchDrivers } from '@/features/planning-allocation/routePlanningApi';

const AVAILABLE_DEPOTS = [
  'Peliyagoda',
  'Biyagama',
  'Colombo Central',
  'Kandy Hub',
  'Galle Sub-Depot'
];

interface TripBuilderColumnProps {
  draft: DraftTrip | null;
  vehicles: VehicleCandidate[];
  unplannedOrders?: QueueOrder[];
  onChangeVehicle: (v: VehicleCandidate) => void;
  onChangeDepot?: (depot: string) => void;
  onChangeDriver?: (driver: DriverInfo) => void;
  onAddOrder?: (order: QueueOrder) => void;
  onRemoveStop: (stopId: string) => void;
  onReorderStop: (stopId: string, direction: 'up' | 'down') => void;
  onSaveDraft: () => void;
}

export const TripBuilderColumn: React.FC<TripBuilderColumnProps> = ({ 
  draft, 
  vehicles, 
  unplannedOrders = [],
  onChangeVehicle, 
  onChangeDepot,
  onChangeDriver,
  onAddOrder,
  onRemoveStop, 
  onReorderStop, 
  onSaveDraft,
}) => {
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const [depotDropdownOpen, setDepotDropdownOpen] = useState(false);
  const [driverDropdownOpen, setDriverDropdownOpen] = useState(false);
  const [showAddOrderPicker, setShowAddOrderPicker] = useState(false);

  // Driver state — fetched from DB
  const [drivers, setDrivers] = useState<DriverInfo[]>([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const [driversError, setDriversError] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<DriverInfo | null>(null);

  const loadDrivers = () => {
    if (driversLoading) return;
    setDriversLoading(true);
    setDriversError(null);
    fetchDrivers()
      .then(setDrivers)
      .catch((err) => {
        console.error('Failed to load drivers:', err);
        setDriversError('Failed to load drivers');
      })
      .finally(() => setDriversLoading(false));
  };

  // Preload drivers on mount
  useEffect(() => {
    loadDrivers();
  }, []);

  // Also retry if opened and still empty
  useEffect(() => {
    if (driverDropdownOpen && drivers.length === 0 && !driversLoading) {
      loadDrivers();
    }
  }, [driverDropdownOpen]);

  if (!draft) {
    return (
      <div style={{ flex: 1, backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', minHeight: '300px' }}>
        No active trip. Generate a suggested plan or add an order to begin.
      </div>
    );
  }

  const handleSelectVehicle = (v: VehicleCandidate) => {
    onChangeVehicle(v);
    setSelectedDriver(null);
    setVehicleDropdownOpen(false);
  };

  const handleSelectDepot = (d: string) => {
    if (onChangeDepot) onChangeDepot(d);
    setDepotDropdownOpen(false);
  };

  const handleSelectDriver = (driver: DriverInfo) => {
    setSelectedDriver(driver);
    if (onChangeDriver) onChangeDriver(driver);
    setDriverDropdownOpen(false);
  };

  const displayDriverName = selectedDriver?.fullName || (draft.vehicle?.driverName && draft.vehicle.driverName !== 'Select driver' ? draft.vehicle.driverName : null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
      
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>Trip Builder</h2>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#3b82f6' }}>{draft.id}</div>
        </div>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#D97706', backgroundColor: '#FEF3C7', padding: '4px 12px', borderRadius: '12px' }}>DRAFT</span>
      </div>

      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
        
        {/* Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 1.5fr', gap: '16px', marginBottom: '24px' }}>
          {/* Depot Dropdown */}
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Depot</div>
            <div 
              onClick={() => {
                setDepotDropdownOpen(!depotDropdownOpen);
                setVehicleDropdownOpen(false);
                setDriverDropdownOpen(false);
              }}
              style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '13px', fontWeight: 600, color: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            >
              <span>{draft.depot}</span> 
              <ChevronDown size={14} color="#94a3b8" />
            </div>

            {depotDropdownOpen && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 30 }}>
                <div style={{ padding: '8px 12px', fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Select Depot</div>
                {AVAILABLE_DEPOTS.map(d => (
                  <div 
                    key={d}
                    onClick={() => handleSelectDepot(d)}
                    style={{ padding: '8px 12px', borderTop: '1px solid #f1f5f9', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: draft.depot === d ? '#F8FAFC' : '#fff' }}
                  >
                    <span>{d}</span>
                    {draft.depot === d && <Check size={14} color="#16A34A" />}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Vehicle Dropdown */}
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Vehicle</div>
            <div 
              onClick={() => {
                setVehicleDropdownOpen(!vehicleDropdownOpen);
                setDepotDropdownOpen(false);
                setDriverDropdownOpen(false);
              }}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{draft.vehicle ? draft.vehicle.name : 'Select Vehicle'}</div>
                {draft.vehicle && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{draft.vehicle.weightCapacityKg} kg · {draft.vehicle.volumeCapacityM3} m³</div>}
              </div>
              <ChevronDown size={14} color="#94a3b8" />
            </div>
            
            {vehicleDropdownOpen && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 30 }}>
                <div style={{ padding: '8px 12px', fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Select Vehicle</div>
                {vehicles.map(v => (
                  <div 
                    key={v.id} 
                    onClick={() => handleSelectVehicle(v)}
                    style={{ padding: '10px 12px', borderTop: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.1s', backgroundColor: draft.vehicle?.id === v.id ? '#F8FAFC' : '#fff' }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{v.name}</span>
                      {draft.vehicle?.id === v.id && <Check size={14} color="#16A34A" />}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{v.weightCapacityKg} kg · {v.volumeCapacityM3} m³ · <span style={{ color: v.status === 'Available' ? '#16A34A' : '#94a3b8', fontWeight: 500 }}>{v.status}</span></div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Driver Dropdown */}
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Driver</div>
            <div 
              onClick={() => {
                setDriverDropdownOpen(!driverDropdownOpen);
                setDepotDropdownOpen(false);
                setVehicleDropdownOpen(false);
              }}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: displayDriverName ? '#1e293b' : '#94a3b8' }}>
                  {displayDriverName || '-'}
                </div>
                {displayDriverName && (
                  <div style={{ fontSize: '11px', color: '#16A34A', marginTop: '2px', fontWeight: 500 }}>Available</div>
                )}
              </div>
              <ChevronDown size={14} color="#94a3b8" />
            </div>

            {driverDropdownOpen && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 30, minWidth: '220px' }}>
                <div style={{ padding: '8px 12px', fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Select Driver</div>

                {driversLoading && (
                  <div style={{ padding: '16px 12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px' }}>
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    Loading drivers…
                  </div>
                )}

                {driversError && (
                  <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', color: '#DC2626', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertCircle size={14} />
                      {driversError}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); loadDrivers(); }}
                      style={{ alignSelf: 'flex-start', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', color: '#B91C1C', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Retry
                    </button>
                  </div>
                )}

                {!driversLoading && !driversError && drivers.length === 0 && (
                  <div style={{ padding: '12px', fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>
                    No drivers found
                  </div>
                )}

                {!driversLoading && drivers.map(driver => (
                  <div 
                    key={driver.id}
                    onClick={() => handleSelectDriver(driver)}
                    style={{
                      padding: '10px 12px',
                      borderTop: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#1e293b',
                      backgroundColor: selectedDriver?.id === driver.id ? '#F0FDF4' : '#fff',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (selectedDriver?.id !== driver.id) (e.currentTarget as HTMLDivElement).style.backgroundColor = '#f8fafc'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = selectedDriver?.id === driver.id ? '#F0FDF4' : '#fff'; }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{driver.fullName}</div>
                        {driver.depot && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{driver.depot}</div>}
                      </div>
                      {selectedDriver?.id === driver.id && <Check size={14} color="#16A34A" />}
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>

        {/* Warning if any */}
        {draft.validation && draft.validation.conflictMessage && (
          <div style={{ marginBottom: '24px', padding: '12px', backgroundColor: '#FEF2F2', borderRadius: '8px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ color: '#DC2626' }}>⚠️</span>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#991B1B' }}>{draft.validation.conflictMessage}</span>
          </div>
        )}

        {/* Trip Summary Band */}
        {draft.vehicle && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#FEF3C7', borderRadius: '8px', marginBottom: '24px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>Trip {draft.vehicle.tripsToday + 1}</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Home Depot: <span style={{ color: '#1e293b', fontWeight: 500 }}>{draft.vehicle.currentDepot}</span></span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Fuel: <span style={{ color: draft.vehicle.fuelStatus === 'Within quota' ? '#16A34A' : '#DC2626', fontWeight: 600 }}>{draft.vehicle.fuelStatus}</span></span>
          </div>
        )}

        {/* Route Stops */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Route Stops</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>{draft.stops.length} stops</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          {draft.stops.map((stop, index) => (
            <div key={stop.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', position: 'relative' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#1e293b', color: '#fff', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {index + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '2px' }}>{stop.order.outletName}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>OUT{10 + index} · {stop.order.id}</div>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: stop.order.timeSensitive ? '#D97706' : '#1e293b' }}>
                      {stop.order.deliveryWindow}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#38BDF8', backgroundColor: '#F0F9FF', padding: '4px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                      ❄ {stop.order.temperature}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>{stop.order.weightKg} kg</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>{stop.order.volumeM3} m³</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => onReorderStop(stop.id, 'up')} disabled={index === 0} style={{ fontSize: '11px', color: '#94a3b8', background: 'none', border: 'none', cursor: index === 0 ? 'default' : 'pointer' }}>↑</button>
                      <button onClick={() => onReorderStop(stop.id, 'down')} disabled={index === draft.stops.length - 1} style={{ fontSize: '11px', color: '#94a3b8', background: 'none', border: 'none', cursor: index === draft.stops.length - 1 ? 'default' : 'pointer' }}>↓</button>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>Drag to reorder</span>
                    </div>
                    <button onClick={() => onRemoveStop(stop.id)} style={{ fontSize: '11px', fontWeight: 600, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add Order to Trip */}
          <div style={{ borderTop: '1px dashed #cbd5e1', borderBottom: '1px dashed #cbd5e1', padding: '12px 0' }}>
            <button 
              onClick={() => setShowAddOrderPicker(!showAddOrderPicker)}
              style={{ width: '100%', padding: '10px', background: 'none', border: 'none', color: '#0f172a', fontSize: '14px', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            >
              <Plus size={18} color="#F59E0B" strokeWidth={2.5} /> Add Order to Trip
            </button>
          </div>

          {showAddOrderPicker && (
            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px', marginTop: '-8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#1E293B' }}>Select an unplanned order to add:</span>
                <button 
                  onClick={() => setShowAddOrderPicker(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center' }}
                >
                  <X size={14} />
                </button>
              </div>

              {unplannedOrders.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#94A3B8', textAlign: 'center', padding: '12px 0' }}>
                  No more unplanned orders available.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {unplannedOrders.map(order => (
                    <div 
                      key={order.id}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '6px' }}
                    >
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>{order.id} · {order.outletName}</div>
                        <div style={{ fontSize: '10px', color: '#64748B' }}>{order.weightKg} kg · {order.volumeM3} m³ · {order.temperature}</div>
                      </div>
                      <button 
                        onClick={() => {
                          if (onAddOrder) onAddOrder(order);
                          setShowAddOrderPicker(false);
                        }}
                        style={{ padding: '4px 10px', backgroundColor: '#F59E0B', color: '#0F172A', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Route Summary */}
        <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '16px' }}>Route Summary</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{draft.depot} Depot</span>
            {draft.stops.map(s => (
              <React.Fragment key={s.id}>
                <span style={{ color: '#F59E0B' }}>→</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{s.order.routeArea}</span>
              </React.Fragment>
            ))}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '32px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>{draft.distanceKm} km</span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Est. {Math.floor(draft.estDurationMins / 60)} hr {draft.estDurationMins % 60} min</span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>{draft.stops.length} stops</span>
            </div>
            <button onClick={onSaveDraft} style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', background: 'none', border: 'none', cursor: 'pointer' }}>Save Draft</button>
          </div>
        </div>

      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
