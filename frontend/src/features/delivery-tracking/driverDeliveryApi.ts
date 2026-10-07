import { apiRequest } from '@/shared/api/apiClient';

export type DeliveryOutcome = 'DELIVERED' | 'PARTIAL' | 'REFUSED' | 'NOT_HOME';
export type DeliveryIssueType = 'DAMAGE' | 'ACCESS' | 'TEMPERATURE' | 'VEHICLE' | 'OTHER';

export interface DriverRunStop {
  stop_id: string; seq: number; outlet_id: string; outlet_name: string; district: string;
  window_open: string; window_close: string; status: string;
}
export interface DriverRun {
  trip_id: string; trip_number: number; status: string; ready_at?: string;
  startable: boolean; total_stops: number; completed_stops: number;
  progress_percent: number; stops: DriverRunStop[];
}
export interface DriverRunSheet {
  driver: { id: string; name: string };
  vehicle: { id: string; type: string; depot: string };
  trips: DriverRun[];
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
