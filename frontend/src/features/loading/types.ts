export type TripStatus = 'Loading' | 'Ready' | 'Not Started' | 'Issue';

export interface Trip {
  id: string;
  vehicleId: string;
  weightLoaded: number;
  weightCapacity: number;
  origin: string;
  destination: string;
  stopsCount: number;
  dock: string;
  driver: string;
  status: TripStatus;
  progressPercent: number;
}

export interface ShiftInfo {
  shiftName: string;
  shiftHours: string;
  warehouseName: string;
  dateStr: string;
}

export interface SummaryMetricItem {
  id: string;
  title: string;
  count: number;
  subtext: string;
  iconType: 'truck' | 'check' | 'progress' | 'pending';
}

export interface TodayLoadsResponse { meta:{shift:string;shiftStart:string;shiftEnd:string;depot:string;date:string}; summary:{tripsToday:number;addedThisShift:number;loaded:number;inProgress:number;pending:number;issuesNeedReview:number}; trips:Array<{tripId:string;vehicleId:string;status:TripStatus;progressPct:number;loadedKg:number;capacityKg:number;origin:string;destination:string;stopCount:number;dock:string;driverName:string}> }
export interface FilterOptions { docks:string[];statuses:string[] }
export interface LoadStop { stopId:string;loadOrder:number;stopNo:number;dropLabel:string|null;outlet:string;area:string;dockNote:string;itemsRemaining:number;lineItems:number;units:number;crates:number;weightKg:number;tags:string[];status:string;nextAction:string;changeFlag?:string|null }
export interface TripDetail { header:{tripCode:string;origin:string;destination:string;status:string};vehicle:{vehicleId:string;capacityKg:number;loadedKg:number;loadPct:number;reeferZone?:{targetTempC:number;currentTempC:number;status:string}|null};driver:{name:string};dock:string;plannedStart:string;shift:string;totals:{stops:number;lineItems:number;itemsChecked:number;itemsTotal:number;exceptions:number};planBanner?:any;stops:LoadStop[] }
declare global { interface String { replaceAll(search:string,replacement:string):string } }
export interface StopItems {header:{loadOrder:number;stopNo:number;dropLabel:string|null;outlet:string;area:string;dockNote:string;vehicleId:string;lineItems:number};items:Array<{itemId:string;name:string;sku:string;tags:string[];qty:number;unit:string;status:string;checked:boolean}>;progress:{checked:number;total:number;pct:number;label:string};canConfirm:boolean;blockReason:string|null}
export interface ShortfallContext {items:Array<{itemId:string;name:string;sku:string;expectedQty:number;unit:string}>;context:{tripCode:string;vehicleId:string;dock:string;stopNo:number;reportedBy:string}}
export interface ShortfallResponse {ref:string;sentAt:string;dispatcherNotified:boolean;affectedItem:{name:string;sku:string;expected:number;loaded:number;delta:number};checklistUnlocked:boolean;manifestImpact:{stopQtyFrom:number;stopQtyTo:number;weightDeltaKg:number;capacityWithinLimit:boolean}}
export interface ShortfallDetail {issueId:string;tripId:string;orderId?:string;stopId?:string;itemId?:string;ref:string;issueType:string;qtyAffected:number;reason:string;description:string;evidenceUrl?:string;weightDeltaKg:number;dispatcherNotifiedAt:string;resolved:boolean;flaggedBy:string;resolvedAt?:string;resolutionNotes?:string}
export interface Departure {activityLog:Array<{time:string;type:string;title:string;description:string}>;loadSummary:{itemsLoaded:number;itemsTotal:number;stopsComplete:number;stopsTotal:number;issuesFlagged:number};shortfalls:Array<{item:string;reason:string;qty:number;ref:string;notified:boolean}>;confirmation:{serverTimestamp:string;allChecksPassed:boolean;blockers:string[]};status:string}
export interface MarkReadyResponse {tripCode:string;vehicleId:string;readyAt:string;readyBy:string;itemsLoaded:number;itemsTotal:number;issuesFlagged:number;driverNotified:boolean}
export interface ApiProblem {status:number;code:string;message:string;details?:unknown}
