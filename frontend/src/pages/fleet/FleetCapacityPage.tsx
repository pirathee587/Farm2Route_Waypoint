// ============================================================
// FleetCapacityPage.tsx — Fleet / Capacity Dispatcher Screen
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import { DispatcherSidebar, type DispatcherPage } from '@/shared/layouts/DispatcherSidebar';
import { Search, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchFleetData, fetchCapacityForecast, type CapacityForecastRow } from '@/features/fleet/fleetApi';
import type { FleetVehicle, FleetSummary, VehicleType, VehicleStatus } from '@/entities/fleet/fleetTypes';

interface FleetCapacityPageProps {
  onNavigateGlobal: (page: string) => void;
}

const PAGE_SIZE = 6;

function StatusPill({ status }: { status: VehicleStatus }) {
  const cfg: Record<VehicleStatus, { bg: string; color: string }> = {
    'Available':   { bg: '#ECFDF5', color: '#059669' },
    'In Use':      { bg: '#EFF6FF', color: '#2563EB' },
    'Maintenance': { bg: '#FEF2F2', color: '#DC2626' },
    'Unavailable': { bg: '#F1F5F9', color: '#64748b' },
  };
  const s = cfg[status] ?? cfg['Unavailable'];
  return (
    <span style={{ backgroundColor: s.bg, color: s.color, fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
      {status}
    </span>
  );
}

function TypeBadge({ type }: { type: VehicleType }) {
  const cfg: Record<VehicleType, { bg: string; color: string }> = {
    'Reefer':   { bg: '#EFF6FF', color: '#2563EB' },
    'Dry Box':  { bg: '#F1F5F9', color: '#475569' },
    'Van':      { bg: '#F5F3FF', color: '#7C3AED' },
  };
  const s = cfg[type] ?? cfg['Dry Box'];
  return (
    <span style={{ backgroundColor: s.bg, color: s.color, fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
      {type}
    </span>
  );
}

function FuelBar({ pct }: { pct: number }) {
  const color = pct >= 60 ? '#10B981' : pct >= 30 ? '#F59E0B' : '#EF4444';
  return (
    <div>
      <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '3px' }}>{pct}%</div>
      <div style={{ width: '60px', height: '5px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: '3px' }} />
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub, dotColor }: { label: string; value: number; sub: string; dotColor: string }) {
  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '16px 20px', border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: dotColor, flexShrink: 0 }} />
        <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>{value}</span>
        <span style={{ fontSize: '12px', color: '#64748b' }}>{sub}</span>
      </div>
    </div>
  );
}

function CapacityBar({ label, used, total, color }: { label: string; used: number; total: number; color: string }) {
  const pct = Math.round((used / total) * 100);
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>{label}</span>
        <span style={{ fontSize: '12px', fontWeight: 700, color }}>
          {used} / {total} available
        </span>
      </div>
      <div style={{ width: '100%', height: '7px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: '4px' }} />
      </div>
    </div>
  );
}

export const FleetCapacityPage: React.FC<FleetCapacityPageProps> = ({ onNavigateGlobal }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [summary, setSummary] = useState<FleetSummary | null>(null);
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [forecast, setForecast] = useState<CapacityForecastRow[]>([]);
  const [reeferWarning, setReeferWarning] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<FleetVehicle | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [depotFilter, setDepotFilter] = useState<'All' | 'Peliyagoda' | 'Kandy'>('All');
  const [typeFilter, setTypeFilter] = useState<'All' | VehicleType>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | VehicleStatus>('All');
  const [currentPage, setCurrentPage] = useState(1);

  const loadFleet = () => {
    setLoading(true);
    setError(false);
    Promise.all([fetchFleetData(),fetchCapacityForecast()]).then(([data,forecastRows]) => {
      setSummary(data.summary);
      setVehicles(data.vehicles);
      setReeferWarning(data.reeferAttentionRequired);
      setForecast(forecastRows);
      setSelectedVehicle(data.vehicles[0] ?? null);
      setLoading(false);
    }).catch(() => {
      setError(true);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadFleet();
  }, []);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || v.id.toLowerCase().includes(q) || v.registration.toLowerCase().includes(q) || v.driverName.toLowerCase().includes(q);
      const matchDepot = depotFilter === 'All' || v.depot === depotFilter;
      const matchType = typeFilter === 'All' || v.type === typeFilter;
      const matchStatus = statusFilter === 'All' || v.status === statusFilter;
      return matchSearch && matchDepot && matchType && matchStatus;
    });
  }, [vehicles, searchQuery, depotFilter, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredVehicles.length / PAGE_SIZE));
  const pagedVehicles = filteredVehicles.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, depotFilter, typeFilter, statusFilter]);

  const sv = selectedVehicle;

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100%', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
        <DispatcherSidebar activePage="fleet" onNavigate={(p: DispatcherPage) => onNavigateGlobal(p)} />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '14px' }}>
          Loading fleet information…
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100%', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
        <DispatcherSidebar activePage="fleet" onNavigate={(p: DispatcherPage) => onNavigateGlobal(p)} />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '14px' }}>
          <span>Unable to load fleet information.</span>
          <button onClick={loadFleet} style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: '#0f172a', color: '#fff', fontWeight: 700 }}>Retry</button>
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
      <DispatcherSidebar activePage="fleet" onNavigate={(p: DispatcherPage) => onNavigateGlobal(p)} />

      <main className="dispatcher-analytics-content" style={{ flex: 1, minWidth: 0, height: '100vh', overflowY: 'auto', overflowX: 'hidden', padding: '24px 28px' }}>
        {/* ── Page Header ──────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>Fleet / Capacity</h1>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>Monitor vehicle availability, refrigerated capacity, trip usage and fleet constraints.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', boxShadow: '0 0 0 3px rgba(16,185,129,0.2)' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#10B981' }}>LIVE STATUS</span>
          </div>
        </div>

        {/* ── Summary Cards ─────────────────────────────────── */}
        {summary && (
          <div className="dispatcher-five-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px', marginBottom: '20px' }}>
            <SummaryCard label="Total Fleet"      value={summary.totalFleet}      sub="Vehicles"           dotColor="#2563EB" />
            <SummaryCard label="Available"        value={summary.available}        sub="Ready to allocate"  dotColor="#10B981" />
            <SummaryCard label="In Use"           value={summary.inUse}           sub="Active / assigned"  dotColor="#2563EB" />
            <SummaryCard label="Chilled Capable"  value={summary.chilledCapable}  sub="Fleet total"        dotColor="#8B5CF6" />
            <SummaryCard label="Unavailable"      value={summary.unavailable}     sub="Maintenance / issue" dotColor="#EF4444" />
          </div>
        )}

        {/* ── Reefer Warning Banner ─────────────────────────── */}
        {reeferWarning && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFBEB', border: '1px solid #FEF3C7', borderRadius: '12px', padding: '14px 20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={18} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#92400E' }}>Refrigerated capacity requires attention</div>
                <div style={{ fontSize: '12px', color: '#B45309', marginTop: '2px' }}>Chilled-capable vehicles are limited. Prioritize Fresh orders with early delivery windows.</div>
              </div>
            </div>
            <button
              onClick={() => onNavigateGlobal('capacity-shortfall')}
              style={{ padding: '8px 16px', backgroundColor: 'transparent', border: '1px solid #D97706', borderRadius: '8px', fontSize: '12px', fontWeight: 700, color: '#D97706', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              REVIEW CAPACITY
            </button>
          </div>
        )}

        {/* ── Main Body: Table + Right Panel ───────────────── */}
        <div className="fleet-main-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '20px', alignItems: 'start' }}>
          {/* Left: Fleet Availability Table */}
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ padding: '20px 20px 14px' }}>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '2px' }}>Fleet Availability</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>60 vehicles across Peliyagoda and Kandy depots</div>

              {/* Filters */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Search */}
                <div style={{ position: 'relative', flex: '0 1 200px', minWidth: '150px' }}>
                  <Search size={13} style={{ position: 'absolute', top: '9px', left: '10px', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Search vehicle"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '7px 10px 7px 30px', fontSize: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', color: '#0f172a' }}
                  />
                </div>

                {/* Depot filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569', fontWeight: 600 }}>
                  <span>Depot:</span>
                  <select value={depotFilter} onChange={(e) => setDepotFilter(e.target.value as typeof depotFilter)}
                    style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#334155', outline: 'none', cursor: 'pointer' }}>
                    <option value="All">All</option>
                    <option value="Peliyagoda">Peliyagoda</option>
                    <option value="Kandy">Kandy</option>
                  </select>
                </div>

                {/* Type filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569', fontWeight: 600 }}>
                  <span>Type:</span>
                  <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
                    style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#334155', outline: 'none', cursor: 'pointer' }}>
                    <option value="All">All</option>
                    <option value="Reefer">Reefer</option>
                    <option value="Dry Box">Dry Box</option>
                    <option value="Van">Van</option>
                  </select>
                </div>

                {/* Status filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569', fontWeight: 600 }}>
                  <span>Status:</span>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                    style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#334155', outline: 'none', cursor: 'pointer' }}>
                    <option value="All">All</option>
                    <option value="Available">Available</option>
                    <option value="In Use">In Use</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Unavailable">Unavailable</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                    {['VEHICLE', 'TYPE', 'DEPOT', 'CAPACITY', 'TRIPS', 'STATUS', 'FUEL'].map((h) => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedVehicles.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                        No vehicles match the selected filters.
                      </td>
                    </tr>
                  ) : pagedVehicles.map((v) => {
                    const isSelected = sv?.id === v.id;
                    const isUnavailable = v.status === 'Maintenance' || v.status === 'Unavailable';
                    return (
                      <tr
                        key={v.id}
                        onClick={() => setSelectedVehicle(v)}
                        style={{
                          borderBottom: '1px solid #f8fafc',
                          backgroundColor: isSelected ? '#FFFBEB' : '#fff',
                          borderLeft: isSelected ? '3px solid #F59E0B' : '3px solid transparent',
                          cursor: 'pointer',
                          opacity: isUnavailable ? 0.75 : 1,
                          transition: 'background 0.1s ease',
                        }}
                      >
                        {/* Vehicle ID */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{v.id}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>{v.registration}</div>
                        </td>
                        {/* Type */}
                        <td style={{ padding: '12px 16px' }}>
                          <TypeBadge type={v.type} />
                        </td>
                        {/* Depot */}
                        <td style={{ padding: '12px 16px', color: '#475569', fontWeight: 500 }}>{v.depot}</td>
                        {/* Capacity */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ color: '#334155', fontWeight: 600 }}>{v.weightCapacityKg.toLocaleString()} kg</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>{v.volumeCapacityM3} m³</div>
                        </td>
                        {/* Trips */}
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontWeight: 700, color: v.tripsToday >= v.maxTripsPerDay ? '#EF4444' : '#334155' }}>
                            {v.tripsToday} / {v.maxTripsPerDay}
                          </span>
                        </td>
                        {/* Status */}
                        <td style={{ padding: '12px 16px' }}>
                          <StatusPill status={v.status} />
                        </td>
                        {/* Fuel */}
                        <td style={{ padding: '12px 16px' }}>
                          <FuelBar pct={v.fuelPercent} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f8fafc' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Showing {filteredVehicles.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredVehicles.length)} of {filteredVehicles.length} vehicles.
              </span>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                  style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #e2e8f0', background: currentPage === 1 ? '#f8fafc' : '#fff', cursor: currentPage === 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => setCurrentPage(p)}
                    style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: currentPage === p ? '#0f172a' : '#f8fafc', color: currentPage === p ? '#fff' : '#64748b', fontWeight: 600, fontSize: '12px' }}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #e2e8f0', background: currentPage === totalPages ? '#f8fafc' : '#fff', cursor: currentPage === totalPages ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Right: Vehicle Details + Capacity Overview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Vehicle Details */}
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '22px', border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Vehicle Details</span>
                {sv && <StatusPill status={sv.status} />}
              </div>

              {sv ? (
                <>
                  {/* Vehicle ID */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: '#2563EB' }}>
                      V
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{sv.id}</span>
                        <TypeBadge type={sv.type} />
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{sv.registration}</div>
                    </div>
                  </div>

                  {/* Depot & Type */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>HOME DEPOT</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{sv.depot}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>TYPE</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{sv.typeFull}</div>
                    </div>
                  </div>

                  {/* Vehicle Capacity */}
                  <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>VEHICLE CAPACITY</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Weight</span>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{sv.weightCapacityKg.toLocaleString()} kg</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Volume</span>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{sv.volumeCapacityM3} m³</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Temperature</span>
                        <span style={{ fontWeight: 700, color: sv.isRefrigerated ? '#2563EB' : '#64748b' }}>
                          {sv.isRefrigerated ? 'Chilled capable' : 'Ambient only'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Trip Usage Today */}
                  <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>TRIP USAGE TODAY</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                      Trip {sv.tripsToday} of {sv.maxTripsPerDay}
                    </div>
                    <div style={{ width: '100%', height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden', marginBottom: '6px' }}>
                      <div style={{ width: `${(sv.tripsToday / sv.maxTripsPerDay) * 100}%`, height: '100%', backgroundColor: sv.tripsToday >= sv.maxTripsPerDay ? '#EF4444' : '#F59E0B', borderRadius: '3px' }} />
                    </div>
                    <div style={{ fontSize: '11px', color: sv.tripsToday >= sv.maxTripsPerDay ? '#EF4444' : '#10B981', fontWeight: 600 }}>
                      {sv.tripsToday >= sv.maxTripsPerDay ? 'No trips remaining' : `${sv.maxTripsPerDay - sv.tripsToday} trip${sv.maxTripsPerDay - sv.tripsToday > 1 ? 's' : ''} remaining`}
                    </div>
                  </div>

                  {/* Fuel / Quota */}
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>FUEL / WEEKLY QUOTA</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{sv.fuelPercent}%</span>
                      <span style={{ fontSize: '11px', color: sv.fuelPercent >= 30 ? '#10B981' : '#EF4444', fontWeight: 600 }}>
                        {sv.fuelPercent >= 30 ? 'Within quota' : 'Exceeded'}
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${sv.fuelPercent}%`, height: '100%', backgroundColor: sv.fuelPercent >= 60 ? '#10B981' : sv.fuelPercent >= 30 ? '#F59E0B' : '#EF4444', borderRadius: '3px' }} />
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '24px 0', fontSize: '13px' }}>
                  Select a vehicle to view details.
                </div>
              )}
            </div>

            {/* Capacity Overview */}
            {summary && (
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '22px', border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: '2px' }}>Capacity Overview</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '18px' }}>Available now</div>

                <CapacityBar label="Refrigerated"   used={summary.chilledAvailable} total={summary.chilledCapable} color="#F59E0B" />
                <CapacityBar label="Dry-box Trucks" used={summary.dryBoxAvailable}  total={summary.dryBoxTotal}   color="#10B981" />
                <CapacityBar label="Small Vans"     used={summary.vanAvailable}     total={summary.vanTotal}      color="#3B82F6" />

                <div style={{ backgroundColor: '#FFFBEB', borderRadius: '8px', padding: '10px 14px', border: '1px solid #FEF3C7', marginTop: '14px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#92400E' }}>
                    Prioritize reefer capacity for chilled Fresh orders.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
        <section style={{marginTop:'20px',background:'#fff',border:'1px solid #e2e8f0',borderRadius:'16px',padding:'20px'}}>
          <h2 style={{fontSize:'16px',margin:'0 0 4px',color:'#0f172a'}}>8-week demand forecast</h2>
          <p style={{fontSize:'12px',color:'#64748b',margin:'0 0 14px'}}>Order volume and chilled volume by depot, brand and ISO week.</p>
          {forecast.length===0?<div style={{fontSize:'13px',color:'#64748b'}}>No future confirmed or pending demand is recorded.</div>:
          <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:'12px'}}><thead><tr>{['Week','Depot','Brand','Orders','Volume m³','Chilled m³'].map(h=><th key={h} style={{textAlign:'left',padding:'8px',borderBottom:'1px solid #e2e8f0',color:'#64748b'}}>{h}</th>)}</tr></thead><tbody>{forecast.map((row,index)=><tr key={`${row.weekStart}-${row.depot}-${row.brand}-${index}`}><td style={{padding:'8px'}}>{row.weekStart}</td><td style={{padding:'8px'}}>{row.depot}</td><td style={{padding:'8px'}}>{row.brand}</td><td style={{padding:'8px'}}>{row.orderCount}</td><td style={{padding:'8px'}}>{row.totalVolumeM3.toFixed(2)}</td><td style={{padding:'8px'}}>{row.chilledVolumeM3.toFixed(2)}</td></tr>)}</tbody></table></div>}
        </section>
      </main>
    </div>
  );
};
