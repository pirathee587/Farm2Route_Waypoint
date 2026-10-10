import type { FleetVehicle, FleetSummary, FleetPageData } from '@/entities/fleet/fleetTypes';
import { apiRequest } from '@/shared/api/apiClient';

export async function fetchFleetData(): Promise<FleetPageData> {
  interface ApiVehicle { id:string; vehicleName?:string; registration:string; vehicleType:string; tempCapability:string; weightCapacityKg:number; volumeCapacityM3:number; depot:string; driverName?:string; available:boolean; inUse:boolean; tripsToday:number; fuelQuota:number; fuelUsed:number; }
  const date = new Date().toISOString().slice(0,10);
  const rows = await apiRequest<ApiVehicle[]>(`/planning/fleet?date=${date}`);
  const vehicles: FleetVehicle[] = rows.map(v => {
    const refrigerated = !/ambient/i.test(v.tempCapability || '');
    const van = /van/i.test(v.vehicleType || '');
    const type: FleetVehicle['type'] = van ? 'Van' : refrigerated ? 'Reefer' : 'Dry Box';
    return { id:v.id, vehicleName:v.vehicleName || v.registration || v.id, registration:v.registration||'', type, typeFull:van?'Cargo Van':refrigerated?'Refrigerated Truck':'Standard Delivery Truck', depot:v.depot||'', weightCapacityKg:v.weightCapacityKg||0, volumeCapacityM3:v.volumeCapacityM3||0, isRefrigerated:refrigerated, tripsToday:v.tripsToday||0, maxTripsPerDay:2, status:v.inUse?'In Use':v.available?'Available':'Unavailable', fuelPercent:v.fuelQuota>0?Math.max(0,Math.round((1-v.fuelUsed/v.fuelQuota)*100)):0, driverName:v.driverName||'Unassigned' };
  });
  const summary: FleetSummary = { totalFleet:vehicles.length, available:vehicles.filter(v=>v.status==='Available').length, inUse:vehicles.filter(v=>v.status==='In Use').length, chilledCapable:vehicles.filter(v=>v.isRefrigerated).length, unavailable:vehicles.filter(v=>v.status==='Unavailable'||v.status==='Maintenance').length, chilledAvailable:vehicles.filter(v=>v.isRefrigerated&&v.status==='Available').length, dryBoxTotal:vehicles.filter(v=>v.type==='Dry Box').length, dryBoxAvailable:vehicles.filter(v=>v.type==='Dry Box'&&v.status==='Available').length, vanTotal:vehicles.filter(v=>v.type==='Van').length, vanAvailable:vehicles.filter(v=>v.type==='Van'&&v.status==='Available').length };
  return { summary, vehicles, reeferAttentionRequired:summary.chilledCapable>0&&summary.chilledAvailable<summary.chilledCapable*0.6 };
}

export interface CapacityForecastRow { weekStart:string; depot:string; brand:string; orderCount:number; totalVolumeM3:number; chilledVolumeM3:number; }
export async function fetchCapacityForecast(weeks=8):Promise<CapacityForecastRow[]> {
  const from=new Date().toISOString().slice(0,10);
  return apiRequest<CapacityForecastRow[]>(`/planning/forecast?from=${from}&weeks=${weeks}`);
}
