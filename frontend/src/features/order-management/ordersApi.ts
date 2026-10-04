import type { OrderDetails, OrdersQueueData, QueueOrder } from '@/entities/order/orderTypes';
import { apiRequest } from '@/shared/api/apiClient';

interface ApiOrderSummary {
  id: string;
  brand: string;
  order_type: string | null;
  requested_delivery_date: string;
  status: string;
  item_count: number;
  summary: string;
  created_at: string;
}

interface ApiPagedOrders {
  items: ApiOrderSummary[];
  total_elements: number;
}

const toQueueOrder = (order: ApiOrderSummary): QueueOrder => ({
  id: order.id,
  receivedAt: order.created_at ? `Received ${new Date(order.created_at).toLocaleString()}` : '',
  isNew: false,
  outletName: `Order ${order.id.slice(0, 8)}`,
  routeArea: 'Not assigned',
  brand: /style/i.test(order.brand) ? 'Style' : /tech/i.test(order.brand) ? 'Tech' : 'Fresh',
  deliveryWindow: 'Not specified',
  timeSensitive: false,
  temperature: /chill|cold/i.test(order.order_type || '') ? 'Chilled' : 'Ambient',
  weightKg: 0,
  volumeM3: 0,
  status: /defer/i.test(order.status) ? 'Deferred' : /alloc|plan/i.test(order.status) ? 'Planned' : 'Unplanned',
  constraint: 'Valid',
});

export async function fetchOrdersQueueData(): Promise<OrdersQueueData> {
  const page = await apiRequest<ApiPagedOrders>('/orders?page=0&size=100');
  const orders = page.items.map(toQueueOrder);
  return {
    orders,
    summary: {
      totalOrders: page.total_elements,
      fresh: orders.filter(order => order.brand === 'Fresh').length,
      style: orders.filter(order => order.brand === 'Style').length,
      tech: orders.filter(order => order.brand === 'Tech').length,
      unplanned: orders.filter(order => order.status === 'Unplanned').length,
      deferred: orders.filter(order => order.status === 'Deferred').length,
    },
  };
}

export async function fetchOrderDetails(orderId: string): Promise<OrderDetails | null> {
  const response = await apiRequest<{
    id: string;
    brand: string;
    order_type: string | null;
    requested_delivery_date: string;
    status: string;
    created_at: string;
    outlet_id: string;
    items: Array<{ id: string; item_name: string; quantity: number; unit: string }>;
  }>(`/orders/${encodeURIComponent(orderId)}`);
  const baseOrder = toQueueOrder({ ...response, item_count: response.items.length, summary: '' });
  return {
    ...baseOrder,
    depot: 'Not assigned',
    district: 'Not assigned',
    accessRestriction: 'Not specified',
    items: response.items.map(item => ({
      name: item.item_name,
      temperature: baseOrder.temperature,
      qty: item.quantity,
      weightKg: 0,
      volumeM3: 0,
    })),
  };
}
