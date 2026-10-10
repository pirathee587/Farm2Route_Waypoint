import { apiRequest } from '@/shared/api/apiClient';

export type DeliveryOutcome = 'DELIVERED' | 'PARTIAL' | 'REFUSED' | 'NOT_HOME';
export type DeliveryIssueType = 'DAMAGE' | 'ACCESS' | 'TEMPERATURE' | 'VEHICLE' | 'OTHER';

export interface DriverRunStop {
  stop_id: string; seq: number; outlet_id: string; outlet_name: string; district: string;
  window_open: string; window_close: string; status: string;
}
export interface DriverRun {
  trip_id: string; trip_code: string; trip_number: number; status: string; ready_at?: string;
  startable: boolean; total_stops: number; completed_stops: number;
  progress_percent: number; stops: DriverRunStop[];
}
export interface DriverRunSheet {
  driver: { id: string; name: string };
  vehicle: { id: string; type: string; depot: string; registration: string; display_name: string };
  trips: DriverRun[];
}
export interface DriverStopDetail {
  stop_no: number; status: string;
  outlet: { id: string; name: string; district: string };
  delivery_window: { open: string; close: string };
  access_note: string; requirements: string[];
  items: Array<{ name: string; units: number; weight_kg: number; temp_requirement: string }>;
  totals: { units: number; weight_kg: number };
  previous_skip: { reason: string; date: string } | null;
  can_arrive: boolean;
}
export interface DriverTripOutcome {
  stop_id: string; seq: number; outlet_id: string; outlet_name: string;
  outcome: 'DELIVERED' | 'PARTIAL' | 'NOT_DELIVERED'; completed_at: string;
}
export interface DriverTripSummary {
  trip_id: string; trip_number: number; vehicle_id: string; date: string; status: string;
  total_stops: number; delivered: number; not_delivered: number; partial: number;
  completion_percent: number; outcomes: DriverTripOutcome[]; more_outcomes_count: number;
  attention_records: Array<{ type: string; outlet_id: string; outlet_name: string; detail: string; sent: boolean }>;
}
export interface DriverWindowStatus {
  current_time: string; window_opens_at: string; minutes_until_open: number;
  can_mark_arrived: boolean; status: string;
}
export interface DriverNotification {
  id: string; type: string; title: string; body: string; entity_ref: string;
  payload: unknown; created_at: string; is_read: boolean;
}
export interface DriverNotifications {
  unread_count: number; pinned: DriverNotification | null; pinned_count?: number;
  items: DriverNotification[];
}
export interface DriverPOD {
  outlet: { id: string; name: string }; arrived_at: string;
  items: Array<{ item_id: string; name: string; ordered_qty: number; delivered_qty: number; status: string }>;
  all_items_delivered: boolean;
}
export interface OfflineOperation {
  operation_id: string;
  type: 'ARRIVAL' | 'DELIVERY' | 'ISSUE';
  stop_id: string;
  payload: Record<string, unknown>;
  captured_at: string;
}

const queueKey = 'waypoint.driver.delivery.sync.v1';
const operationId = () => crypto.randomUUID();
const readQueue = (): OfflineOperation[] => {
  try { return JSON.parse(localStorage.getItem(queueKey) || '[]') as OfflineOperation[]; }
  catch { return []; }
};
const writeQueue = (items: OfflineOperation[]) => localStorage.setItem(queueKey, JSON.stringify(items));

