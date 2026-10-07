import React, { useEffect, useState, useMemo } from 'react';
import { LoadingSidebar } from './LoadingSidebar';
import { LoadingHeader } from './LoadingHeader';
import { SummaryCard } from './SummaryCard';
import { TripCard } from './TripCard';
import { FilterBar } from './FilterBar';
import { TripDetailView } from './TripDetailView';
import { ItemChecklistView } from './ItemChecklistView';
import { FlagShortfallView } from './FlagShortfallView';
import { DepartureView } from './DepartureView';
import { loadingApi } from '../api';
import { ApiProblem, SummaryMetricItem, TodayLoadsResponse, Trip } from '../types';
import '../styles/loadingPortal.css';
import { X, MapPin } from 'lucide-react';

interface LoadingPortalProps {
  onLogout?: () => void;
}

export const LoadingPortal: React.FC<LoadingPortalProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<string>('todays-loads');
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loads,setLoads]=useState<TodayLoadsResponse|null>(null);
  const [availableDocks,setAvailableDocks]=useState<string[]>([]);
  const [availableStatuses,setAvailableStatuses]=useState<string[]>([]);
  const [loading,setLoading]=useState(true);const [error,setError]=useState<ApiProblem|null>(null);
  const [selectedTripId,setSelectedTripId]=useState<string|null>(null);const [selectedStopId,setSelectedStopId]=useState<string|null>(null);

  // Extract available unique docks
  const [selectedDocks, setSelectedDocks] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('All statuses');
  const [selectedTripModal, setSelectedTripModal] = useState<Trip | null>(null);

  useEffect(()=>{loadingApi.filters().then(x=>{setAvailableDocks(x.docks??[]);setAvailableStatuses(x.statuses??[])}).catch(setError);},[]);
  useEffect(()=>{const timer=setTimeout(()=>{const p=new URLSearchParams();if(searchQuery)p.set('q',searchQuery);selectedDocks.forEach(x=>p.append('dock',x));if(selectedStatus!=='All statuses')p.append('status',selectedStatus);setLoading(true);loadingApi.trips(p).then(x=>{setLoads({...x,trips:x.trips??[]});setError(null)}).catch(setError).finally(()=>setLoading(false));},250);return()=>clearTimeout(timer)},[searchQuery,selectedDocks,selectedStatus]);
  const initialTrips:Trip[]=useMemo(()=>(loads?.trips||[]).map(t=>({id:t.tripId,vehicleId:t.vehicleId,status:t.status,progressPercent:t.progressPct,weightLoaded:t.loadedKg,weightCapacity:t.capacityKg,origin:t.origin,destination:t.destination,stopsCount:t.stopCount,dock:t.dock,driver:t.driverName})),[loads]);
  const initialShiftInfo=useMemo(()=>({shiftName:loads?.meta.shift||'',shiftHours:loads?`${loads.meta.shiftStart}–${loads.meta.shiftEnd}`:'',warehouseName:loads?.meta.depot||'',dateStr:loads?.meta.date||''}),[loads]);
  const initialSummaryMetrics:SummaryMetricItem[]=useMemo(()=>loads?[{id:'trips-today',title:'Trips Today',count:loads.summary.tripsToday,subtext:`${loads.summary.addedThisShift} added this shift`,iconType:'truck'},{id:'loaded',title:'Loaded',count:loads.summary.loaded,subtext:'Ready for departure',iconType:'check'},{id:'in-progress',title:'In Progress',count:loads.summary.inProgress,subtext:'Active loading',iconType:'progress'},{id:'pending',title:'Pending',count:loads.summary.pending,subtext:`${loads.summary.issuesNeedReview} issues require review`,iconType:'pending'}]:[],[loads]);

  const handleToggleDock = (dock: string) => {
    setSelectedDocks((prev) => {
      if (prev.includes(dock)) {
        return prev.filter((d) => d !== dock);
      } else {
        return [...prev, dock];
      }
    });
  };

  // Filtered trips for Today's Loads
  const filteredTrips = useMemo(() => {
    return initialTrips.filter((trip) => {
      const matchesSearch =
        trip.vehicleId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.driver.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trip.dock.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Filter by selected docks if any selected
      if (selectedDocks.length > 0 && !selectedDocks.includes(trip.dock)) {
        return false;
      }

      if (selectedStatus !== 'All statuses' && trip.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [initialTrips,searchQuery, selectedDocks, selectedStatus]);

  return (
    <div className="loading-portal-container">
      {/* Sidebar with automatic tablet drawer support */}
      <LoadingSidebar
        activeTab={activeTab}
        onTabChange={(tabId) => {
          setActiveTab(tabId);
          setIsSidebarOpenMobile(false);
        }}
        isOpenMobile={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <main className="loading-main-content">
        {/* Render Tab 1: Today's Loads */}
        {activeTab === 'todays-loads' && (
          <div>
            <LoadingHeader
              shiftInfo={initialShiftInfo}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onOpenMobileMenu={() => setIsSidebarOpenMobile(true)}
            />

            {/* 4 Summary Cards */}
            <div className="summary-cards-grid">
              {initialSummaryMetrics.map((item) => (
                <SummaryCard key={item.id} item={item} />
              ))}
            </div>

            {/* Section Header & Filters with Multi-Select Dock Dropdown (Screenshot 3) */}
            <FilterBar
              selectedDocks={selectedDocks}
              onToggleDock={handleToggleDock}
              selectedStatus={selectedStatus}
              onStatusChange={setSelectedStatus}
              availableDocks={availableDocks}
              availableStatuses={availableStatuses}
            />

            {/* Trips Cards Grid */}
            {loading ? <div className="loading-state" role="status">Loading today&apos;s trips…</div> : error ? <div className="loading-state" role="alert">{error.status===409?'The loading plan changed. Refresh and acknowledge the latest plan.':error.status===422?error.message:`Unable to load trips: ${error.message}`}</div> : filteredTrips.length > 0 ? (
              <div className="trips-cards-grid">
                {filteredTrips.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    onClick={() => {setSelectedTripId(trip.id);setActiveTab('trip-detail')}}
                  />
                ))}
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px dashed #CBD5E1',
                  padding: '48px 24px',
                  textAlign: 'center',
                  color: '#64748B',
                }}
              >
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#1E293B' }}>
                  No trips match your filters
                </p>
                <p style={{ fontSize: '13px', marginTop: '6px' }}>
                  Try checking more docks or adjusting your search query.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedDocks(availableDocks);
                    setSelectedStatus('All statuses');
                  }}
                  style={{
                    marginTop: '16px',
                    padding: '8px 16px',
                    backgroundColor: '#F5A623',
                    color: '#111315',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  Select All Docks
                </button>
              </div>
            )}
          </div>
        )}

        {/* Render Tab 2: Trip Detail (Screenshots 1 & 2) */}
        {activeTab === 'trip-detail' && (
          <div>
            {/* Tablet Menu Bar if on tablet */}
            <div
              className="tablet-menu-header"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <button
                type="button"
                onClick={() => setIsSidebarOpenMobile(true)}
                className="tablet-menu-btn"
                style={{
                  display: 'none',
                  padding: '8px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  color: '#1E293B',
                }}
                aria-label="Toggle navigation menu"
              >
                <span style={{ fontSize: '18px', lineHeight: 1 }}>☰</span>
              </button>
            </div>

            <TripDetailView
              tripId={selectedTripId}
              onLoadItemClick={(stopId) => {
                setSelectedStopId(stopId);
                setActiveTab('item-checklist');
              }}
            />
          </div>
        )}

        {/* Render Tab 3: Item Checklist (Screenshot 2) */}
        {activeTab === 'item-checklist' && (
          <div>
            <div
              className="tablet-menu-header"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <button
                type="button"
                onClick={() => setIsSidebarOpenMobile(true)}
                className="tablet-menu-btn"
                style={{
                  display: 'none',
                  padding: '8px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  color: '#1E293B',
                }}
                aria-label="Toggle navigation menu"
              >
                <span style={{ fontSize: '18px', lineHeight: 1 }}>☰</span>
              </button>
            </div>

            <ItemChecklistView
              tripId={selectedTripId}
              stopId={selectedStopId}
              onReportIssueClick={() => {
                setActiveTab('flag-shortfall');
              }}
              onConfirmLoadedClick={() => {
                setActiveTab('departure');
              }}
            />
          </div>
        )}

        {/* Render Tab 4: Flag Shortfall (Screenshots 3 & 5) */}
        {activeTab === 'flag-shortfall' && (
          <div>
            <div
              className="tablet-menu-header"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <button
                type="button"
                onClick={() => setIsSidebarOpenMobile(true)}
                className="tablet-menu-btn"
                style={{
                  display: 'none',
                  padding: '8px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  color: '#1E293B',
                }}
                aria-label="Toggle navigation menu"
              >
                <span style={{ fontSize: '18px', lineHeight: 1 }}>☰</span>
              </button>
            </div>

            <FlagShortfallView
              tripId={selectedTripId}
              stopId={selectedStopId}
              onNotifySuccess={() => {
                // When modal 'Back to Item Checklist' is clicked, navigates back to Item Checklist
                setActiveTab('item-checklist');
              }}
            />
          </div>
        )}

        {/* Render Tab 5: Departure (Screenshot 4) */}
        {activeTab === 'departure' && (
          <div>
            <div
              className="tablet-menu-header"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <button
                type="button"
                onClick={() => setIsSidebarOpenMobile(true)}
                className="tablet-menu-btn"
                style={{
                  display: 'none',
                  padding: '8px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  color: '#1E293B',
                }}
                aria-label="Toggle navigation menu"
              >
                <span style={{ fontSize: '18px', lineHeight: 1 }}>☰</span>
              </button>
            </div>

            <DepartureView tripId={selectedTripId} />
          </div>
        )}
      </main>

      {/* Trip Modal for other cards */}
      {selectedTripModal && (
        <div
          onClick={() => setSelectedTripModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden',
              border: '1px solid #E2E8F0',
            }}
          >
            <div
              style={{
                padding: '18px 22px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#F8FAFC',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>
                  {selectedTripModal.vehicleId}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '100px',
                    backgroundColor:
                      selectedTripModal.status === 'Ready'
                        ? '#DCFCE7'
                        : selectedTripModal.status === 'Loading'
                        ? '#FEF3C7'
                        : selectedTripModal.status === 'Issue'
                        ? '#FEE2E2'
                        : '#F1F5F9',
                    color:
                      selectedTripModal.status === 'Ready'
                        ? '#15803D'
                        : selectedTripModal.status === 'Loading'
                        ? '#92400E'
                        : selectedTripModal.status === 'Issue'
                        ? '#B91C1C'
                        : '#475569',
                  }}
                >
                  {selectedTripModal.status}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTripModal(null)}
                style={{ color: '#64748B', padding: '6px', borderRadius: '6px' }}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '22px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#0F172A',
                }}
              >
                <MapPin size={16} style={{ color: '#F59E0B' }} />
                <span>
                  {selectedTripModal.origin} → {selectedTripModal.destination}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    backgroundColor: '#F1F5F9',
                    color: '#64748B',
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}
                >
                  {selectedTripModal.stopsCount} stops
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '20px',
                }}
              >
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                    ASSIGNED DOCK
                  </span>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                    {selectedTripModal.dock}
                  </p>
                </div>

                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                    DRIVER
                  </span>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                    {selectedTripModal.driver}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setSelectedTripModal(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    backgroundColor: '#F1F5F9',
                    color: '#475569',
                  }}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTripModal(null);
                    setActiveTab('trip-detail');
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    backgroundColor: '#F5A623',
                    color: '#111315',
                  }}
                >
                  View Cargo Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
