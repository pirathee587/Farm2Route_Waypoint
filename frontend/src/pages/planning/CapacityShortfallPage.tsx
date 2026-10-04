import React, { useState, useEffect } from 'react';
import { DispatcherSidebar } from '@/shared/layouts/DispatcherSidebar';
import { ShortfallSummaryCards } from './shortfall/ShortfallSummaryCards';
import { AffectedOrdersTable } from './shortfall/AffectedOrdersTable';
import { OrderDecisionPanel } from './shortfall/OrderDecisionPanel';
import { DeferOrderModal } from './shortfall/DeferOrderModal';
import { ConfirmDeferralModal } from './shortfall/ConfirmDeferralModal';
import {
  fetchCapacityShortfallData,
  recordOrderDeferral,
  recordOrderKeepInPlan,
} from '@/features/planning-allocation/routePlanningApi';
import type {
  CapacityShortfallData,
  AffectedOrder,
} from '@/entities/planning/planningTypes';
import { AlertTriangle, AlertCircle, Info, ChevronLeft } from 'lucide-react';

interface CapacityShortfallPageProps {
  tripId?: string;
  onNavigateGlobal?: (page: string) => void;
  onBackToPlanning?: () => void;
}

export const CapacityShortfallPage: React.FC<CapacityShortfallPageProps> = ({
  tripId,
  onNavigateGlobal,
  onBackToPlanning,
}) => {
  const [data, setData] = useState<CapacityShortfallData | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal Workflow States
  const [deferModalOpen, setDeferModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deferFormData, setDeferFormData] = useState({
    reason: 'Refrigerated capacity unavailable',
    nextPlannedDate: '26 Sep 2026',
    operationalNote: '',
  });

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchCapacityShortfallData().then((res) => {
      if (active) {
        setData(res);
        if (res.affectedOrders.length > 0) {
          setSelectedOrderId(res.affectedOrders[0].id);
        }
        setLoading(false);
      }
    }).catch(() => { if (active) { setError('Unable to load capacity shortfall data.'); setLoading(false); } });
    return () => {
      active = false;
    };
  }, [tripId]);

  const selectedOrder =
    data?.affectedOrders.find((o) => o.id === selectedOrderId) ||
    data?.affectedOrders[0] ||
    null;

  const handleSelectOrder = (order: AffectedOrder) => {
    setSelectedOrderId(order.id);
  };

  const handleBack = () => {
    if (onBackToPlanning) {
      onBackToPlanning();
    } else if (onNavigateGlobal) {
      onNavigateGlobal('planning');
    }
  };

  const handleKeepInPlan = async (order: AffectedOrder) => {
    setSubmitting(true);
    setError(null);
    try {
      await recordOrderKeepInPlan(order.id);
    setData((prev) => {
      if (!prev) return prev;
      const updatedOrders = prev.affectedOrders.map((o) =>
        o.id === order.id ? { ...o, decisionState: 'Kept' as const } : o
      );
      const unresolvedCount = updatedOrders.filter((o) => o.decisionState === 'Unresolved').length;
      return {
        ...prev,
        affectedOrders: updatedOrders,
        summary: {
          ...prev.summary,
          requireDecision: unresolvedCount,
        },
      };
    });
      onNavigateGlobal?.('planning');
    } catch {
      setError('Unable to keep this order in planning. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDeferModal = (order: AffectedOrder) => {
    setSelectedOrderId(order.id);
    setDeferFormData({
      reason: order.recommendation.reason || 'Refrigerated capacity unavailable',
      nextPlannedDate: '26 Sep 2026',
      operationalNote: '',
    });
    setDeferModalOpen(true);
  };

  const handleDeferContinue = (formData: {
    reason: string;
    nextPlannedDate: string;
    operationalNote: string;
  }) => {
    setDeferFormData(formData);
    setDeferModalOpen(false);
    setConfirmModalOpen(true);
  };

  const handleConfirmBack = () => {
    setConfirmModalOpen(false);
    setDeferModalOpen(true);
  };

  const handleConfirmDeferral = async () => {
    if (!selectedOrder) return;
    setSubmitting(true);

    try {
      const res = await recordOrderDeferral({
        orderId: selectedOrder.id,
        reason: deferFormData.reason,
        nextPlannedDate: deferFormData.nextPlannedDate,
        operationalNote: deferFormData.operationalNote,
        tripId: tripId || data?.tripId,
      });

      if (res.success) {
        // Update affected orders & summary
        setData((prev) => {
          if (!prev) return prev;
          const updatedOrders = prev.affectedOrders.map((o) =>
            o.id === selectedOrder.id
              ? {
                  ...o,
                  decisionState: 'Deferred' as const,
                  deferralRecord: res.deferralRecord,
                }
              : o
          );
          const unresolvedCount = updatedOrders.filter((o) => o.decisionState === 'Unresolved').length;
          return {
            ...prev,
            affectedOrders: updatedOrders,
            summary: {
              ...prev.summary,
              requireDecision: unresolvedCount,
            },
          };
        });

        // Close modal
        setConfirmModalOpen(false);
        onNavigateGlobal?.('deferred-orders');
      }
    } catch (err) {
      setError('Unable to defer this order. Your changes have not been applied.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !data) {
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
        <DispatcherSidebar
          activePage="route-planning"
          onNavigate={onNavigateGlobal || (() => {})}
        />
        <main
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
          }}
        >
          Loading capacity shortfall details...
        </main>
      </div>
    );
  }

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
      {/* Sidebar fixed on the left */}
      <DispatcherSidebar
        activePage="route-planning"
        onNavigate={onNavigateGlobal || (() => {})}
      />

      {/* Main Content Area */}
      <main
        style={{
          flex: 1,
          minWidth: 0,
          height: '100vh',
          overflowY: 'auto',
          padding: '24px 32px 40px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {error && <div style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FEF2F2', color: '#B91C1C', fontSize: '12px' }}>{error}</div>}
        {/* Top Header */}
        <div style={{ marginBottom: '20px' }}>
          <button
            type="button"
            onClick={handleBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#3b82f6',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              marginBottom: '16px',
            }}
          >
            <ChevronLeft size={16} /> Back to Planning
          </button>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#FEF3C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px',
              }}
            >
              <AlertTriangle size={18} color="#D97706" />
            </div>
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
                {data.title}
              </h1>
              <p
                style={{
                  fontSize: '13px',
                  color: '#64748b',
                  margin: 0,
                }}
              >
                {data.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Primary Warning Banner */}
        <div
          style={{
            backgroundColor: '#FEF9C3',
            border: '1px solid #FDE68A',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#F59E0B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AlertCircle size={18} color="#ffffff" strokeWidth={2.5} />
            </div>
            <div>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#78350F',
                  marginBottom: '2px',
                }}
              >
                {data.warningTitle}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#92400E',
                }}
              >
                {data.warningSubtitle}
              </div>
            </div>
          </div>

          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#B45309',
              backgroundColor: '#FFFBEB',
              border: '1px solid #FDE68A',
              padding: '4px 12px',
              borderRadius: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            ACTION REQUIRED
          </span>
        </div>

        {/* 4 Summary Cards */}
        <ShortfallSummaryCards summary={data.summary} />

        {/* Why this happened Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Info size={16} color="#3B82F6" />
            </div>
            <div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#0f172a',
                  marginBottom: '2px',
                }}
              >
                Why this happened
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#64748b',
                }}
              >
                {data.whyExplanation}
              </div>
            </div>
          </div>

          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#2563EB',
              backgroundColor: '#EFF6FF',
              border: '1px solid #DBEAFE',
              padding: '4px 12px',
              borderRadius: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {data.constraintType}
          </span>
        </div>

        {/* Two Column Grid: Affected Orders Table + Order Decision Panel */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.8fr 1.1fr',
            gap: '24px',
            alignItems: 'start',
          }}
        >
          <AffectedOrdersTable
            orders={data.affectedOrders}
            selectedOrderId={selectedOrderId}
            onSelectOrder={handleSelectOrder}
          />

          <OrderDecisionPanel
            order={selectedOrder}
            onKeepInPlan={handleKeepInPlan}
            onOpenDeferModal={handleOpenDeferModal}
            submitting={submitting}
          />
        </div>
      </main>

      {/* Modal 1: Defer Order Form Modal (Screenshot 2) */}
      {deferModalOpen && selectedOrder && (
        <DeferOrderModal
          order={selectedOrder}
          initialReason={deferFormData.reason}
          initialDate={deferFormData.nextPlannedDate}
          initialNote={deferFormData.operationalNote}
          onCancel={() => setDeferModalOpen(false)}
          onContinue={handleDeferContinue}
        />
      )}

      {/* Modal 2: Confirm Order Deferral Modal (Screenshot 3) */}
      {confirmModalOpen && selectedOrder && (
        <ConfirmDeferralModal
          order={selectedOrder}
          formData={deferFormData}
          onBack={handleConfirmBack}
          onConfirm={handleConfirmDeferral}
          submitting={submitting}
        />
      )}
    </div>
  );
};
