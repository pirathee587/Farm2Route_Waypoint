import React, { useEffect, useState } from 'react';
import { fetchLiveTrackingData } from '@/features/delivery-tracking/liveTrackingApi';
import type { ActiveTrip } from '@/entities/tracking/trackingTypes';
import { LiveOperationsMapCanvas } from '@/pages/tracking/components/LiveOperationsMapCanvas';

export const DashboardLiveOperationsPanel:React.FC=()=>{
  const [trips,setTrips]=useState<ActiveTrip[]>([]);
  const [error,setError]=useState('');
  useEffect(()=>{let active=true;fetchLiveTrackingData().then(data=>{if(active)setTrips(data.trips);}).catch(()=>{if(active)setError('Map data unavailable');});return()=>{active=false;};},[]);
  return <section style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,overflow:'hidden'}}>
    <div style={{padding:'16px 18px 12px'}}><h2 style={{fontSize:14,fontWeight:700,color:'#1e293b',margin:0}}>Live Operations</h2><p style={{fontSize:11,color:'#94a3b8',margin:'2px 0 0'}}>Real fleet overview · {Math.min(3,trips.length)} vehicles shown</p></div>
    <div style={{margin:'0 14px 14px'}}>{trips[0]?<LiveOperationsMapCanvas trip={trips[0]} trips={trips} height={180}/>:<div style={{height:180,display:'grid',placeItems:'center',background:'#f8fafc',borderRadius:8,color:'#64748b',fontSize:12}}>{error||'Loading live map…'}</div>}</div>
  </section>;
};
