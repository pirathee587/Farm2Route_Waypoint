// ============================================================
// Order Entity — Dispatcher Orders Queue Models
// ============================================================

export type PlanningStatus = 'Unplanned' | 'Planned' | 'Deferred';
export type TemperatureRequirement = 'Ambient' | 'Chilled' | 'Frozen';
export type SpecialConstraint = 'Reefer Required' | 'Tight Window' | 'Van Only' | 'Reefer Capacity' | 'Valid';
export type Brand = 'Fresh' | 'Style' | 'Tech';

export interface QueueOrder {
  id: string;
  receivedAt: string;
  isNew: boolean;
  outletName: string;
  routeArea: string; // e.g. "Colombo 07"
  brand: Brand;
  deliveryWindow: string;
  timeSensitive: boolean;
  temperature: TemperatureRequirement;
  weightKg: number;
  volumeM3: number;
  status: PlanningStatus;
  constraint: SpecialConstraint;
  productSummary?: string;
  quantity?: number;
}

export interface OrderItem {
  name: string;
  temperature: TemperatureRequirement;
  qty: number;
  weightKg: number;
  volumeM3: number;
}

export interface OrderDetails extends QueueOrder {
  depot: string;
  district: string;
  accessRestriction: string;
  items: OrderItem[];
}

export interface OrdersQueueSummary {
  totalOrders: number;
  fresh: number;
  style: number;
  tech: number;
  unplanned: number;
  deferred: number;
}

export interface OrdersQueueData {
  summary: OrdersQueueSummary;
  orders: QueueOrder[];
}
