import { Check, ClipboardCheck, ExternalLink, Package, Send } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, OrderDetails, OrderSummary, ordersApi } from '@/shared/api/apiClient';
import './ReceivingPage.css';

export function ReceivingPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [selected, setSelected] = useState<OrderDetails | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [confirmedBy, setConfirmedBy] = useState('');
  const [hasDiscrepancy, setHasDiscrepancy] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void ordersApi.list({ status: 'DELIVERED', page: 0, size: 100 })
      .then((result) => setOrders(result.items))
      .catch((requestError) => setError(requestError instanceof ApiError ? requestError.message : 'Unable to load delivered orders.'))
      .finally(() => setIsLoading(false));
  }, []);

  const selectOrder = async (order: OrderSummary) => {
    setMessage(null);
    setError(null);
    setSelected(await ordersApi.get(order.id));
    setChecked({});
  };

  const goToReceiptPage = (orderId: string) => {
    navigate(`/store-manager/orders/${orderId}/receipt`);
  };

  const submitReceipt = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    goToReceiptPage(selected.id);
  };

  return (
    <div className="receiving-page">
      <div className="receiving-heading"><div><p className="dashboard-kicker">Store operations</p><h2>Receiving</h2><p className="dashboard-subtitle">Check delivered items before confirming receipt.</p></div><span className="receiving-count">{orders.length} delivered</span></div>
      {error && <div className="dashboard-error" role="alert">{error}</div>}
      {message && <div className="receiving-success" role="status"><Check size={17} /> {message}</div>}
      <div className="receiving-workspace">
        <section className="receiving-orders"><div className="receiving-section-title"><Package size={17} /><strong>Delivered orders</strong></div>{isLoading ? <div className="receiving-empty">Loading delivered orders...</div> : orders.length === 0 ? <div className="receiving-empty">No delivered orders are waiting for receipt confirmation.</div> : orders.map((order) => <button className={`receiving-order${selected?.id === order.id ? ' is-selected' : ''}`} key={order.id} onClick={() => void selectOrder(order)} type="button"><span><strong>{order.summary || 'Order items'}</strong><small>{order.id.slice(0, 8)} · {order.item_count} items</small></span><span className="order-status status-delivered">DELIVERED</span></button>)}</section>
        <section className="receiving-detail">{!selected ? <div className="receiving-empty"><ClipboardCheck size={26} /><span>Select a delivered order to begin.</span></div> : <form onSubmit={submitReceipt}><div className="receiving-detail-heading"><div><p className="dashboard-kicker">Receipt checklist</p><h3>{selected.id.slice(0, 8)}</h3></div><span className="order-status status-delivered">DELIVERED</span></div><div className="checklist">{selected.items.map((item) => <label className="checklist-row" key={item.id}><input checked={checked[item.id] || false} onChange={(event) => setChecked((current) => ({ ...current, [item.id]: event.target.checked }))} type="checkbox" /><span><strong>{item.item_name}</strong><small>{item.quantity} {item.unit}</small></span></label>)}</div><label className="receiving-field"><span>Confirmed by</span><input onChange={(event) => setConfirmedBy(event.target.value)} placeholder="Name of recipient" value={confirmedBy} /></label><label className="discrepancy-toggle"><input checked={hasDiscrepancy} onChange={(event) => setHasDiscrepancy(event.target.checked)} type="checkbox" /><span>There is a discrepancy with this delivery</span></label><button className="receiving-submit" type="submit"><Send size={16} />Confirm receipt</button></form>}</section>
      </div>
    </div>
  );
}