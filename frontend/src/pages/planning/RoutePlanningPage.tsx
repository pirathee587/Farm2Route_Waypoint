import React, { useState, useEffect } from 'react';
import { DispatcherSidebar } from '@/shared/layouts/DispatcherSidebar';
import { UnplannedOrdersColumn } from './UnplannedOrdersColumn';
import { TripBuilderColumn } from './TripBuilderColumn';
import { TripValidationColumn } from './TripValidationColumn';
import { 
  fetchPlanningSummary, 
  fetchAvailableVehicles, 
  generateSuggestedPlan, 
  confirmTrip,
  savePlanningDraft,
  fetchPlanningOrders,
  addOrderToTrip,
  removeOrderFromTrip,
  assignTripVehicle,
  assignTripDriver,
  updateTripDepot,
  updateTripStops,
} from '@/features/planning-allocation/routePlanningApi';
import type { PlanningSummary, VehicleCandidate, DraftTrip, DriverInfo } from '@/entities/planning/planningTypes';
import type { QueueOrder } from '@/entities/order/orderTypes';
import { Check } from 'lucide-react';

interface RoutePlanningPageProps {
  onNavigateGlobal?: (page: string) => void;
  selectedOrders?: QueueOrder[];
}

export const RoutePlanningPage: React.FC<RoutePlanningPageProps> = ({ onNavigateGlobal, selectedOrders }) => {
  const [planningDate, setPlanningDate] = useState(() => { const date = new Date(); date.setDate(date.getDate() + 1); return date.toISOString().slice(0, 10); });
  const [summary, setSummary] = useState<PlanningSummary | null>(null);
  const [vehicles, setVehicles] = useState<VehicleCandidate[]>([]);
  const [unplannedOrders, setUnplannedOrders] = useState<QueueOrder[]>([]);
  const [draft, setDraft] = useState<DraftTrip | null>(null);
  
  // Modals
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
      const [sum, vehs, orders] = await Promise.all([
        fetchPlanningSummary(planningDate),
        fetchAvailableVehicles(),
        fetchPlanningOrders(planningDate),
      ]);
      if (!mounted) return;
      setSummary(sum);
      setVehicles(vehs);
      
      // Include both Unplanned and Deferred orders so dispatchers can plan all
      const initialOrders = orders;
      setUnplannedOrders(initialOrders);
      
      if (selectedOrders && selectedOrders.length > 0) {
        setGenerating(true);
        const plan = await generateSuggestedPlan(selectedOrders, planningDate);
        if (mounted) {
          setDraft(plan);
          setUnplannedOrders(prev => prev.filter(o => !selectedOrders.find(so => so.id === o.id)));
          setGenerating(false);
        }
      }
      } catch (error) { if (mounted) setActionError(error instanceof Error ? error.message : 'Unable to load planning data.'); }
      setLoading(false);
    };
    loadData();
    return () => { mounted = false; };
  }, [selectedOrders, planningDate]);

  const handleGeneratePlan = async () => {
    if (unplannedOrders.length === 0) {
      setActionError('No unplanned orders are available for a suggested plan.');
      return;
    }
    setGenerating(true);
    setActionError(null);
    // Suggest a plan for the top 3 orders
    const toPlan = unplannedOrders.slice(0, 3);
    try { const plan = await generateSuggestedPlan(toPlan, planningDate); setDraft(plan); setUnplannedOrders(prev => prev.filter(o => !toPlan.find(to => to.id === o.id))); }
    catch(error){setActionError(error instanceof Error?error.message:'Unable to generate plan.');} finally { setGenerating(false); }
  };

  const handleAddOrder = async (order: QueueOrder) => {
    try { const next = draft ? await addOrderToTrip(draft,order) : await generateSuggestedPlan([order], planningDate); setDraft(next); setUnplannedOrders(prev=>prev.filter(o=>o.id!==order.id)); }
    catch(error){setActionError(error instanceof Error?error.message:'Unable to add order.');}
  };

  const handleRemoveStop = async (stopId: string) => {
    if (!draft) return;
    const removedStop = draft.stops.find(s => s.id === stopId);
    if (removedStop) {
      setUnplannedOrders(prev => [...prev, removedStop.order]);
    }
    try { setDraft(await removeOrderFromTrip(draft,removedStop!.order.id)); } catch(error){setActionError(error instanceof Error?error.message:'Unable to remove order.');}
  };

  const handleReorderStop = async (stopId: string, direction: 'up' | 'down') => {
    if (!draft) return;
    const idx = draft.stops.findIndex(s => s.id === stopId);
    if (idx === -1) return;
    
    const newStops = [...draft.stops];
    if (direction === 'up' && idx > 0) {
      [newStops[idx], newStops[idx - 1]] = [newStops[idx - 1], newStops[idx]];
    } else if (direction === 'down' && idx < newStops.length - 1) {
      [newStops[idx], newStops[idx + 1]] = [newStops[idx + 1], newStops[idx]];
    }
    
    try { setDraft(await updateTripStops(draft,newStops.map(s=>s.order.id))); } catch(error){setActionError(error instanceof Error?error.message:'Unable to reorder stops.');}
  };

  const handleChangeVehicle = async (vehicle: VehicleCandidate) => {
    if (!draft) return;
    try { setDraft(await assignTripVehicle(draft,vehicle)); } catch(error){setActionError(error instanceof Error?error.message:'Unable to assign vehicle.');}
  };

  const handleChangeDepot = async (depot: string) => {
    if (!draft) return;
    try { setDraft(await updateTripDepot(draft,depot)); } catch(error){setActionError(error instanceof Error?error.message:'Unable to change depot.');}
  };

  const handleChangeDriver = async (driver: DriverInfo) => {
    if (!draft || !draft.vehicle) return;
    try { setDraft(await assignTripDriver(draft, driver)); }
    catch(error){setActionError(error instanceof Error?error.message:'Unable to assign driver.');}
  };

  const handleConfirmPlan = async () => {
    if (confirming) return;
    if (!draft || !draft.vehicle || draft.stops.length === 0) { setActionError('Assign a vehicle and add at least one order before confirming.'); return; }
    setConfirming(true);
    setActionError(null);
    try {
      const res = await confirmTrip(draft);
      if (res.success) {
        setDraft(res.trip);
        setShowConfirmModal(false);
        setShowSuccessModal(true);
      } else setActionError('The plan is no longer feasible. Review its constraints.');
    } catch(error) {
      setActionError(error instanceof Error ? error.message : 'Unable to confirm the plan. Please try again.');
    } finally { setConfirming(false); }
  };

  const handleSaveDraft = async () => {
    if (!draft) {
      setActionError('Build a trip before saving a draft.');
      return;
    }
    try { setDraft(await savePlanningDraft(draft)); setDraftSaved(true); setActionError(null); }
    catch(error){setActionError(error instanceof Error?error.message:'Unable to save draft.');}
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', backgroundColor: '#f1f5f9', overflow: 'hidden' }}>
      <DispatcherSidebar activePage="route-planning" onNavigate={onNavigateGlobal || (() => {})} />
      
      <main style={{ flex: 1, minWidth: 0, height: '100vh', overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>Route Planning</h1>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Build feasible trips, allocate orders and validate fleet constraints.</p>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <input type="date" value={planningDate} min={new Date().toISOString().slice(0,10)} onChange={event=>{setDraft(null);setActionError(null);setPlanningDate(event.target.value);}} aria-label="Planning date" style={{ padding:'9px 12px',borderRadius:'8px',border:'1px solid #e2e8f0',background:'#fff',color:'#334155',fontSize:'13px',fontWeight:600 }} />
            <button onClick={handleSaveDraft} disabled={!draft} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff', fontSize: '13px', fontWeight: 600, color: '#475569', cursor: draft ? 'pointer' : 'not-allowed', opacity: draft ? 1 : 0.55 }}>
              {draftSaved ? 'Draft Saved' : 'Save Draft'}
            </button>
            <button 
              onClick={handleGeneratePlan}
              disabled={generating}
              style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#F59E0B', fontSize: '13px', fontWeight: 700, color: '#0f172a', cursor: 'pointer', opacity: generating ? 0.7 : 1 }}
            >
              {generating ? 'Generating...' : 'Generate Suggested Plan'}
            </button>
          </div>
        </div>

        {actionError && <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FEF2F2', color: '#B91C1C', fontSize: '12px', fontWeight: 600 }}>{actionError}</div>}

        {/* Planning Summary */}
        {summary && (
          <div style={{ display: 'flex', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px 24px', marginBottom: '24px' }}>
            <div style={{ flex: 1, borderRight: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Unplanned</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>{unplannedOrders.length}</div>
            </div>
            <div style={{ flex: 1, paddingLeft: '24px', borderRight: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Planned</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>{summary.planned}</div>
            </div>
            <div style={{ flex: 1, paddingLeft: '24px', borderRight: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Available Vehicles</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>{summary.availableVehicles} <span style={{ fontSize: '16px', color: '#94a3b8', fontWeight: 600 }}>/ {summary.totalVehicles}</span></div>
            </div>
            <div style={{ flex: 1, paddingLeft: '24px', borderRight: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Reefer Available</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>{summary.reeferAvailable} <span style={{ fontSize: '16px', color: '#94a3b8', fontWeight: 600 }}>/ {summary.totalReefer}</span></div>
            </div>
            <div style={{ flex: 1, paddingLeft: '24px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Deferred</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>{summary.deferred}</div>
            </div>
          </div>
        )}

        {/* 3 Columns Layout with aligned equal-height styling */}
        <div className="planning-main-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 1fr', gap: '24px', flex: 1, alignItems: 'stretch', paddingBottom: '32px' }}>
          <UnplannedOrdersColumn orders={unplannedOrders} onAddOrder={handleAddOrder} />

          <TripBuilderColumn 
            draft={draft}
            vehicles={vehicles}
            unplannedOrders={unplannedOrders}
            onChangeVehicle={handleChangeVehicle}
            onChangeDepot={handleChangeDepot}
            onChangeDriver={handleChangeDriver}
            onAddOrder={handleAddOrder}
            onRemoveStop={handleRemoveStop}
            onReorderStop={handleReorderStop}
            onSaveDraft={handleSaveDraft}
          />

          <TripValidationColumn 
            draft={draft} 
            onReviewShortfall={() => onNavigateGlobal?.('capacity-shortfall')} 
            onConfirmClick={() => setShowConfirmModal(true)}
          />
        </div>
      </main>

      {/* Confirm Modal */}
      {showConfirmModal && draft && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="dispatcher-modal" style={{ backgroundColor: '#fff', borderRadius: '16px', width: '500px', margin: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '32px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                <Check size={24} color="#D97706" />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>Confirm Delivery Plan?</h2>
              <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Review the final allocation before releasing the trip.</p>
            </div>
            
            <div style={{ padding: '32px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '20px', marginBottom: '32px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>Trip</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{draft.id}</div>
                
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>Depot</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{draft.depot}</div>

                <div style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>Vehicle</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{draft.vehicle?.name}</div>
                
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>Driver</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{draft.vehicle?.driverName}</div>
                
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>Stops</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{draft.stops.length} planned stops</div>
                
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>Capacity</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{draft.validation?.weightUsageKg.toLocaleString()} / {draft.validation?.weightCapacityKg.toLocaleString()} kg · {draft.validation?.volumeUsageM3.toFixed(1)} / {draft.validation?.volumeCapacityM3.toFixed(1)} m³</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16A34A', fontSize: '13px', fontWeight: 700 }}>
                <Check size={16} /> All required constraints currently pass.
              </div>
            </div>

            <div style={{ padding: '24px 32px', backgroundColor: '#f8fafc', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px', display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
              <button onClick={() => setShowConfirmModal(false)} disabled={confirming} style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '13px', fontWeight: 600, color: '#475569', cursor: confirming ? 'not-allowed' : 'pointer', opacity: confirming ? 0.6 : 1 }}>Cancel</button>
              <button onClick={handleConfirmPlan} disabled={confirming} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#F59E0B', fontSize: '13px', fontWeight: 700, color: '#0f172a', cursor: confirming ? 'wait' : 'pointer', opacity: confirming ? 0.7 : 1 }}>{confirming ? 'Confirming...' : 'Confirm Plan'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && draft && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="dispatcher-modal" style={{ backgroundColor: '#fff', borderRadius: '16px', width: '500px', margin: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check size={32} color="#16A34A" />
              </div>
            </div>
            
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', textAlign: 'center', margin: '0 0 16px' }}>Plan Confirmed</h2>
            <p style={{ fontSize: '14px', color: '#64748b', textAlign: 'center', margin: '0 0 32px' }}>{draft.id} is ready for the loading workflow.</p>
            
            <div style={{ backgroundColor: '#F0FDF4', borderRadius: '8px', padding: '16px', marginBottom: '32px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#166534', marginBottom: '4px' }}>Vehicle {draft.vehicle?.id} · Driver {draft.vehicle?.driverName} · {draft.stops.length} stops</div>
              <div style={{ fontSize: '11px', color: '#15803D' }}>Loader can now prepare this trip.</div>
            </div>

            <button 
              onClick={() => onNavigateGlobal?.(`planned-trip/${draft.id}`)} 
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#F59E0B', fontSize: '13px', fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}
            >
              View Planned Trip
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
