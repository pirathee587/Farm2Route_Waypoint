import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Bell, Box, Check, RefreshCw } from 'lucide-react';
import { DriverTripSummary, driverDeliveryApi } from '../driverDeliveryApi';

interface TripSummaryViewProps {
  onReturnToRoute: () => void;
  onViewHistory?: () => void;
  onOpenNotifications: () => void;
}

export const TripSummaryView: React.FC<TripSummaryViewProps> = ({ onReturnToRoute, onViewHistory, onOpenNotifications }) => {
  const [summary, setSummary] = useState<DriverTripSummary | null>(null);
  const [tripCode, setTripCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const today = await driverDeliveryApi.today();
      const trip = today.trips[0];
      if (!trip) throw new Error('No real trip is assigned to this driver.');
      setTripCode(trip.trip_code);
      setSummary(await driverDeliveryApi.tripSummary(trip.trip_id));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load trip summary.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  const completed = summary?.status === 'COMPLETED';
  const recorded = summary ? summary.delivered + summary.not_delivered + summary.partial : 0;

  return <div className="driver-screen-content animate-fade-in" style={{paddingBottom:110,background:'#f8fafc',minHeight:'100%'}}>
    <header style={{background:'#0a0e17',padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}><div style={{display:'flex',alignItems:'center',gap:10}}><span style={{width:32,height:32,borderRadius:8,background:'#facc15',display:'grid',placeItems:'center'}}><Box size={20}/></span><strong style={{color:'#facc15',fontSize:18}}>Waypoint</strong></div><button type="button" onClick={onOpenNotifications} aria-label="Notifications" style={{border:0,background:'none',color:'#cbd5e1'}}><Bell size={22}/></button></header>
    <main style={{padding:'18px 20px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',gap:12}}><div><h1 style={{fontSize:25,margin:0,color:'#0f172a'}}>Trip Summary</h1><p style={{fontSize:13,color:'#64748b',margin:'5px 0'}}>{tripCode || 'Loading assigned trip…'}</p></div><button type="button" onClick={() => void load()} style={iconButton}><RefreshCw size={17}/></button></div>
      {loading && !summary && <div style={card}>Loading real delivery outcomes…</div>}
      {error && <div role="alert" style={{...card,background:'#fee2e2',color:'#b91c1c'}}>{error}</div>}
      {summary && <>
        <section style={{...card,background:'#0f172a',color:'#fff',marginTop:14}}><div style={{display:'flex',alignItems:'center',gap:18}}><div><strong style={{fontSize:38,color:'#facc15'}}>{summary.total_stops}</strong><small style={{display:'block'}}>Stops</small></div><div><h2 style={{margin:0,fontSize:19}}>{completed?'Trip completed':'Trip in progress'}</h2><p style={{margin:'5px 0 0',color:'#94a3b8',fontSize:13}}>{recorded}/{summary.total_stops} stops have recorded outcomes.</p></div></div><div style={{marginTop:13,fontSize:12,color:'#cbd5e1'}}>{summary.vehicle_id} · {summary.date}</div></section>

        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:9,margin:'14px 0'}}><Stat value={summary.delivered} label="Delivered" color="#16a34a" bg="#f0fdf4"/><Stat value={summary.not_delivered} label="Not Delivered" color="#dc2626" bg="#fef2f2"/><Stat value={summary.partial} label="Partial" color="#b45309" bg="#fefce8"/></div>

        <section style={{...card,marginBottom:15}}><div style={{display:'flex',justifyContent:'space-between',fontWeight:800}}><span>Trip completion</span><span>{summary.completion_percent}%</span></div><div style={{height:8,background:'#e2e8f0',borderRadius:99,overflow:'hidden',marginTop:10}}><div style={{height:'100%',width:`${summary.completion_percent}%`,background:'#22c55e'}}/></div></section>

        <h2 style={{fontSize:17,color:'#0f172a'}}>Delivery outcomes <small style={{float:'right',color:'#64748b'}}>{summary.total_stops} stop{summary.total_stops===1?'':'s'}</small></h2>
        <div style={{display:'flex',flexDirection:'column',gap:9}}>{summary.outcomes.length ? summary.outcomes.map(outcome => <div key={outcome.stop_id} style={{...card,display:'flex',alignItems:'center',gap:11}}><span style={{width:34,height:34,borderRadius:'50%',background:outcome.outcome==='DELIVERED'?'#dcfce7':'#fef2f2',display:'grid',placeItems:'center',color:outcome.outcome==='DELIVERED'?'#16a34a':'#dc2626'}}>{outcome.outcome==='DELIVERED'?<Check size={18}/>:<AlertCircle size={18}/>}</span><div style={{flex:1}}><strong>{outcome.outlet_name}</strong><small style={{display:'block',color:'#64748b'}}>{outcome.outlet_id} · {new Date(outcome.completed_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small></div><span style={{fontSize:11,fontWeight:800,color:outcome.outcome==='DELIVERED'?'#15803d':'#b45309'}}>{outcome.outcome.replaceAll('_',' ')}</span></div>) : <div style={{...card,color:'#64748b'}}>No delivery outcome has been recorded yet. FreshMart must be completed before this trip can finish.</div>}</div>

        {summary.attention_records.length > 0 && <section style={{...card,background:'#fefce8',border:'1px solid #fde047',marginTop:15}}><strong>{summary.attention_records.length} record(s) need dispatcher attention</strong>{summary.attention_records.map((item,index)=><div key={`${item.outlet_id}-${index}`} style={{fontSize:12,marginTop:7}}>{item.outlet_name}: {item.detail} · {item.sent?'Sent':'Pending'}</div>)}</section>}

        <div style={{display:'grid',gridTemplateColumns:'1.3fr 1fr',gap:10,marginTop:18}}><button type="button" onClick={onReturnToRoute} style={primary}>Return to Route</button><button type="button" onClick={onViewHistory || (()=>{})} style={{...primary,background:'#fff',border:'1px solid #cbd5e1'}}>Trip History</button></div>
      </>}
    </main>
  </div>;
};

const Stat=({value,label,color,bg}:{value:number;label:string;color:string;bg:string})=><div style={{background:bg,borderRadius:16,padding:'14px 7px',textAlign:'center'}}><strong style={{fontSize:25,color}}>{value}</strong><small style={{display:'block',color,fontWeight:800,marginTop:3}}>{label}</small></div>;
const card:React.CSSProperties={background:'#fff',border:'1px solid #e2e8f0',borderRadius:17,padding:15};
const iconButton:React.CSSProperties={width:38,height:38,borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',display:'grid',placeItems:'center'};
const primary:React.CSSProperties={border:0,borderRadius:12,background:'#facc15',padding:12,fontWeight:800};
