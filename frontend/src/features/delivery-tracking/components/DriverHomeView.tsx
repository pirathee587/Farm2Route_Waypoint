import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, Box, CheckCircle2, MapPin, Navigation, Phone, RefreshCw, Truck } from 'lucide-react';
import { DriverRunSheet, driverDeliveryApi } from '../driverDeliveryApi';

interface DriverHomeViewProps {
  onSelectStop: (stopId: string) => void;
  onOpenNotifications: () => void;
  onOpenMap: () => void;
  currentUser?: { email: string; role?: string; fullName?: string } | null;
}

export const DriverHomeView: React.FC<DriverHomeViewProps> = ({
  onSelectStop, onOpenNotifications, onOpenMap, currentUser,
}) => {
  const [runSheet, setRunSheet] = useState<DriverRunSheet | null>(null);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [dispatcher, setDispatcher] = useState<{ name: string; phone: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [runs, contact] = await Promise.all([
        driverDeliveryApi.today(),
        driverDeliveryApi.dispatcherContact().catch(() => null),
      ]);
      setRunSheet(runs);
      setDispatcher(contact);
      setSelectedTripId(current => runs.trips.some(t => t.trip_id === current)
        ? current
        : runs.trips[0]?.trip_id || '');
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load the assigned run.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  const activeRun = useMemo(
    () => runSheet?.trips.find(trip => trip.trip_id === selectedTripId) ?? runSheet?.trips[0],
    [runSheet, selectedTripId],
  );

  const startTrip = async () => {
    if (!activeRun) return;
    setStarting(true);
    try {
      await driverDeliveryApi.startTrip(activeRun.trip_id);
      await load();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to start this trip.');
    } finally { setStarting(false); }
  };

  const driverName = runSheet?.driver.name || currentUser?.fullName || 'Driver';
  const vehicle = runSheet?.vehicle;

  return <div className="driver-screen-content animate-fade-in" style={{ paddingBottom: 100, background:'#f8fafc', minHeight:'100%' }}>
    <header style={{background:'#0a0e17',padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
      <div style={{display:'flex',alignItems:'center',gap:10}}><span style={{width:34,height:34,borderRadius:9,background:'#facc15',display:'grid',placeItems:'center'}}><Box size={21}/></span><strong style={{color:'#facc15',fontSize:18}}>Waypoint Driver</strong></div>
      <button type="button" aria-label="Notifications" onClick={onOpenNotifications} style={{border:0,background:'none',color:'#cbd5e1',padding:6}}><Bell size={22}/></button>
    </header>

    <main style={{padding:20}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',gap:12,marginBottom:16}}>
        <div><h1 style={{fontSize:25,margin:0,color:'#0f172a'}}>Welcome, {driverName.split(' ')[0]}</h1><p style={{margin:'5px 0 0',fontSize:13,color:'#64748b'}}>Your latest database-assigned delivery run</p></div>
        <button type="button" onClick={() => void load()} disabled={loading} aria-label="Refresh runs" style={iconButton}><RefreshCw size={17}/></button>
      </div>

      {loadError && <div role="alert" style={{padding:12,borderRadius:12,background:'#fee2e2',color:'#b91c1c',marginBottom:14}}>{loadError}</div>}
      {loading && !runSheet && <div style={emptyCard}>Loading your real trip data…</div>}
      {!loading && runSheet && runSheet.trips.length === 0 && <div style={emptyCard}>No confirmed trip is assigned to your current vehicle.</div>}

      {vehicle && <section style={{...card,background:'#111827',color:'#fff'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}><span style={{...vehicleIcon}}><Truck size={23}/></span><div><small style={{color:'#94a3b8'}}>CURRENT VEHICLE</small><h2 style={{fontSize:18,margin:'3px 0'}}>{vehicle.display_name || vehicle.id}</h2><div style={{fontSize:13,color:'#cbd5e1'}}>{vehicle.id} · {vehicle.registration} · {vehicle.type}</div></div></div>
        <div style={{fontSize:12,color:'#94a3b8',marginTop:13}}>Home depot: {vehicle.depot}</div>
      </section>}

      {runSheet && runSheet.trips.length > 1 && <div style={{display:'flex',gap:8,overflowX:'auto',margin:'14px 0'}}>{runSheet.trips.map(trip => <button key={trip.trip_id} type="button" onClick={() => setSelectedTripId(trip.trip_id)} style={{padding:'9px 13px',borderRadius:999,border:'1px solid #cbd5e1',background:activeRun?.trip_id===trip.trip_id?'#facc15':'#fff',fontWeight:800,whiteSpace:'nowrap'}}>{trip.trip_code || `Trip ${trip.trip_number}`}</button>)}</div>}

      {activeRun && <>
        <section style={{...card,marginTop:14}}>
          <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'start'}}><div><small style={{color:'#64748b'}}>ASSIGNED TRIP</small><h2 style={{fontSize:18,margin:'4px 0'}}>{activeRun.trip_code}</h2><div style={{fontSize:12,color:'#64748b'}}>Trip {activeRun.trip_number} · {activeRun.status.replaceAll('_',' ')}</div></div><strong style={{fontSize:23,color:'#0f172a'}}>{activeRun.progress_percent}%</strong></div>
          <div style={{height:7,background:'#e2e8f0',borderRadius:99,overflow:'hidden',marginTop:14}}><div style={{height:'100%',width:`${activeRun.progress_percent}%`,background:'#22c55e'}}/></div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#64748b',marginTop:8}}><span>{activeRun.completed_stops}/{activeRun.total_stops} stops completed</span><span>{activeRun.startable ? 'Ready to start' : 'Waiting for loader'}</span></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9,marginTop:14}}><button type="button" onClick={onOpenMap} style={primaryButton}><Navigation size={17}/> Open live map</button><button type="button" disabled={!activeRun.startable || starting || activeRun.status==='IN_PROGRESS'} onClick={() => void startTrip()} style={{...secondaryButton,opacity:!activeRun.startable?0.55:1}}>{activeRun.status==='IN_PROGRESS'?<CheckCircle2 size={17}/>:<Truck size={17}/>} {starting?'Starting…':activeRun.status==='IN_PROGRESS'?'Trip started':'Start trip'}</button></div>
        </section>

        <h2 style={{fontSize:16,margin:'18px 0 9px',color:'#0f172a'}}>Delivery stops</h2>
        <section style={{display:'flex',flexDirection:'column',gap:9}}>{activeRun.stops.map(stop => <button key={stop.stop_id} type="button" onClick={() => onSelectStop(stop.stop_id)} style={{...card,border:'1px solid #e2e8f0',textAlign:'left',cursor:'pointer'}}><div style={{display:'flex',gap:11,alignItems:'center'}}><span style={{width:32,height:32,borderRadius:'50%',background:stop.status==='DELIVERED'?'#dcfce7':'#e0f2fe',display:'grid',placeItems:'center',fontWeight:800}}>{stop.seq}</span><div style={{flex:1}}><strong style={{display:'block',color:'#0f172a'}}>{stop.outlet_name}</strong><small style={{color:'#64748b'}}>{stop.outlet_id} · {stop.district} · {stop.window_open}–{stop.window_close}</small></div><span style={{fontSize:10,fontWeight:800,color:stop.status==='DELIVERED'?'#15803d':'#0369a1'}}>{stop.status.replaceAll('_',' ')}</span></div></button>)}</section>
      </>}

      {dispatcher && <button type="button" onClick={() => dispatcher.phone && (window.location.href=`tel:${dispatcher.phone}`)} style={{...card,width:'100%',marginTop:16,border:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:12,textAlign:'left'}}><Phone size={19}/><span><strong style={{display:'block'}}>Call {dispatcher.name}</strong><small style={{color:'#64748b'}}>{dispatcher.phone || 'Phone number unavailable'}</small></span></button>}
      {activeRun?.stops[0] && <div style={{display:'flex',alignItems:'center',gap:7,color:'#64748b',fontSize:12,marginTop:14}}><MapPin size={15}/> Next: {activeRun.stops.find(s => !['DELIVERED','PARTIAL','NOT_DELIVERED'].includes(s.status))?.outlet_name || 'All stops completed'}</div>}
    </main>
  </div>;
};

const card: React.CSSProperties = {background:'#fff',borderRadius:18,padding:16,boxShadow:'0 2px 10px rgba(15,23,42,.04)'};
const emptyCard: React.CSSProperties = {...card,color:'#64748b',textAlign:'center'};
const iconButton: React.CSSProperties = {width:38,height:38,borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',display:'grid',placeItems:'center'};
const vehicleIcon: React.CSSProperties = {width:46,height:46,borderRadius:13,background:'#facc15',color:'#111827',display:'grid',placeItems:'center'};
const primaryButton: React.CSSProperties = {border:0,borderRadius:11,background:'#facc15',padding:'11px 9px',fontWeight:800,display:'flex',gap:6,alignItems:'center',justifyContent:'center'};
const secondaryButton: React.CSSProperties = {...primaryButton,background:'#e2e8f0',color:'#0f172a'};
