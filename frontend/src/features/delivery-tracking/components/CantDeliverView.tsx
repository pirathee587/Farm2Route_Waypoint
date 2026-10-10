import React, { useEffect, useState } from 'react';
import { AlertTriangle, ChevronLeft } from 'lucide-react';
import { DriverStopDetail, driverDeliveryApi } from '../driverDeliveryApi';

interface Props { stopId?: string; onBack:()=>void; onSubmitReport:(reason:string,note:string)=>void; }

export const CantDeliverView:React.FC<Props>=({stopId,onBack,onSubmitReport})=>{
  const [stop,setStop]=useState<DriverStopDetail|null>(null);
  const [reasons,setReasons]=useState<Array<{code:string;label:string}>>([]);
  const [reason,setReason]=useState('');
  const [note,setNote]=useState('');
  const [busy,setBusy]=useState(true);
  const [error,setError]=useState('');
  useEffect(()=>{if(!stopId){setError('Select a real delivery stop first.');setBusy(false);return;} let active=true;Promise.all([driverDeliveryApi.stopDetail(stopId),driverDeliveryApi.cantDeliverReasons()]).then(([detail,options])=>{if(!active)return;setStop(detail);setReasons(options);setReason(options[0]?.code||'');setError('')}).catch(e=>active&&setError(e instanceof Error?e.message:'Unable to load issue form.')).finally(()=>active&&setBusy(false));return()=>{active=false}},[stopId]);
  const submit=async()=>{if(!stopId||!reason)return;setBusy(true);try{await driverDeliveryApi.cantDeliver(stopId,reason,note);onSubmitReport(reasons.find(x=>x.code===reason)?.label||reason,note)}catch(e){setError(e instanceof Error?e.message:'Unable to report this stop.');setBusy(false)}};
  return <div className="driver-screen-content animate-fade-in" style={{paddingBottom:95}}><div className="driver-header-nav"><button type="button" className="driver-back-btn" onClick={onBack}><ChevronLeft size={22}/></button><h1 className="driver-header-title">Can’t Deliver</h1></div>{error&&<div role="alert" style={alert}>{error}</div>}{busy&&!stop&&<div style={card}>Loading real stop details…</div>}{stop&&<><section style={card}><div style={{display:'flex',gap:12,alignItems:'center'}}><span style={{width:42,height:42,borderRadius:'50%',background:'#fef3c7',display:'grid',placeItems:'center'}}><AlertTriangle size={20}/></span><div><strong style={{display:'block'}}>{stop.outlet.name}</strong><small style={{color:'#64748b'}}>{stop.outlet.id} · {stop.outlet.district}</small><small style={{display:'block',color:'#64748b'}}>{stop.delivery_window.open}–{stop.delivery_window.close}</small></div></div></section><h2 style={{fontSize:19,margin:'22px 0 4px'}}>What happened?</h2><p style={{fontSize:13,color:'#64748b',marginTop:0}}>This creates a real dispatcher-visible deferral record.</p><div style={{display:'flex',flexDirection:'column',gap:9}}>{reasons.map(item=><button type="button" key={item.code} onClick={()=>setReason(item.code)} style={{padding:'13px 14px',borderRadius:14,border:reason===item.code?'2px solid #facc15':'1px solid #e2e8f0',background:reason===item.code?'#fefce8':'#fff',textAlign:'left',fontWeight:700}}>{item.label}</button>)}</div><label style={{display:'block',fontWeight:700,marginTop:18}}>Note<textarea value={note} maxLength={500} onChange={e=>setNote(e.target.value)} placeholder="Describe what happened" style={{width:'100%',minHeight:80,boxSizing:'border-box',marginTop:7,border:'1px solid #cbd5e1',borderRadius:12,padding:11}}/></label><button type="button" disabled={busy||!reason} onClick={()=>void submit()} className="driver-btn-primary" style={{marginTop:18}}>{busy?'Reporting…':'Report to Dispatcher'}</button></>}</div>;
};
const card:React.CSSProperties={background:'#fff',border:'1px solid #e2e8f0',borderRadius:17,padding:16};
const alert:React.CSSProperties={...card,background:'#fee2e2',color:'#b91c1c',marginBottom:12};
