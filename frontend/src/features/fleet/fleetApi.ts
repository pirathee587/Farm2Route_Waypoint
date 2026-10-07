// ============================================================
// fleetApi.ts — Shared data source for Fleet & Reports pages
// Consistent numbers used across Fleet/Capacity + Reports pages
// ============================================================

import type {
  FleetVehicle,
  FleetSummary,
  FleetPageData,
} from '@/entities/fleet/fleetTypes';
import { apiRequest } from '@/shared/api/apiClient';

// ── Shared constants (single source of truth) ─────────────────
export const SHARED_FLEET_SUMMARY: FleetSummary = {
  totalFleet: 60,
  available: 38,
  inUse: 16,
  chilledCapable: 16,
  unavailable: 6,
  chilledAvailable: 8,
  dryBoxTotal: 40,
  dryBoxAvailable: 26,
  vanTotal: 8,
  vanAvailable: 4,
};

// ── Mock Fleet Vehicles (20 for pagination demo) ──────────────
export const MOCK_FLEET_VEHICLES: FleetVehicle[] = [
  { id: 'VEH014', registration: 'WP-CAB-4421', type: 'Reefer', typeFull: 'Refrigerated Truck', depot: 'Peliyagoda', weightCapacityKg: 4000, volumeCapacityM3: 18, isRefrigerated: true,  tripsToday: 1, maxTripsPerDay: 2, status: 'Available',    fuelPercent: 78, driverName: 'Dilan Fernando' },
  { id: 'VEH018', registration: 'WP-CAD-4456', type: 'Reefer', typeFull: 'Refrigerated Truck', depot: 'Peliyagoda', weightCapacityKg: 4200, volumeCapacityM3: 20, isRefrigerated: true,  tripsToday: 2, maxTripsPerDay: 2, status: 'In Use',       fuelPercent: 54, driverName: 'Kasun Silva' },
  { id: 'VEH021', registration: 'WP-CAD-1109', type: 'Dry Box', typeFull: 'Standard Delivery Truck', depot: 'Kandy',       weightCapacityKg: 5000, volumeCapacityM3: 22, isRefrigerated: false, tripsToday: 1, maxTripsPerDay: 2, status: 'In Use',       fuelPercent: 66, driverName: 'Nuwan Perera' },
  { id: 'VEH027', registration: 'WP-CAB-8810', type: 'Dry Box', typeFull: 'Standard Delivery Truck', depot: 'Peliyagoda', weightCapacityKg: 5000, volumeCapacityM3: 22, isRefrigerated: false, tripsToday: 0, maxTripsPerDay: 2, status: 'Available',    fuelPercent: 91, driverName: 'Saman Kumara' },
  { id: 'VEH033', registration: 'WP-MAN-3221', type: 'Van',     typeFull: 'Compact Cargo Van',       depot: 'Peliyagoda', weightCapacityKg: 1800, volumeCapacityM3: 10, isRefrigerated: false, tripsToday: 1, maxTripsPerDay: 2, status: 'Available',    fuelPercent: 63, driverName: 'Ruwan Perera' },
  { id: 'VEH041', registration: 'WP-CAB-9930', type: 'Dry Box', typeFull: 'Standard Delivery Truck', depot: 'Kandy',       weightCapacityKg: 4800, volumeCapacityM3: 18, isRefrigerated: false, tripsToday: 0, maxTripsPerDay: 2, status: 'Maintenance',  fuelPercent: 48, driverName: 'Ajith Bandara' },
  { id: 'VEH016', registration: 'WP-CAD-5589', type: 'Reefer', typeFull: 'Refrigerated Truck', depot: 'Peliyagoda', weightCapacityKg: 4000, volumeCapacityM3: 18, isRefrigerated: true,  tripsToday: 1, maxTripsPerDay: 2, status: 'In Use',       fuelPercent: 72, driverName: 'Ajith Wickramasinghe' },
  { id: 'VEH022', registration: 'WP-CAD-2234', type: 'Reefer', typeFull: 'Refrigerated Truck', depot: 'Kandy',       weightCapacityKg: 3800, volumeCapacityM3: 17, isRefrigerated: true,  tripsToday: 0, maxTripsPerDay: 2, status: 'Available',    fuelPercent: 85, driverName: 'Priyantha Senanayake' },
  { id: 'VEH028', registration: 'WP-CBA-1045', type: 'Dry Box', typeFull: 'Standard Delivery Truck', depot: 'Kandy',       weightCapacityKg: 3500, volumeCapacityM3: 15, isRefrigerated: false, tripsToday: 2, maxTripsPerDay: 2, status: 'In Use',       fuelPercent: 57, driverName: 'Mahesh Bandara' },
  { id: 'VEH035', registration: 'WP-CAB-9912', type: 'Van',     typeFull: 'Compact Cargo Van',       depot: 'Peliyagoda', weightCapacityKg: 1500, volumeCapacityM3: 8,  isRefrigerated: false, tripsToday: 2, maxTripsPerDay: 2, status: 'In Use',       fuelPercent: 44, driverName: 'Suresh Kumar' },
  { id: 'VEH044', registration: 'WP-CAD-7723', type: 'Dry Box', typeFull: 'Standard Delivery Truck', depot: 'Peliyagoda', weightCapacityKg: 4000, volumeCapacityM3: 18, isRefrigerated: false, tripsToday: 1, maxTripsPerDay: 2, status: 'Available',    fuelPercent: 70, driverName: 'Pradeep Kumara' },
  { id: 'VEH049', registration: 'WP-CAB-4491', type: 'Reefer', typeFull: 'Refrigerated Truck', depot: 'Peliyagoda', weightCapacityKg: 4500, volumeCapacityM3: 20, isRefrigerated: true,  tripsToday: 0, maxTripsPerDay: 2, status: 'Available',    fuelPercent: 88, driverName: 'Sanjaya Weerasinghe' },
  { id: 'VEH050', registration: 'WP-CAB-5501', type: 'Reefer', typeFull: 'Refrigerated Truck', depot: 'Kandy',       weightCapacityKg: 4000, volumeCapacityM3: 18, isRefrigerated: true,  tripsToday: 1, maxTripsPerDay: 2, status: 'In Use',       fuelPercent: 61, driverName: 'Chaminda Jayasena' },
  { id: 'VEH051', registration: 'WP-MAN-6612', type: 'Van',     typeFull: 'Compact Cargo Van',       depot: 'Peliyagoda', weightCapacityKg: 1800, volumeCapacityM3: 10, isRefrigerated: false, tripsToday: 0, maxTripsPerDay: 2, status: 'Available',    fuelPercent: 79, driverName: 'Tharindu Jayaweera' },
  { id: 'VEH055', registration: 'WP-CAB-8871', type: 'Dry Box', typeFull: 'Standard Delivery Truck', depot: 'Kandy',       weightCapacityKg: 5200, volumeCapacityM3: 24, isRefrigerated: false, tripsToday: 0, maxTripsPerDay: 2, status: 'Available',    fuelPercent: 93, driverName: 'Lasantha Gunawardena' },
  { id: 'VEH058', registration: 'WP-CBA-3318', type: 'Reefer', typeFull: 'Refrigerated Truck', depot: 'Peliyagoda', weightCapacityKg: 4200, volumeCapacityM3: 19, isRefrigerated: true,  tripsToday: 0, maxTripsPerDay: 2, status: 'Unavailable',  fuelPercent: 0,  driverName: '' },
  { id: 'VEH059', registration: 'WP-CAD-0093', type: 'Dry Box', typeFull: 'Standard Delivery Truck', depot: 'Peliyagoda', weightCapacityKg: 4800, volumeCapacityM3: 21, isRefrigerated: false, tripsToday: 0, maxTripsPerDay: 2, status: 'Maintenance',  fuelPercent: 30, driverName: '' },
  { id: 'VEH060', registration: 'WP-CAB-2277', type: 'Van',     typeFull: 'Compact Cargo Van',       depot: 'Kandy',       weightCapacityKg: 1500, volumeCapacityM3: 8,  isRefrigerated: false, tripsToday: 1, maxTripsPerDay: 2, status: 'Available',    fuelPercent: 68, driverName: 'Kamal Wijesinghe' },
  { id: 'VEH062', registration: 'WP-MAN-7745', type: 'Van',     typeFull: 'Compact Cargo Van',       depot: 'Peliyagoda', weightCapacityKg: 1800, volumeCapacityM3: 10, isRefrigerated: false, tripsToday: 0, maxTripsPerDay: 2, status: 'Available',    fuelPercent: 82, driverName: 'Niroshan Perera' },
  { id: 'VEH064', registration: 'WP-CBA-5509', type: 'Dry Box', typeFull: 'Standard Delivery Truck', depot: 'Kandy',       weightCapacityKg: 4600, volumeCapacityM3: 20, isRefrigerated: false, tripsToday: 2, maxTripsPerDay: 2, status: 'In Use',       fuelPercent: 52, driverName: 'Prasanna Rajapaksha' },
];

