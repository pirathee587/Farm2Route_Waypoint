import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { ActiveTrip } from '@/entities/tracking/trackingTypes';

interface Props { trip?: ActiveTrip; trips?: ActiveTrip[]; isLargeView?: boolean; height?: number; }
type Position = { lat:number; lng:number };

export const LiveOperationsMapCanvas: React.FC<Props> = ({trip,trips=[],isLargeView=false,height:customHeight}) => {
  const container=useRef<HTMLDivElement|null>(null);
  const map=useRef<mapboxgl.Map|null>(null);
  const markers=useRef<mapboxgl.Marker[]>([]);
  const [location,setLocation]=useState<Position|null>(null);
  const [locationError,setLocationError]=useState('');
  const token=(import.meta.env.VITE_MAPBOX_TOKEN||'').trim();

  useEffect(()=>{
    if(!navigator.geolocation)return setLocationError('Browser location is not supported.');
    const watch=navigator.geolocation.watchPosition(
      p=>{setLocation({lat:p.coords.latitude,lng:p.coords.longitude});setLocationError('');},
      ()=>setLocationError('Allow location permission to show your position.'),
      {enableHighAccuracy:true,maximumAge:15000,timeout:15000},
    );
    return()=>navigator.geolocation.clearWatch(watch);
  },[]);

  useEffect(()=>{
    if(!container.current||!token)return;
    mapboxgl.accessToken=token;
    const first=trip?.stops.find(s=>Number.isFinite(s.lat)&&Number.isFinite(s.lng));
    const center:mapboxgl.LngLatLike=location?[location.lng,location.lat]:first?[first.lng!,first.lat!]:[79.8612,6.9271];
    const instance=new mapboxgl.Map({container:container.current,style:'mapbox://styles/mapbox/streets-v12',center,zoom:11});
    instance.addControl(new mapboxgl.NavigationControl(),'top-right');
    instance.addControl(new mapboxgl.GeolocateControl({positionOptions:{enableHighAccuracy:true},trackUserLocation:true,showUserHeading:true}),'top-right');
    map.current=instance;
    return()=>{markers.current.forEach(m=>m.remove());markers.current=[];instance.remove();map.current=null;};
  },[token]);

  useEffect(()=>{
    const instance=map.current;if(!instance||!trip)return;
    markers.current.forEach(m=>m.remove());markers.current=[];
    const points:[number,number][]=[];
    if(location){
      const el=document.createElement('div');el.style.cssText='width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 0 0 5px rgba(37,99,235,.2)';
      markers.current.push(new mapboxgl.Marker({element:el}).setLngLat([location.lng,location.lat]).setPopup(new mapboxgl.Popup().setText('Your current location')).addTo(instance));points.push([location.lng,location.lat]);
    }
    trip.stops.forEach(stop=>{if(!Number.isFinite(stop.lat)||!Number.isFinite(stop.lng))return;const color=stop.status==='DELIVERED'?'#10b981':stop.status==='NEXT'?'#f59e0b':'#64748b';const marker=new mapboxgl.Marker({color}).setLngLat([stop.lng!,stop.lat!]).setPopup(new mapboxgl.Popup().setHTML(`<strong>${stop.stopNumber}. ${stop.name}</strong><br/>${stop.status} · ${stop.timeText}`)).addTo(instance);markers.current.push(marker);points.push([stop.lng!,stop.lat!]);});
    if(!isLargeView){
      trips.filter(t=>t.id!==trip.id).slice(0,2).forEach(other=>{
        const target=other.stops.find(s=>s.status==='NEXT'&&Number.isFinite(s.lat)&&Number.isFinite(s.lng))||other.stops.find(s=>Number.isFinite(s.lat)&&Number.isFinite(s.lng));
        if(!target)return;
        const el=document.createElement('div');
        el.style.cssText='min-width:44px;height:28px;padding:0 7px;border-radius:14px;background:#0f172a;color:white;border:2px solid white;box-shadow:0 2px 8px #0005;display:grid;place-items:center;font:700 10px system-ui';
        el.textContent=other.vehicleId;
        markers.current.push(new mapboxgl.Marker({element:el}).setLngLat([target.lng!,target.lat!]).setPopup(new mapboxgl.Popup().setHTML(`<strong>${other.vehicleId}</strong><br/>${other.tripCode}<br/>Heading to ${target.name}`)).addTo(instance));
        points.push([target.lng!,target.lat!]);
      });
    }
    const renderRoute=()=>{const data={type:'Feature' as const,properties:{},geometry:{type:'LineString' as const,coordinates:points}};const source=instance.getSource('tracking-route') as mapboxgl.GeoJSONSource|undefined;if(source)source.setData(data);else if(points.length>1){instance.addSource('tracking-route',{type:'geojson',data});instance.addLayer({id:'tracking-route-line',type:'line',source:'tracking-route',paint:{'line-color':'#f59e0b','line-width':5,'line-opacity':.85}});}};
    if(instance.loaded())renderRoute();else instance.once('load',renderRoute);
    if(points.length){const bounds=new mapboxgl.LngLatBounds();points.forEach(p=>bounds.extend(p));points.length===1?instance.flyTo({center:points[0],zoom:13}):instance.fitBounds(bounds,{padding:55,maxZoom:14});}
  },[trip,trips,location,isLargeView]);

  const height=customHeight??(isLargeView?560:340);
  if(!token)return <div style={{height,display:'grid',placeItems:'center',padding:24,textAlign:'center',color:'#92400e',background:'#fffbeb',borderRadius:16}}>Mapbox token is not configured. Add VITE_MAPBOX_TOKEN to the project .env and rebuild the frontend.</div>;
  return <div style={{position:'relative'}}><div ref={container} style={{height,borderRadius:16,overflow:'hidden',border:'1px solid #e2e8f0'}}/>{locationError&&<div style={{position:'absolute',left:12,bottom:12,zIndex:2,padding:'8px 10px',background:'#fff',borderRadius:8,fontSize:11,color:'#b45309',boxShadow:'0 2px 8px #0002'}}>{locationError}</div>}</div>;
};
