import { apiRequest } from '@/shared/api/apiClient';
import { webSocketUrl } from '@/shared/api/apiBase';

/** Short-lived upgrade credential; never send the access JWT in a URL. */
export async function connectNotifications(): Promise<WebSocket> {
  const { ticket } = await apiRequest<{ ticket: string }>('/notify/ws-ticket', { method: 'POST' });
  return new WebSocket(webSocketUrl('/notify/ws'), ['waypoint', `waypoint.ticket.${ticket}`]);
}
