import React, { useEffect, useState } from 'react';
import { AlertCircle, ChevronLeft, Clock } from 'lucide-react';
import { driverDeliveryApi, DriverStopDetail, DriverWindowStatus } from '../driverDeliveryApi';

interface Props { stopId?: string; onBack: () => void; onOpenCantDeliver: () => void; }
const clock = (value?: string) => value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

export const WaitingWindowView: React.FC<Props> = ({ stopId, onBack, onOpenCantDeliver }) => {
  const [stop, setStop] = useState<DriverStopDetail | null>(null);
  const [windowState, setWindowState] = useState<DriverWindowStatus | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!stopId) { setError('No delivery stop selected.'); return; }
    Promise.all([driverDeliveryApi.stopDetail(stopId), driverDeliveryApi.windowStatus(stopId)])
      .then(([detail, status]) => { setStop(detail); setWindowState(status); })
      .catch((e: Error) => setError(e.message));
  }, [stopId]);

  return <div className="driver-screen-content animate-fade-in">
    <div className="driver-header-nav"><button type="button" className="driver-back-btn" onClick={onBack}><ChevronLeft size={22}/></button><h1 className="driver-header-title">Delivery Window</h1></div>
    {error && <div style={{padding:16, borderRadius:16, background:'#fef2f2', color:'#b91c1c'}}><AlertCircle size={18}/> {error}</div>}
    {!error && (!stop || !windowState) && <div style={{padding:24, textAlign:'center', color:'#64748b'}}>Loading live stop details…</div>}
    {stop && windowState && <>
      <section style={{background:'#fff', borderRadius:24, padding:20, border:'1px solid #e2e8f0'}}>
        <div style={{display:'flex', gap:14, alignItems:'center'}}><div style={{width:52,height:52,borderRadius:'50%',background:'#eff6ff',color:'#2563eb',display:'grid',placeItems:'center'}}><Clock size={28}/></div><div><h2 style={{margin:0,fontSize:22}}>{windowState.can_mark_arrived ? 'Window is open' : "You're early"}</h2><p style={{margin:'4px 0 0',color:'#64748b'}}>{stop.outlet.name}</p></div></div>
        <div style={{marginTop:18,padding:14,borderRadius:16,background:'#f8fafc',display:'flex',justifyContent:'space-between'}}><div><strong>{stop.outlet.name}</strong><div style={{fontSize:12,color:'#64748b'}}>{stop.outlet.id}</div></div><strong style={{fontSize:11,color:windowState.can_mark_arrived?'#15803d':'#a16207'}}>{windowState.status.replaceAll('_',' ')}</strong></div>
      </section>
      <section style={{background:'#111827',color:'#fff',borderRadius:24,padding:20,marginTop:16}}><div style={{color:'#94a3b8'}}>Delivery window opens at</div><div style={{fontSize:34,fontWeight:800,marginTop:6}}>{clock(windowState.window_opens_at)}</div><div style={{marginTop:14,color:'#f59e0b',fontSize:30,fontWeight:800}}>{Math.max(0, windowState.minutes_until_open)} min</div><div style={{color:'#cbd5e1'}}>Current time {clock(windowState.current_time)}</div></section>
      <section style={{marginTop:20}}><h3>Delivery requirements</h3><div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{(stop.requirements.length ? stop.requirements : ['No special requirements']).map(x=><span key={x} style={{padding:'8px 12px',borderRadius:999,background:'#eff6ff',color:'#2563eb',fontWeight:700,fontSize:12}}>{x}</span>)}</div>{stop.access_note && <p style={{color:'#64748b'}}>{stop.access_note}</p>}</section>
      <button type="button" onClick={onOpenCantDeliver} style={{marginTop:24,width:'100%',padding:14,borderRadius:14,border:'1px solid #f59e0b',background:'#fffbeb',color:'#b45309',fontWeight:800}}>Can’t Deliver? Report Issue</button>
    </>}
  </div>;
};
