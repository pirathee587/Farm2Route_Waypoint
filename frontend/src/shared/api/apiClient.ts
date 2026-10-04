import { authSession } from '@/features/auth/authSession';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = authSession.get();
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (session?.accessToken) {
    headers.set('Authorization', `Bearer ${session.accessToken}`);
  }
  if (session?.user) {
    headers.set('X-User-Id', session.user.id);
    headers.set('X-User-Role', session.user.role);
    headers.set('X-User-Email', session.user.email);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.message || 'Request failed');
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export interface OrderSummary {
  id: string;
  brand: string;
  order_type: string | null;
  requested_delivery_date: string;
  status: string;
  item_count: number;
  summary: string;
  created_at: string;
}

export interface OrderDetails extends OrderSummary {
  outlet_id: string;
  created_by_user_id: string;
  updated_at: string;
  items: Array<{ id: string; item_name: string; quantity: number; unit: string }>;
}

export interface OrderTimelineEntry {
  event: string;
  status: string;
  occurred_at: string;
  note: string | null;
}

export interface OrderIssue {
  id: string;
  order_id: string;
  issue_type: string;
  description: string;
  photo_url: string | null;
  reported_at: string;
}

export interface DeliveryTracking {
  id: string;
  status: 'allocated' | 'loaded' | 'out_for_delivery' | 'delivery_attempted' | 'completed';
  eta: string | null;
  is_delayed: boolean;
  source_note: string | null;
  updated_at: string;
}

export interface PagedOrdersResponse {
  items: OrderSummary[];
  page: number;
  size: number;
  total_elements: number;
  total_pages: number;
}

export interface OrderDeferral {
  id: string;
  reason: string;
  original_date: string;
  revised_date: string | null;
  is_repeat_deferral: boolean;
  created_at: string;
}

export interface CreateOrderRequest {
  brand: 'fresh' | 'style' | 'tech';
  order_type: 'dry' | 'chilled' | null;
  requested_delivery_date: string;
  items: Array<{ item_name: string; quantity: number; unit: string }>;
}

export interface CreatedOrder {
  id: string;
  status: string;
  requested_delivery_date: string;
}

export interface CreateReceiptRequest {
  confirmed_by: string;
  has_discrepancy: boolean;
}

export interface CreateIssueRequest {
  issue_type: 'missing' | 'damaged' | 'wrong_item' | 'late';
  description: string;
  photo_url: string | null;
}

export const ordersApi = {
  list(params: { status?: string; search?: string; page?: number; size?: number } = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') query.set(key, String(value));
    });
    return apiRequest<PagedOrdersResponse>(`/orders?${query.toString()}`);
  },

  getDeferral(orderId: string) {
    return apiRequest<OrderDeferral>(`/orders/${orderId}/deferral`);
  },

  get(orderId: string) {
    return apiRequest<OrderDetails>(`/orders/${orderId}`);
  },

  getTimeline(orderId: string) {
    return apiRequest<OrderTimelineEntry[]>(`/orders/${orderId}/timeline`);
  },

  getIssues(orderId: string) {
    return apiRequest<OrderIssue[]>(`/orders/${orderId}/issues`);
  },

  getTracking(orderId: string) {
    return apiRequest<DeliveryTracking>(`/orders/${orderId}/tracking`);
  },

  create(request: CreateOrderRequest) {
    return apiRequest<CreatedOrder>('/orders', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  createReceipt(orderId: string, request: CreateReceiptRequest) {
    return apiRequest(`/orders/${orderId}/receipt`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  createIssue(orderId: string, request: CreateIssueRequest) {
    return apiRequest<OrderIssue>(`/orders/${orderId}/issues`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },
};