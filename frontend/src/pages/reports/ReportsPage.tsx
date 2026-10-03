// ============================================================
// ReportsPage.tsx — Reports & Insights Dispatcher Screen
// ============================================================

import React, { useState, useEffect } from 'react';
import { DispatcherSidebar, type DispatcherPage } from '@/shared/layouts/DispatcherSidebar';
import { ChevronDown, Download, AlertTriangle, Info } from 'lucide-react';
import { fetchCurrentReportData } from '@/features/reporting/reportsApi';
import type { ReportData, DeferralBreakdownItem, OperationalInsight } from '@/entities/fleet/fleetTypes';

interface ReportsPageProps {
  onNavigateGlobal: (page: string) => void;
}

const REPORT_DATES = [
  'Current operational state',
];

// ── Sub-components ─────────────────────────────────────────────

function SummaryCard({ label, value, sub, dotColor }: { label: string; value: number | string; sub: string; dotColor: string }) {
  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '16px 20px', border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: dotColor }} />
        <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>{value}</span>
        <span style={{ fontSize: '12px', color: '#64748b' }}>{sub}</span>
      </div>
    </div>
  );
}

function ProgressBar({ value, max, color, height = 8 }: { value: number; max: number; color: string; height?: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ width: '100%', height: `${height}px`, backgroundColor: '#f1f5f9', borderRadius: `${height / 2}px`, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: `${height / 2}px`, transition: 'width 0.4s ease' }} />
    </div>
  );
}

