import React from 'react';
import type { DraftTrip } from '@/entities/planning/planningTypes';
import { Check } from 'lucide-react';

interface TripValidationColumnProps {
  draft: DraftTrip | null;
  onReviewShortfall: () => void;
  onConfirmClick?: () => void;
}

export const TripValidationColumn: React.FC<TripValidationColumnProps> = ({ draft, onReviewShortfall, onConfirmClick }) => {
  if (!draft || !draft.validation) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '620px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: '0 0 24px' }}>Trip Validation</h2>
        <div style={{ fontSize: '13px', color: '#94a3b8' }}>No vehicle or orders selected.</div>
      </div>
    );
  }

  const { validation, vehicle } = draft;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '620px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>Trip Validation</h2>
        <div style={{ fontSize: '13px', color: '#64748b' }}>{vehicle ? vehicle.name : 'No vehicle'}</div>
      </div>

      {/* Main Validation Details */}
      <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
        {/* Live Capacity */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '14px' }}>Live Capacity</div>
          
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
              <span>Weight</span>
              <div>
                <span>{validation.weightUsageKg.toLocaleString()} / {validation.weightCapacityKg.toLocaleString()} kg</span>
                <span style={{ color: validation.weightPercent > 100 ? '#DC2626' : '#F59E0B', marginLeft: '8px' }}>{validation.weightPercent}%</span>
              </div>
            </div>
            <div style={{ height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, validation.weightPercent)}%`, backgroundColor: validation.weightPercent > 100 ? '#DC2626' : '#F59E0B', borderRadius: '3px' }} />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
              <span>Volume</span>
              <div>
                <span>{validation.volumeUsageM3.toFixed(1)} / {validation.volumeCapacityM3.toFixed(1)} m³</span>
                <span style={{ color: validation.volumePercent > 100 ? '#DC2626' : '#F59E0B', marginLeft: '8px' }}>{validation.volumePercent}%</span>
              </div>
            </div>
            <div style={{ height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, validation.volumePercent)}%`, backgroundColor: validation.volumePercent > 100 ? '#DC2626' : '#F59E0B', borderRadius: '3px' }} />
            </div>
          </div>
        </div>

        {/* Mini stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Trip Usage</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>Trip {vehicle ? vehicle.tripsToday + 1 : 0} / 2</div>
          </div>
          <div>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Fuel</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: vehicle && vehicle.fuelStatus === 'Within quota' ? '#16A34A' : '#DC2626' }}>{vehicle ? vehicle.fuelStatus : '-'}</div>
          </div>
          <div>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Depot</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{vehicle ? vehicle.currentDepot : '-'}</div>
          </div>
        </div>

        {/* Constraints Check */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '14px' }}>Constraint Check</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {validation.checks.map(check => (
              <div key={check.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ marginTop: '2px' }}>
                  {check.status === 'PASSED' ? <Check size={14} color="#16A34A" strokeWidth={2.5} /> : <span style={{ color: check.status === 'NOT_EVALUATED' ? '#64748B' : '#DC2626', fontWeight: 700, fontSize: '12px' }}>{check.status === 'NOT_EVALUATED' ? '?' : '!'}</span>}
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '2px' }}>{check.name}</div>
                  <div style={{ fontSize: '11px', color: check.status === 'PASSED' ? '#16A34A' : check.status === 'NOT_EVALUATED' ? '#64748B' : '#DC2626' }}>{check.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shortfall Box if any */}
        {!validation.feasible && validation.conflictMessage?.includes('fleet capacity') && (
          <div style={{ backgroundColor: '#FEF3C7', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#F59E0B', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '12px', fontWeight: 700 }}>!</div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#92400E', marginBottom: '2px' }}>Capacity Shortfall Detected</div>
                <div style={{ fontSize: '11px', color: '#92400E' }}>Some remaining orders may not fit available fleet capacity.</div>
              </div>
            </div>
            <button 
              onClick={onReviewShortfall}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', backgroundColor: '#F59E0B', border: 'none', color: '#0f172a', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
            >
              Review Shortfall →
            </button>
          </div>
        )}
      </div>

      {/* Footer Action when Plan is Feasible */}
      {validation.feasible && onConfirmClick && (
        <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', backgroundColor: '#fff' }}>
          <button 
            onClick={onConfirmClick}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', backgroundColor: '#F59E0B', border: 'none', color: '#0f172a', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
          >
            Review before final confirmation
          </button>
        </div>
      )}
    </div>
  );
};
