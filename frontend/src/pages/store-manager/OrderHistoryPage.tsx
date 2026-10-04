import { AlertCircle, CalendarDays, ChevronRight, FileText, Package, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ApiError, OrderDetails, OrderIssue, OrderSummary, OrderTimelineEntry, ordersApi } from '@/shared/api/apiClient';
import { IssueReportModal } from './IssueReportModal';
import './OrderHistoryPage.css';

type DetailTab = 'timeline' | 'items' | 'notes';

const formatDate = (value: string | null) => {
  if (!value) return 'Not scheduled';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Not scheduled';
  return new Intl.DateTimeFormat('en', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(date);
};

const formatDateTime = (value: string) => new Intl.DateTimeFormat('en', {
  day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
}).format(new Date(value));

export function OrderHistoryPage() {
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || undefined;
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
  const [timeline, setTimeline] = useState<OrderTimelineEntry[]>([]);
  const [issues, setIssues] = useState<OrderIssue[]>([]);
  const [tab, setTab] = useState<DetailTab>('timeline');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    void ordersApi.list({ status: statusFilter, page: 0, size: 100 })
      .then((result) => {
        setOrders(result.items);
        setSelectedId((current) => current || result.items[0]?.id || null);
      })
      .catch((requestError) => setError(
        requestError instanceof ApiError ? requestError.message : 'Unable to load order history.',
      ))
      .finally(() => setIsLoading(false));
  }, [statusFilter]);

  useEffect(() => {
    if (!selectedId) return;
    setIsDetailLoading(true);
    setTab('timeline');
    Promise.all([
      ordersApi.get(selectedId),
      ordersApi.getTimeline(selectedId),
      ordersApi.getIssues(selectedId),
    ])
      .then(([order, orderTimeline, orderIssues]) => {
        setSelectedOrder(order);
        setTimeline(orderTimeline);
        setIssues(orderIssues);
      })
      .catch((requestError) => setError(
        requestError instanceof ApiError ? requestError.message : 'Unable to load order details.',
      ))
      .finally(() => setIsDetailLoading(false));
  }, [selectedId]);

  const refreshIssues = () => {
    if (!selectedId) return;
    void ordersApi.getIssues(selectedId).then(setIssues);
    setShowIssueModal(false);
    setToast('Issue reported successfully.');
    window.setTimeout(() => setToast(null), 3200);
  };

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return orders;
    return orders.filter((order) =>
      order.id.toLowerCase().includes(query) || order.summary.toLowerCase().includes(query));
  }, [orders, search]);

  return (
    <div className="history-page">
      <div className="history-heading">
        <div>
          <p className="dashboard-kicker">Store orders</p>
          <h2>Order history</h2>
          <p className="dashboard-subtitle">Review your orders and delivery progress.</p>
        </div>
        <Link className="history-new-order" to="/store-manager/orders/new">Place new order</Link>
      </div>

      {error && <div className="dashboard-error" role="alert">{error}</div>}
      {toast && <div className="history-toast" role="status">{toast}</div>}
      <div className="history-workspace">
        <section className="history-list-panel" aria-label="Orders">
          <div className="history-list-toolbar">
            <div className="history-search"><Search size={16} /><input aria-label="Search orders" onChange={(event) => setSearch(event.target.value)} placeholder="Search order or item" value={search} /></div>
            <span>{filteredOrders.length} orders</span>
          </div>
          {isLoading ? <div className="history-empty">Loading order history...</div> : filteredOrders.length === 0 ? <div className="history-empty">No orders found.</div> : (
            <div className="history-list">
              {filteredOrders.map((order) => (
                <button className={`history-row${selectedId === order.id ? ' is-selected' : ''}`} key={order.id} onClick={() => setSelectedId(order.id)} type="button">
                  <span className="history-row-main"><strong>{order.summary || 'Order items'}</strong><span>{order.id.slice(0, 8)} · {formatDate(order.requested_delivery_date)}</span></span>
                  <span className={`order-status status-${order.status.toLowerCase()}`}>{order.status}</span>
                  <ChevronRight size={16} />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="history-detail-panel" aria-label="Order details">
          {!selectedId ? <div className="history-detail-empty"><Package size={26} /><p>Select an order to view details.</p></div> : isDetailLoading || !selectedOrder ? <div className="history-detail-empty">Loading details...</div> : (
            <>
              <div className="history-detail-header">
                <div><p className="dashboard-kicker">Order details</p><h3>{selectedOrder.id.slice(0, 8)}</h3><span>Requested for {formatDate(selectedOrder.requested_delivery_date)}</span></div>
                <button aria-label="Close detail panel" className="history-close" onClick={() => setSelectedId(null)} type="button"><X size={18} /></button>
              </div>
              <div className="history-detail-meta"><span className={`order-status status-${selectedOrder.status.toLowerCase()}`}>{selectedOrder.status}</span><span>{selectedOrder.brand}{selectedOrder.order_type ? ` · ${selectedOrder.order_type}` : ''}</span></div>
              <div className="history-tabs" role="tablist">
                {(['timeline', 'items', 'notes'] as DetailTab[]).map((key) => <button aria-selected={tab === key} className={tab === key ? 'is-active' : ''} key={key} onClick={() => setTab(key)} role="tab" type="button">{key[0].toUpperCase() + key.slice(1)}</button>)}
              </div>
              {tab === 'timeline' && <TimelineTab entries={timeline} />}
              {tab === 'items' && <ItemsTab order={selectedOrder} />}
              {tab === 'notes' && <NotesTab issues={issues} onReport={() => setShowIssueModal(true)} />}
            </>
          )}
        </section>
      </div>
      {showIssueModal && selectedId && <IssueReportModal onClose={() => setShowIssueModal(false)} onSuccess={refreshIssues} orderId={selectedId} />}
    </div>
  );
}

function TimelineTab({ entries }: { entries: OrderTimelineEntry[] }) {
  return <div className="timeline-list">{entries.length === 0 ? <div className="history-empty">No timeline events yet.</div> : entries.map((entry, index) => <div className="timeline-entry" key={`${entry.event}-${entry.occurred_at}-${index}`}><span className="timeline-dot" /><div><strong>{entry.event.replace(/_/g, ' ')}</strong><span>{formatDateTime(entry.occurred_at)}</span>{entry.note && <p>{entry.note}</p>}</div></div>)}</div>;
}

function ItemsTab({ order }: { order: OrderDetails }) {
  return <div className="detail-items">{order.items.map((item) => <div className="detail-item" key={item.id}><span>{item.item_name}</span><strong>{item.quantity} {item.unit}</strong></div>)}</div>;
}

function NotesTab({ issues, onReport }: { issues: OrderIssue[]; onReport: () => void }) {
  return <div className="notes-list"><div className="notes-toolbar"><span>Notes and issue reports</span><button onClick={onReport} type="button">Report an issue</button></div>{issues.length === 0 ? <div className="history-empty"><FileText size={18} /> No notes or issue reports.</div> : issues.map((issue) => <article className="note-card" key={issue.id}><div><AlertCircle size={16} /><strong>{issue.issue_type.replace(/_/g, ' ')}</strong></div><p>{issue.description}</p><span>{formatDateTime(issue.reported_at)}</span></article>)}</div>;
}