function Card({ title, subtitle, children, topRight }: { title: string; subtitle?: string; children: React.ReactNode; topRight?: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
        <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>{title}</div>
        {topRight}
      </div>
      {subtitle && <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px' }}>{subtitle}</div>}
      {children}
    </div>
  );
}

function InsightCard({ insight, onNavigate }: { insight: OperationalInsight; onNavigate: (page: string) => void }) {
  const iconMap = {
    warning:   { bg: '#FEF2F2', iconBg: '#FCA5A5', icon: <AlertTriangle size={16} color="#DC2626" /> },
    attention: { bg: '#FFFBEB', iconBg: '#FDE68A', icon: <AlertTriangle size={16} color="#D97706" /> },
    info:      { bg: '#EFF6FF', iconBg: '#BFDBFE', icon: <Info          size={16} color="#2563EB" /> },
  };
  const cfg = iconMap[insight.type];
  return (
    <button type="button" onClick={() => insight.actionPage && onNavigate(insight.actionPage)} disabled={!insight.actionPage} style={{ backgroundColor: cfg.bg, borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, width: '100%', textAlign: 'left', cursor: insight.actionPage ? 'pointer' : 'default' }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: cfg.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {cfg.icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>{insight.title}</div>
        <div style={{ fontSize: '12px', color: '#64748b' }}>{insight.description}</div>
      </div>
    </button>
  );
}

// ── Main Page ──────────────────────────────────────────────────

export const ReportsPage: React.FC<ReportsPageProps> = ({ onNavigateGlobal }) => {
  const [selectedDate, setSelectedDate] = useState(REPORT_DATES[0]);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  const loadReport = () => {
    setLoading(true);
    setError(false);
    fetchCurrentReportData().then((d) => {
      setData(d);
      setLoading(false);
    }).catch(() => {
      setError(true);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadReport();
  }, [selectedDate]);

  const handleExport = () => {
    if (!data) return;
    const csv = [
      ['Report Date', data.reportDate],
      ['Total Orders', data.totalOrders],
      ['Planned', data.plannedOrders],
      ['Deferred', data.deferredOrders],
      ['Active Trips', data.activeTrips],
      ['Issues', data.issues],
      ['Planned %', data.deliveryPerformance.plannedPercent + '%'],
    ].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waypoint-report-${data.reportDate.replace(/\s/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100%', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
        <DispatcherSidebar activePage="reports" onNavigate={(p: DispatcherPage) => onNavigateGlobal(p)} />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '14px' }}>
          Loading report data…
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100%', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
        <DispatcherSidebar activePage="reports" onNavigate={(p: DispatcherPage) => onNavigateGlobal(p)} />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '14px' }}>
          <span>Unable to load report data.</span>
          <button onClick={loadReport} style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: '#0f172a', color: '#fff', fontWeight: 700 }}>Retry</button>
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100%', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
        <DispatcherSidebar activePage="reports" onNavigate={(p: DispatcherPage) => onNavigateGlobal(p)} />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '14px' }}>
          No operational data is available for this period.
        </main>
      </div>
    );
  }

  const dp = data.deliveryPerformance;
  const fu = data.fleetUtilisation;
  const cc = data.chilledCapacity;

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
      <DispatcherSidebar activePage="reports" onNavigate={(p: DispatcherPage) => onNavigateGlobal(p)} />

      <main className="dispatcher-analytics-content" style={{ flex: 1, minWidth: 0, height: '100vh', overflowY: 'auto', overflowX: 'hidden', padding: '24px 28px' }}>
        {/* ── Page Header ──────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>Reports &amp; Insights</h1>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>Review delivery performance, deferrals, fleet utilisation and operational trends.</p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* Date Selector */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowDateDropdown((v) => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', fontWeight: 600, color: '#334155', cursor: 'pointer' }}
              >
                {selectedDate}
                <ChevronDown size={14} />
              </button>
              {showDateDropdown && (
                <div style={{ position: 'absolute', top: '40px', right: 0, zIndex: 50, backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', overflow: 'hidden', minWidth: '160px' }}>
                  {REPORT_DATES.map((d) => (
                    <button
                      key={d}
                      onClick={() => { setSelectedDate(d); setShowDateDropdown(false); }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', fontSize: '13px', fontWeight: d === selectedDate ? 700 : 500, color: d === selectedDate ? '#F59E0B' : '#334155', border: 'none', background: d === selectedDate ? '#FFFBEB' : 'none', cursor: 'pointer' }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Export */}
            <button
              onClick={handleExport}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', backgroundColor: '#0f172a', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, color: '#fff', cursor: 'pointer' }}
            >
              <Download size={14} />
              Export
            </button>
          </div>
        </div>

        {/* ── Summary Cards Row ─────────────────────────────── */}
        <div className="dispatcher-five-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', marginBottom: '20px' }}>
          <SummaryCard label="Orders"       value={data.totalOrders}   sub="Today"      dotColor="#64748b" />
          <SummaryCard label="Planned"      value={data.plannedOrders} sub={`${dp.plannedPercent}%`} dotColor="#10B981" />
          <SummaryCard label="Deferred"     value={data.deferredOrders} sub={`${dp.deferredPercent}%`} dotColor="#F59E0B" />
          <SummaryCard label="Active Trips" value={data.activeTrips}   sub="On road"    dotColor="#2563EB" />
          <SummaryCard label="Issues"       value={data.issues}         sub="Need review" dotColor="#EF4444" />
        </div>

        {/* ── Row 1: Delivery Performance + Deferral Breakdown ─ */}
        <div className="reports-two-column-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          {/* Delivery Performance */}
          <Card title="Delivery Performance" subtitle="Today's order outcomes"
            topRight={
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', backgroundColor: '#f1f5f9', color: '#475569' }}>TODAY</span>
            }>
            {/* Big percentage */}
            <div style={{ fontSize: '40px', fontWeight: 800, color: '#10B981', letterSpacing: '-0.02em', marginBottom: '4px' }}>
              {dp.plannedPercent}%
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>Orders planned for service</div>

            <ProgressBar value={dp.plannedOrders} max={dp.totalOrders} color="#10B981" height={8} />

            {/* Breakdown rows */}
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Planned',  value: dp.plannedOrders,  color: '#10B981' },
                { label: 'Deferred', value: dp.deferredOrders, color: '#F59E0B' },
                { label: 'Issues',   value: dp.issues,          color: '#EF4444' },
              ].map((row) => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>{row.label}</span>
                  <span style={{ fontWeight: 800, color: row.color, fontSize: '15px' }}>{row.value}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Deferral Breakdown */}
          <Card title="Deferral Breakdown" subtitle={`${data.deferredOrders} orders require another delivery plan`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {data.deferralBreakdown.map((item: DeferralBreakdownItem) => (
                <div key={item.category}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>{item.category}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: item.color }}>{item.count} orders</span>
                  </div>
                  <ProgressBar value={item.count} max={data.deferredOrders} color={item.color} height={7} />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Row 2: Fleet Utilisation + Chilled Capacity ───── */}
        <div className="reports-two-column-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          {/* Fleet Utilisation */}
          <Card title="Fleet Utilisation" subtitle="Current fleet availability">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
              {[
                { label: 'Available',   value: fu.available,   total: fu.total, color: '#10B981' },
                { label: 'In Use',      value: fu.inUse,      total: fu.total, color: '#3B82F6' },
                { label: 'Unavailable', value: fu.unavailable, total: fu.total, color: '#EF4444' },
              ].map((row) => (
                <div key={row.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>{row.label}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: row.color }}>{row.value} / {row.total}</span>
                  </div>
                  <ProgressBar value={row.value} max={row.total} color={row.color} height={7} />
                </div>
              ))}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>Total fleet: {fu.total} vehicles</div>
          </Card>

          {/* Chilled Capacity */}
          <Card title="Chilled Capacity" subtitle="Refrigerated fleet availability"
            topRight={
              cc.attentionRequired ? (
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', backgroundColor: '#FEF3C7', color: '#D97706', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>ATTENTION</span>
              ) : undefined
            }>
            {/* Big number */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '40px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>{cc.chilledAvailable}</span>
              <span style={{ fontSize: '13px', color: '#64748b' }}>of {cc.chilledTotal} chilled-capable vehicles available</span>
            </div>
            <ProgressBar value={cc.chilledAvailable} max={cc.chilledTotal} color="#F59E0B" height={7} />

            {/* Sub tiles */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '18px', marginBottom: '14px' }}>
              <div style={{ backgroundColor: '#f8fafc', borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: '4px' }}>REFRIGERATED TRUCKS</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>{cc.reeferTrucksTotal}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Fleet total</div>
              </div>
              <div style={{ backgroundColor: '#f8fafc', borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: '4px' }}>REFRIGERATED VANS</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>{cc.reeferVansTotal}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>of {cc.reeferVansTotal} small vans</div>
              </div>
            </div>

            <div style={{ backgroundColor: '#FFFBEB', borderRadius: '8px', padding: '10px 12px', border: '1px solid #FEF3C7' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#92400E' }}>
                Prioritize chilled Fresh demand with early delivery windows.
              </span>
            </div>
          </Card>
        </div>

        {/* ── Row 3: Operational Insights ───────────────────── */}
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '2px' }}>Operational Insights</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '18px' }}>Items requiring dispatcher attention</div>

          <div className="reports-insights-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {data.operationalInsights.map((ins) => (
              <InsightCard key={ins.id} insight={ins} onNavigate={onNavigateGlobal} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
