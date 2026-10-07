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
  created_by_user_id?: string | null;
  created_at: string;
}

interface ApiPagedOrders {
  items: ApiOrderSummary[];
  total_elements: number;
}
interface ApiPlanningOrder { orderId:string; outletName:string; district?:string; depot?:string; parkingType?:string; productCode?:string; quantity?:number; weightKg?:number; volumeM3?:number; tempRequirement?:string; windowOpen?:string; windowClose?:string; }

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
  productSummary: order.summary || undefined,
  quantity: order.item_count,
});

export async function fetchOrdersQueueData(): Promise<OrdersQueueData> {
  const page = await apiRequest<ApiPagedOrders>('/orders?status=CONFIRMED&page=0&size=100');
  // Legacy planning/demo rows have no Store Manager creator. Keep the dispatcher
  // queue sourced exclusively from orders submitted through the Store Manager portal.
  const syntheticOrder = /\b(mock|demo|test|qa|e2e|spoof|verification)\b|^f{5,}/i;
  const storeManagerOrders = page.items.filter(order =>
    Boolean(order.created_by_user_id) &&
    !syntheticOrder.test(order.summary || '')
  );
  const baseOrders = storeManagerOrders.map(toQueueOrder);
  const details = await Promise.allSettled(storeManagerOrders.map(order => apiRequest<ApiPlanningOrder>(`/planning/orders/${encodeURIComponent(order.id)}`)));
  const orders = baseOrders.map((order,index) => {
    const result=details[index]; if(result.status!=='fulfilled')return order; const detail=result.value;
    const temperature:QueueOrder['temperature']=/frozen/i.test(detail.tempRequirement||'')?'Frozen':/chill/i.test(detail.tempRequirement||'')?'Chilled':'Ambient';
    const constraint:QueueOrder['constraint']=/van/i.test(detail.parkingType||'')?'Van Only':temperature==='Ambient'?'Valid':'Reefer Required';
    return {...order,outletName:detail.outletName||order.outletName,routeArea:[detail.depot,detail.district].filter(Boolean).join(' - ')||order.routeArea,deliveryWindow:detail.windowOpen&&detail.windowClose?`${detail.windowOpen} - ${detail.windowClose}`:'Not specified',temperature,weightKg:detail.weightKg||0,volumeM3:detail.volumeM3||0,constraint,productSummary:detail.productCode||order.productSummary,quantity:detail.quantity||0};
  });
  return {
    orders,
    summary: {
      totalOrders: orders.length,
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
