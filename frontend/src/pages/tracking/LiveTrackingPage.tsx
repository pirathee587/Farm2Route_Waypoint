// ============================================================
// LiveTrackingPage.tsx — Screen 1: Live Tracking Overview
// ============================================================

import React, { useState, useEffect } from 'react';
import { DispatcherSidebar, type DispatcherPage } from '@/shared/layouts/DispatcherSidebar';
import { RefreshCw, Search } from 'lucide-react';
import { fetchLiveTrackingData, mockActiveTrips, mockTrackingSummary } from '@/features/delivery-tracking/liveTrackingApi';
import type { ActiveTrip, LiveTrackingSummary } from '@/entities/tracking/trackingTypes';
import { ActiveTripCard } from './components/ActiveTripCard';
import { LiveOperationsMapCanvas } from './components/LiveOperationsMapCanvas';
import { RouteProgressWidget } from './components/RouteProgressWidget';
import { TripDetailsSidebar } from './components/TripDetailsSidebar';

interface LiveTrackingPageProps {
  onNavigateGlobal: (page: string) => void;
  selectedTripId?: string | null;
  onSelectTrip?: (tripId: string) => void;
}

export const LiveTrackingPage: React.FC<LiveTrackingPageProps> = ({
  onNavigateGlobal,
  selectedTripId: initialTripId,
  onSelectTrip,
}) => {
  const [trips, setTrips] = useState<ActiveTrip[]>(mockActiveTrips);
  const [summary, setSummary] = useState<LiveTrackingSummary>(mockTrackingSummary);
  const [selectedTripId, setSelectedTripId] = useState<string>(initialTripId || 'TRIP-0925-014');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ON_TIME' | 'AT_RISK' | 'ISSUE'>('ALL');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useEffect(() => {
    if (initialTripId) {
      setSelectedTripId(initialTripId);
    }
  }, [initialTripId]);

  useEffect(() => {
    fetchLiveTrackingData().then(data => {
      setTrips(data.trips);
      setSummary(data.summary);
      if (!data.trips.some(trip => trip.id === selectedTripId) && data.trips[0]) handleSelectTrip(data.trips[0].id);
    });
  }, []);

  const handleSelectTrip = (id: string) => {
    setSelectedTripId(id);
    if (onSelectTrip) {
      onSelectTrip(id);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchLiveTrackingData();
      setTrips(data.trips);
      setSummary(data.summary);
      if (!data.trips.some(trip => trip.id === selectedTripId) && data.trips[0]) handleSelectTrip(data.trips[0].id);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter trips
  const filteredTrips = trips.filter((trip) => {
    const matchesSearch =
      trip.tripCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.vehicleId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.driverName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'ON_TIME') return trip.monitoringStatus === 'ON_TIME';
    if (activeFilter === 'AT_RISK') return trip.monitoringStatus === 'AT_RISK';
    if (activeFilter === 'ISSUE') return trip.monitoringStatus === 'ISSUE';

    return true;
  });

  const selectedTrip = trips.find((t) => t.id === selectedTripId) || trips[0];

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
      {/* Dispatcher Sidebar */}
      <DispatcherSidebar
        activePage="live-tracking"
        onNavigate={(page: DispatcherPage) => onNavigateGlobal(page)}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1, minWidth: 0, height: '100vh', padding: '24px 32px', overflowY: 'auto', overflowX: 'hidden' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '24px',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 800,
                color: '#0f172a',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Live Tracking
            </h1>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
              Monitor active trips, delivery progress and vehicle status in real time.
            </p>
          </div>

          {/* Right Status Indicator & Refresh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.2)',
                }}
              />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#10B981' }}>Live</span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Updated {summary.lastUpdated}</span>
            </div>

            <button
              onClick={handleRefresh}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
                transition: 'all 0.15s ease',
              }}
              title="Refresh"
            >
              <RefreshCw
                size={14}
                style={{
                  transform: isRefreshing ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.4s ease',
                }}
              />
            </button>
          </div>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="tracking-summary-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          {/* Active Trips */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              padding: '16px 20px',
              border: '1px solid #f1f5f9',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563EB' }} />
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ACTIVE TRIPS
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>
                {summary.activeTripsCount}
              </span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>On road</span>
            </div>
          </div>

          {/* On Time */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              padding: '16px 20px',
              border: '1px solid #f1f5f9',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ON TIME
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>
                {summary.onTimeCount}
              </span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Trips</span>
            </div>
          </div>

          {/* At Risk */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              padding: '16px 20px',
              border: '1px solid #f1f5f9',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                AT RISK
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>
                {summary.atRiskCount}
              </span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Needs attention</span>
            </div>
          </div>

          {/* Issues */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              padding: '16px 20px',
              border: '1px solid #f1f5f9',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ISSUES
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>
                {summary.issuesCount}
              </span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Active issue</span>
            </div>
          </div>
        </div>

        {/* 3 Column Main Body */}
        <div className="tracking-main-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '310px 1fr 320px',
            gap: '20px',
            alignItems: 'start',
          }}
        >
          {/* Column 1: Active Trips List */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '18px',
                border: '1px solid #f1f5f9',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              {/* Header with 8 LIVE badge */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '14px',
                }}
              >
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                  Active Trips
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: '#ECFDF5',
                    color: '#10B981',
                  }}
                >
                  8 LIVE
                </span>
              </div>

              {/* Search Bar */}
              <div
                style={{
                  position: 'relative',
                  marginBottom: '12px',
                }}
              >
                <Search
                  size={14}
                  style={{
                    position: 'absolute',
                    top: '10px',
                    left: '12px',
                    color: '#94a3b8',
                  }}
                />
                <input
                  type="text"
                  placeholder="Search trip or vehicle"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 12px 8px 34px',
                    fontSize: '12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    outline: 'none',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                  }}
                />
              </div>

              {/* Filter Pills */}
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  marginBottom: '16px',
                  overflowX: 'auto',
                }}
              >
                <button
                  onClick={() => setActiveFilter('ALL')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '14px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: activeFilter === 'ALL' ? '#0f172a' : '#f1f5f9',
                    color: activeFilter === 'ALL' ? '#ffffff' : '#64748b',
                  }}
                >
                  All 8
                </button>
                <button
                  onClick={() => setActiveFilter('ON_TIME')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '14px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: activeFilter === 'ON_TIME' ? '#0f172a' : '#f1f5f9',
                    color: activeFilter === 'ON_TIME' ? '#ffffff' : '#64748b',
                  }}
                >
                  On Time 6
                </button>
                <button
                  onClick={() => setActiveFilter('AT_RISK')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '14px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: activeFilter === 'AT_RISK' ? '#0f172a' : '#f1f5f9',
                    color: activeFilter === 'AT_RISK' ? '#ffffff' : '#64748b',
                  }}
                >
                  At Risk 1
                </button>
                <button
                  onClick={() => setActiveFilter('ISSUE')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '14px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: activeFilter === 'ISSUE' ? '#0f172a' : '#f1f5f9',
                    color: activeFilter === 'ISSUE' ? '#ffffff' : '#64748b',
                  }}
                >
                  Issue 1
                </button>
              </div>

              {/* Trip Cards List */}
              <div style={{ maxHeight: '620px', overflowY: 'auto' }}>
                {filteredTrips.length === 0 && <div style={{ padding: '28px 12px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>No active trips match the selected filters.</div>}
                {filteredTrips.map((trip) => (
                  <ActiveTripCard
                    key={trip.id}
                    trip={trip}
                    isSelected={trip.id === selectedTrip.id}
                    onSelect={handleSelectTrip}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Column 2: Map & Route Progress */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Live Operations Map */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid #f1f5f9',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '14px',
                }}
              >
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                    Live Operations Map
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                    8 active vehicles
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#10B981' }}>LIVE</span>
                </div>
              </div>

              {/* SVG Map Canvas */}
              <LiveOperationsMapCanvas trip={selectedTrip} isLargeView={false} />
            </div>

            {/* Route Progress */}
            <RouteProgressWidget trip={selectedTrip} />
          </div>

          {/* Column 3: Trip Details Sidebar */}
          <TripDetailsSidebar
            trip={selectedTrip}
            onViewFullTrip={(tripId) => {
              onNavigateGlobal(`live-trip-detail/${tripId}`);
            }}
          />
        </div>
      </main>
    </div>
  );
};