// ── API functions ──────────────────────────────────────────────
export async function fetchFleetData(): Promise<FleetPageData> {
  interface ApiVehicle { id:string;registration:string;vehicleType:string;tempCapability:string;weightCapacityKg:number;volumeCapacityM3:number;depot:string;driverId?:string;available:boolean;inUse:boolean;tripsToday:number;fuelQuota:number;fuelUsed:number; }
  const date = new Date().toISOString().slice(0,10);
  const rows = await apiRequest<ApiVehicle[]>(`/planning/fleet?date=${date}`);
  const vehicles: FleetVehicle[] = rows.map(v => {
    const refrigerated = !/ambient/i.test(v.tempCapability || '');
    const van = /van/i.test(v.vehicleType || '');
    const type: FleetVehicle['type'] = van ? 'Van' : refrigerated ? 'Reefer' : 'Dry Box';
    return { id:v.id,registration:v.registration||'',type,typeFull:van?'Cargo Van':refrigerated?'Refrigerated Truck':'Standard Delivery Truck',depot:v.depot||'',weightCapacityKg:v.weightCapacityKg||0,volumeCapacityM3:v.volumeCapacityM3||0,isRefrigerated:refrigerated,tripsToday:v.tripsToday||0,maxTripsPerDay:2,status:v.inUse?'In Use':v.available?'Available':'Unavailable',fuelPercent:v.fuelQuota>0?Math.max(0,Math.round((1-v.fuelUsed/v.fuelQuota)*100)):0,driverName:v.driverId||'' };
  });
  const summary: FleetSummary = { totalFleet:vehicles.length,available:vehicles.filter(v=>v.status==='Available').length,inUse:vehicles.filter(v=>v.status==='In Use').length,chilledCapable:vehicles.filter(v=>v.isRefrigerated).length,unavailable:vehicles.filter(v=>v.status==='Unavailable'||v.status==='Maintenance').length,chilledAvailable:vehicles.filter(v=>v.isRefrigerated&&v.status==='Available').length,dryBoxTotal:vehicles.filter(v=>v.type==='Dry Box').length,dryBoxAvailable:vehicles.filter(v=>v.type==='Dry Box'&&v.status==='Available').length,vanTotal:vehicles.filter(v=>v.type==='Van').length,vanAvailable:vehicles.filter(v=>v.type==='Van'&&v.status==='Available').length };
  return { summary,vehicles,reeferAttentionRequired:summary.chilledCapable>0&&summary.chilledAvailable<summary.chilledCapable*0.6 };
}

export interface CapacityForecastRow { weekStart:string;depot:string;brand:string;orderCount:number;totalVolumeM3:number;chilledVolumeM3:number; }
export async function fetchCapacityForecast(weeks=8):Promise<CapacityForecastRow[]> {
  const from=new Date().toISOString().slice(0,10);
  return apiRequest<CapacityForecastRow[]>(`/planning/forecast?from=${from}&weeks=${weeks}`);
}
