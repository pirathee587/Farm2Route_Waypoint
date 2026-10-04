import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3, PackageCheck, Warehouse } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, DeliveryTracking, OrderDetails, ordersApi } from '@/shared/api/apiClient';
import './DeliveryTrackingPage.css';

const stages = [
  { key: 'allocated', label: 'Allocated', icon: PackageCheck },
  { key: 'loaded', label: 'Loaded', icon: Warehouse },
  { key: 'out_for_delivery', label: 'Out for delivery', icon: Clock3 },
  { key: 'completed', label: 'Delivered', icon: CheckCircle2 },
] as const;

const formatDateTime = (value: string) => new Intl.DateTimeFormat('en', {
  day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
}).format(new Date(value));

export function DeliveryTrackingPage() {
  const { id = '' } = useParams();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [tracking, setTracking] = useState<DeliveryTracking | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void ordersApi.get(id)
      .then(async (loadedOrder) => {
        if (!active) return;
        setOrder(loadedOrder);
        try {
          setTracking(await ordersApi.getTracking(id));
        } catch (requestError) {
          if (!(requestError instanceof ApiError && requestError.status === 404)) throw requestError;
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof ApiError ? requestError.message : 'Unable to load delivery tracking.');
      });
    return () => { active = false; };
  }, [id]);

  if (error) return <div className="tracking-error" role="alert">{error}</div>;
  if (!order) return <div className="tracking-loading">Loading delivery tracking...</div>;

  const effectiveStatus = order.status === 'DELIVERED' ? 'completed' : tracking?.status;
  const activeIndex = Math.max(0, stages.findIndex((stage) => stage.key === effectiveStatus));
  const delivered = order.status === 'DELIVERED';

  return (
    <div className="tracking-page">
      <Link className="tracking-back" to="/store-manager/orders"><ArrowLeft size={16} /> Back to orders</Link>
      <div className="tracking-heading"><div><p className="dashboard-kicker">Delivery tracking</p><h2>Order {id.slice(0, 8)}</h2><p>Live progress for your store order.</p></div><span className={`order-status status-${order.status.toLowerCase()}`}>{order.status}</span></div>
      {tracking?.is_delayed && <div className="tracking-delay"><AlertTriangle size={19} /><div><strong>Delivery delayed</strong><span>{tracking.source_note || 'The delivery plan has been delayed. We will update the tracking status when it moves again.'}</span></div></div>}
      <section className="tracking-card">
        <div className="tracking-card-heading"><div><p className="dashboard-kicker">Progress</p><h3>{delivered ? 'Delivered to your store' : tracking ? stages.find((stage) => stage.key === effectiveStatus)?.label : 'Waiting for dispatch plan'}</h3></div>{tracking?.updated_at && <span>Updated {formatDateTime(tracking.updated_at)}</span>}</div>
        <div className="tracking-progress" aria-label="Delivery progress">
          {stages.map(({ key, label, icon: Icon }, index) => <div className={`tracking-stage${index <= activeIndex ? ' is-complete' : ''}${key === effectiveStatus ? ' is-current' : ''}`} key={key}><div className="tracking-stage-icon"><Icon size={18} /></div><span>{label}</span>{index < stages.length - 1 && <i />}</div>)}
        </div>
        {tracking?.eta && !delivered && <p className="tracking-eta">Estimated arrival: <strong>{formatDateTime(tracking.eta)}</strong></p>}
      </section>
      <section className="tracking-order-card"><div><p className="dashboard-kicker">Order summary</p><h3>{order.summary || `${order.items.length} items`}</h3><span>{order.brand}{order.order_type ? ` · ${order.order_type}` : ''}</span></div>{delivered && <Link className="tracking-receive" to="/store-manager/receiving">Proceed to Receiving <Warehouse size={16} /></Link>}</section>
    </div>
  );
}