import React from 'react';
import { Check } from 'lucide-react';
import type { ActiveTrip } from '@/entities/tracking/trackingTypes';

export const RouteProgressWidget:React.FC<{trip:ActiveTrip}>=({trip})=>{
  const steps=[{id:'depot',name:`${trip.origin||trip.homeDepot||'Depot'} Depot`,status:trip.state==='IN_TRANSIT'||trip.state==='COMPLETED'?'DELIVERED':trip.state==='READY'?'NEXT':'UPCOMING',time:trip.tripDepartedTime?`Departed · ${trip.tripDepartedTime}`:trip.state==='READY'?'Loading complete · Ready to depart':'Departure pending'},...trip.stops];
  return <div style={{background:'#fff',borderRadius:16,padding:20,border:'1px solid #f1f5f9'}}>
    <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}><strong>Route Progress</strong><span style={{fontSize:12,color:'#2563eb'}}>{trip.completedStops}/{trip.totalStops} delivered</span></div>
    {steps.length===1&&<div style={{color:'#64748b',fontSize:13}}>No route stops are assigned to this trip yet.</div>}
    <div>{steps.map((step,index)=>{const delivered=step.status==='DELIVERED';const next=step.status==='NEXT';const label='timeText' in step?step.timeText:step.time;return <div key={step.id} style={{display:'flex',gap:14,position:'relative',paddingBottom:index===steps.length-1?0:22}}>
      {index<steps.length-1&&<span style={{position:'absolute',left:11,top:22,width:2,bottom:0,background:delivered?'#10b981':'#e2e8f0'}}/>}
      <span style={{width:24,height:24,borderRadius:'50%',display:'grid',placeItems:'center',zIndex:1,flexShrink:0,background:delivered?'#10b981':next?'#f59e0b':'#fff',border:delivered||next?'none':'2px solid #cbd5e1',color:'#fff',fontSize:11,fontWeight:700}}>{delivered?<Check size={14}/>:next?index:index||''}</span>
      <div style={{flex:1}}><div style={{fontSize:13,fontWeight:next?700:600,color:delivered?'#0f172a':next?'#92400e':'#64748b'}}>{step.name}</div><div style={{fontSize:11,color:next?'#d97706':'#94a3b8',marginTop:2}}>{label||'Pending'}{next?' · NEXT':''}</div></div>
    </div>})}</div>
  </div>;
};
