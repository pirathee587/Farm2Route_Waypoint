// ============================================================
// DispatcherDashboardPage — Main Dispatcher Dashboard
// ============================================================

import React, { useState, useEffect } from 'react';
import { DispatcherLayout } from '@/shared/layouts/DispatcherLayout';
import type { DispatcherPage } from '@/shared/layouts/DispatcherSidebar';
import { SummaryCard } from './SummaryCard';
import { PlanningAttentionSection } from './PlanningAttentionSection';
import { ActiveTripsSection } from './ActiveTripsSection';
import {
  LiveOperationsPanel,
  FleetAvailabilityPanel,
  TodaysPlanningPanel,
} from './RightPanelSections';
import { RecentActivitySection } from './RecentActivitySection';
import { fetchDashboardData, mockDashboardData } from '@/features/planning-allocation/dashboardApi';
import type { DashboardData } from '@/entities/dashboard/dashboardTypes';

// ── Page Header ──────────────────────────────────────────────

interface PageHeaderProps {
  date: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ date }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '20px',
      }}
    >
      <div>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#0f172a',
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          Operations Dashboard
        </h1>
        <p
          style={{
            fontSize: '13px',
            color: '#94a3b8',
            margin: '4px 0 0',
          }}
        >
          Monitor today's orders, fleet capacity and delivery operations.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginTop: '4px',
        }}
      >
        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
          {date}
        </span>
        {/* Live indicator */}
        <div
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: '#ef4444',
            boxShadow: '0 0 0 2px rgba(239,68,68,0.2)',
          }}
        />
      </div>
    </div>
  );
};

// ── Dashboard Page ───────────────────────────────────────────

interface DispatcherDashboardPageProps {
  onNavigateGlobal?: (page: string) => void;
}

export const DispatcherDashboardPage: React.FC<DispatcherDashboardPageProps> = ({ onNavigateGlobal }) => {
  const [activePage, setActivePage] = useState<DispatcherPage>('dashboard');
  const [data, setData] = useState<DashboardData>(mockDashboardData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchDashboardData().then((result) => {
      if (!cancelled) {
        setData(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleNavigate = (page: DispatcherPage) => {
    setActivePage(page);
    if (onNavigateGlobal) onNavigateGlobal(page);
  };

  const handleAttentionAction = (target: string) => {
    const pageMap: Record<string, DispatcherPage> = {
      orders: 'orders',
      fleet: 'fleet',
      'live-tracking': 'live-tracking',
    };
    const page = pageMap[target];
    if (page) handleNavigate(page);
  };

  const { summary, attentionItems, activeTrips, recentActivity, date } = data;

  return (
    <DispatcherLayout activePage={activePage} onNavigate={handleNavigate}>
      {/* Scrollable content area */}
      <div
        style={{
          padding: '28px 28px 40px',
          maxWidth: '1400px',
          width: '100%',
          margin: '0 auto',
        }}
        className="dashboard-content"
      >
        {/* Loading overlay */}
        {loading && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(248,250,252,0.6)',
              zIndex: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                border: '3px solid #e2e8f0',
                borderTopColor: '#F59E0B',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }}
            />
          </div>
        )}

        {/* Page Header */}
        <PageHeader date={date} />
        {data.source === 'FALLBACK' && (
          <div style={{ marginTop: '-12px', marginBottom: '14px', fontSize: '10px', color: '#94a3b8' }}>Development fallback data</div>
        )}

        {/* ── Summary Cards Row ─────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '10px',
            marginBottom: '20px',
          }}
          className="summary-cards-grid"
        >
          <SummaryCard
            id="card-orders-today"
            label="Orders Today"
            value={summary.totalOrders}
            subLabel="Today's demand"
            dotColor="#3b82f6"
          />
          <SummaryCard
            id="card-planned"
            label="Planned"
            value={summary.plannedOrders}
            subLabel={`${summary.plannedPercent}% complete`}
            dotColor="#10b981"
          />
          <SummaryCard
            id="card-unplanned"
            label="Unplanned"
            value={summary.unplannedOrders}
            subLabel="Needs action"
            dotColor="#F59E0B"
          />
          <SummaryCard
            id="card-vehicles"
            label="Vehicles Available"
            value={`${summary.availableVehicles} / ${summary.totalVehicles}`}
            subLabel="ready"
            dotColor="#10b981"
          />
          <SummaryCard
            id="card-deferred"
            label="Deferred"
            value={summary.deferredOrders}
            subLabel="Rescheduled"
            dotColor="#F59E0B"
          />
          <SummaryCard
            id="card-issues"
            label="Issues"
            value={summary.issuesCount}
            subLabel="Needs attention"
            dotColor="#ef4444"
          />
          <SummaryCard
            id="card-active-trips"
            label="Active Trips"
            value={summary.activeTrips}
            subLabel="In progress"
            dotColor="#3b82f6"
          />
        </div>

        {/* ── Main Two-Column Layout ───────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 300px',
            gap: '18px',
            alignItems: 'start',
          }}
          className="dashboard-main-grid"
        >
          {/* ── LEFT COLUMN ─────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Planning Attention */}
            <PlanningAttentionSection
              items={attentionItems}
              onNavigate={handleAttentionAction}
            />

            {/* Active Trips */}
            <ActiveTripsSection
              trips={activeTrips}
              onViewAll={() => handleNavigate('live-tracking')}
              onViewTrip={(tripId) => {
                onNavigateGlobal?.(`live-trip-detail/${tripId}`);
              }}
            />

            {/* Recent Activity */}
            <RecentActivitySection
              items={recentActivity}
              onViewAll={() => handleNavigate('live-tracking')}
            />
          </div>

          {/* ── RIGHT COLUMN ────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <LiveOperationsPanel />
            <FleetAvailabilityPanel summary={summary} />
            <TodaysPlanningPanel
              summary={summary}
              onContinuePlanning={() => handleNavigate('route-planning')}
            />
          </div>
        </div>
      </div>
    </DispatcherLayout>
  );
};
