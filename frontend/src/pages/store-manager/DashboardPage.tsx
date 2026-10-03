import { AlertTriangle, CheckCircle2, Clock3, PackageCheck, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, OrderDeferral, OrderSummary, ordersApi } from '@/shared/api/apiClient';
import './DashboardPage.css';

const statuses = [
  { key: 'PENDING', label: 'Pending', icon: Clock3, tone: 'neutral' },
  { key: 'ALLOCATED', label: 'Allocated', icon: PackageCheck, tone: 'amber' },
  { key: 'DEFERRED', label: 'Deferred', icon: AlertTriangle, tone: 'red' },
  { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle2, tone: 'green' },
] as const;

export function DashboardPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [deferrals, setDeferrals] = useState<Array<OrderDeferral & { orderId: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await ordersApi.list({ page: 0, size: 100 });
      setOrders(result.items);

      const deferredOrders = result.items.filter((order) => order.status === 'DEFERRED');
      const results = await Promise.allSettled(
        deferredOrders.map(async (order) => ({
          orderId: order.id,
          ...(await ordersApi.getDeferral(order.id)),
        })),
      );
      setDeferrals(
        results
          .filter((result): result is PromiseFulfilledResult<OrderDeferral & { orderId: string }> =>
            result.status === 'fulfilled')
          .map((result) => result.value),
      );
    } catch (requestError) {
      const message = requestError instanceof ApiError
        ? requestError.message
        : 'Unable to load your order overview.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const countFor = (status: string) => orders.filter((order) => order.status === status).length;

  return (
    <div className="dashboard-page">
      <div className="dashboard-heading">
        <div>
          <p className="dashboard-kicker">Today at a glance</p>
          <h2>Order overview</h2>
          <p className="dashboard-subtitle">Track the orders moving through your store.</p>
        </div>
        <button className="dashboard-refresh" onClick={() => void loadDashboard()} type="button">
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && <div className="dashboard-error" role="alert">{error}</div>}

      <div className="dashboard-stat-grid" aria-label="Order status summary">
        {statuses.map(({ key, label, icon: Icon, tone }) => (
          <article className={`dashboard-stat-card tone-${tone}`} key={key}>
            <div className="dashboard-stat-icon"><Icon size={18} /></div>
            <div>
              <p>{label}</p>
              <strong>{isLoading ? '—' : countFor(key)}</strong>
            </div>
          </article>
        ))}
      </div>

      <section className="dashboard-section">
        <div className="dashboard-section-heading">
          <div>
            <p className="dashboard-kicker">Needs attention</p>
            <h3>Deferral alerts</h3>
          </div>
          <span className="dashboard-count">{deferrals.length}</span>
        </div>
        {isLoading ? (
          <div className="dashboard-empty">Loading order alerts...</div>
        ) : deferrals.length === 0 ? (
          <div className="dashboard-empty dashboard-empty-success">
            <CheckCircle2 size={18} />
            No deferred orders need attention.
          </div>
        ) : (
          <div className="dashboard-alert-list">
            {deferrals.map((deferral) => (
              <button
                className="dashboard-alert"
                key={deferral.orderId}
                onClick={() => navigate(`/store-manager/orders/${deferral.orderId}/deferral`)}
                type="button"
              >
                <span className="dashboard-alert-icon"><AlertTriangle size={18} /></span>
                <span className="dashboard-alert-copy">
                  <strong>Order deferred</strong>
                  <span>{deferral.reason}</span>
                </span>
                <span className="dashboard-alert-date">
                  {deferral.revised_date ? `New date: ${deferral.revised_date}` : 'Date pending'}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}