export const driverDeliveryApi = {
  today: () => apiRequest<DriverRunSheet>('/delivery/runs/today'),

  dispatcherContact: () => apiRequest<{ name: string; phone: string }>('/delivery/driver/dispatcher-contact'),
  stopDetail: (stopId: string) => apiRequest<DriverStopDetail>(`/delivery/driver/stops/${stopId}`),
  windowStatus: (stopId: string) => apiRequest<DriverWindowStatus>(`/delivery/driver/stops/${stopId}/window-status`),
  arriveStop: (stopId: string, lat?: number, lng?: number) => apiRequest<{ status: string; arrived_at: string; minutes_until_open?: number }>(`/delivery/driver/stops/${stopId}/arrive`, {
    method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify({ client_action_id: crypto.randomUUID(), arrived_at: new Date().toISOString(), lat, lng }),
  }),
  tripSummary: (tripId: string) => apiRequest<DriverTripSummary>(`/delivery/driver/trips/${tripId}/summary`),
  notifications: () => apiRequest<DriverNotifications>('/delivery/driver/notifications'),
  reviewNotification: (notificationId: string) => apiRequest(`/delivery/driver/notifications/${notificationId}/review`, { method: 'POST', body: '{}' }),
  readAllNotifications: () => apiRequest('/delivery/driver/notifications/read-all', { method: 'POST', body: '{}' }),
  pod: (stopId: string) => apiRequest<DriverPOD>(`/delivery/driver/stops/${stopId}/pod`),
  uploadPod: (stopId: string, kind: 'signature' | 'photo', image: File, receiverName: string) => {
    const body = new FormData(); body.set('image', image); body.set('receiver_name', receiverName);
    return apiRequest<{ url: string; uploaded_at: string }>(`/delivery/driver/stops/${stopId}/pod/${kind}`, { method: 'POST', body });
  },
  confirmPod: (stopId: string, input: { items: Array<{item_id:string;delivered_qty:number}>; receiver_name:string; signature_url:string; photo_url:string; note:string }) =>
    apiRequest<{ outcome: string; completed_at: string; next_stop_id?: string }>(`/delivery/driver/stops/${stopId}/confirm`, { method:'POST', body: JSON.stringify({ client_action_id: crypto.randomUUID(), ...input, shortfalls: [], completed_at: new Date().toISOString(), outcome:'DELIVERED' }) }),
  cantDeliverReasons: () => apiRequest<Array<{ code: string; label: string }>>('/delivery/driver/cant-deliver/reasons'),
  cantDeliver: (stopId: string, reason: string, note: string) => apiRequest<{ status: string; record_sent: boolean; next_stop_id?: string }>(`/delivery/driver/stops/${stopId}/cant-deliver`, {
    method: 'POST',
    body: JSON.stringify({ client_action_id: crypto.randomUUID(), reason, note, reported_at: new Date().toISOString() }),
  }),

  startTrip: (tripId: string, id = operationId()) => apiRequest(`/delivery/trips/${tripId}/start`, {
    method: 'POST', headers: { 'Idempotency-Key': id }, body: '{}',
  }),

  arrive: async (tripId: string, stopId: string, lat: number, lng: number, id = operationId()) => {
    const payload = { lat, lng, clientTime: new Date().toISOString() };
    try {
      return await apiRequest(`/delivery/trips/${tripId}/stops/${stopId}/arrive`, {
        method: 'POST', headers: { 'Idempotency-Key': id }, body: JSON.stringify(payload),
      });
    } catch (error) {
      if (navigator.onLine) throw error;
      writeQueue([...readQueue(), { operation_id: id, type: 'ARRIVAL', stop_id: stopId, payload, captured_at: payload.clientTime }]);
      return { status: 'QUEUED_OFFLINE' };
    }
  },

  complete: (tripId: string, stopId: string, input: {
    outcome: DeliveryOutcome; receivedBy?: string; items: Array<{ item_id: string; delivered_qty: number }>;
    shortfalls?: Array<{ item_id: string; qty: number; type: 'shortage' | 'damage'; note?: string }>;
    note?: string; signature?: File; photo?: File; operationId?: string;
  }) => {
    const form = new FormData();
    form.set('outcome', input.outcome); form.set('receivedBy', input.receivedBy || '');
    form.set('items', JSON.stringify(input.items)); form.set('shortfalls', JSON.stringify(input.shortfalls || []));
    form.set('note', input.note || ''); form.set('clientTime', new Date().toISOString());
    if (input.signature) form.set('signature', input.signature); if (input.photo) form.set('photo', input.photo);
    return apiRequest(`/delivery/trips/${tripId}/stops/${stopId}/complete`, {
      method: 'POST', headers: { 'Idempotency-Key': input.operationId || operationId() }, body: form,
    });
  },

  issue: (tripId: string, stopId: string, type: DeliveryIssueType, description: string, id = operationId()) =>
    apiRequest(`/delivery/trips/${tripId}/stops/${stopId}/issue`, {
      method: 'POST', headers: { 'Idempotency-Key': id },
      body: JSON.stringify({ type, description, captured_at: new Date().toISOString() }),
    }),

  syncPending: async () => {
    const queued = readQueue(); if (!queued.length || !navigator.onLine) return [];
    const response = await apiRequest<{ results: Array<{ client_action_id: string; status: string }> }>('/delivery/sync', {
      method: 'POST', body: JSON.stringify(queued),
    });
    const accepted = new Set(response.results.filter((item) => item.status === 'SYNCED' || item.status === 'DUPLICATE').map((item) => item.client_action_id));
    writeQueue(queued.filter((item) => !accepted.has(item.operation_id)));
    return response.results;
  },
};

export function installDriverAutoSync() {
  const sync = () => { void driverDeliveryApi.syncPending(); };
  window.addEventListener('online', sync); sync();
  return () => window.removeEventListener('online', sync);
}
