import type { OrderDetails, OrdersQueueData, QueueOrder } from '@/entities/order/orderTypes';

export const mockOrdersData: QueueOrder[] = [
  {
    id: 'ORD-0925-014',
    receivedAt: 'Received 5 min ago',
    isNew: true,
    outletName: 'Waypoint Fresh — Colombo 07',
    routeArea: 'Peliyagoda - Colombo',
    brand: 'Fresh',
    deliveryWindow: '05:30 - 07:30',
    timeSensitive: false,
    temperature: 'Chilled',
    weightKg: 820,
    volumeM3: 7.8,
    status: 'Unplanned',
    constraint: 'Reefer Required',
  },
  {
    id: 'ORD-0925-018',
    receivedAt: 'Received 12 min ago',
    isNew: true,
    outletName: 'Waypoint Style — Gampaha',
    routeArea: 'Peliyagoda - Gampaha',
    brand: 'Style',
    deliveryWindow: '08:00 - 12:00',
    timeSensitive: false,
    temperature: 'Ambient',
    weightKg: 540,
    volumeM3: 5.2,
    status: 'Unplanned',
    constraint: 'Valid',
  },
  {
    id: 'ORD-0925-027',
    receivedAt: '',
    isNew: false,
    outletName: 'Waypoint Fresh — Nugegoda',
    routeArea: 'Peliyagoda - Colombo',
    brand: 'Fresh',
    deliveryWindow: 'Before 08:00',
    timeSensitive: true,
    temperature: 'Chilled',
    weightKg: 600,
    volumeM3: 6.4,
    status: 'Unplanned',
    constraint: 'Tight Window',
  },
  {
    id: 'ORD-0925-042',
    receivedAt: '',
    isNew: false,
    outletName: 'Waypoint Style — Wattala',
    routeArea: 'Peliyagoda - Gampaha',
    brand: 'Style',
    deliveryWindow: '11:00 - 14:00',
    timeSensitive: false,
    temperature: 'Ambient',
    weightKg: 430,
    volumeM3: 4.7,
    status: 'Unplanned',
    constraint: 'Van Only',
  },
  {
    id: 'ORD-0925-031',
    receivedAt: '',
    isNew: false,
    outletName: 'Waypoint Tech — Kandy',
    routeArea: 'Kandy - Kandy',
    brand: 'Tech',
    deliveryWindow: '10:00 - 14:00',
    timeSensitive: false,
    temperature: 'Ambient',
    weightKg: 780,
    volumeM3: 8.1,
    status: 'Planned',
    constraint: 'Valid',
  },
  {
    id: 'ORD-0925-036',
    receivedAt: '',
    isNew: false,
    outletName: 'Waypoint Fresh — Gampaha',
    routeArea: 'Peliyagoda - Gampaha',
    brand: 'Fresh',
    deliveryWindow: 'Before 08:00',
    timeSensitive: true,
    temperature: 'Chilled',
    weightKg: 610,
    volumeM3: 5.9,
    status: 'Deferred',
    constraint: 'Reefer Capacity',
  },
];

// Shared in-memory development store. All Dispatcher planning screens read and
// update this store so status transitions remain coherent until APIs exist.
const persistedOrders = sessionStorage.getItem('waypoint:orders');
let developmentOrders: QueueOrder[] = persistedOrders ? JSON.parse(persistedOrders) as QueueOrder[] : mockOrdersData.map(order => ({ ...order }));

function persistDevelopmentOrders(): void {
  sessionStorage.setItem('waypoint:orders', JSON.stringify(developmentOrders));
}

export function getDevelopmentOrders(): QueueOrder[] {
  return developmentOrders.map(order => ({ ...order }));
}

export function updateDevelopmentOrderStatus(orderId: string, status: QueueOrder['status']): QueueOrder | null {
  const existing = developmentOrders.find(order => order.id === orderId);
  if (!existing) return null;
  developmentOrders = developmentOrders.map(order => order.id === orderId ? { ...order, status } : order);
  persistDevelopmentOrders();
  return { ...existing, status };
}

export function upsertDevelopmentOrder(order: QueueOrder): void {
  const exists = developmentOrders.some(item => item.id === order.id);
  developmentOrders = exists
    ? developmentOrders.map(item => item.id === order.id ? { ...item, ...order } : item)
    : [...developmentOrders, { ...order }];
  persistDevelopmentOrders();
}

export const mockOrdersQueueSummary = {
  totalOrders: 56,
  fresh: 22,
  style: 18,
  tech: 16,
  unplanned: 12,
  deferred: 8,
};

export async function fetchOrdersQueueData(): Promise<OrdersQueueData> {
  try {
    const response = await fetch('/api/orders/queue', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.warn('[OrdersAPI] Backend unavailable, using mock data.');
      return { summary: mockOrdersQueueSummary, orders: getDevelopmentOrders() };
    }

    const apiData = await response.json();
    return apiData;
  } catch {
    console.warn('[OrdersAPI] Fetch failed, using mock data.');
    return { summary: mockOrdersQueueSummary, orders: getDevelopmentOrders() };
  }
}

export async function fetchOrderDetails(orderId: string): Promise<OrderDetails | null> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const baseOrder = developmentOrders.find(o => o.id === orderId);
  if (!baseOrder) return null;
  
  return {
    ...baseOrder,
    depot: 'Peliyagoda',
    district: 'Colombo',
    accessRestriction: 'Standard truck access',
    items: [
      { name: 'Fresh Milk 1L', temperature: 'Chilled', qty: 120, weightKg: 410, volumeM3: 3.4 },
      { name: 'Yoghurt Cartons', temperature: 'Chilled', qty: 180, weightKg: 250, volumeM3: 2.2 },
      { name: 'Cheese Packs', temperature: 'Chilled', qty: 125, weightKg: 160, volumeM3: 2.2 },
    ]
  };
}
