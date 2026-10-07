import { AlertCircle, ArrowLeft, Check, CheckCircle2, ClipboardCheck, Send } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, OrderDetails, ordersApi } from '@/shared/api/apiClient';
import { IssueReportModal } from './IssueReportModal';
import './ReceiptConfirmationPage.css';

type PageState = 'loading' | 'ready' | 'submitted' | 'error';

export function ReceiptConfirmationPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [pageState, setPageState] = useState<PageState>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);

  // Checklist state: item id → checked
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});
  const [confirmedBy, setConfirmedBy] = useState('');
  const [hasDiscrepancy, setHasDiscrepancy] = useState(false);

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Issue modal
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issuesToast, setIssuesToast] = useState<string | null>(null);

  useEffect(() => {
    setPageState('loading');
    void ordersApi
      .get(id)
      .then((loaded) => {
        setOrder(loaded);
        setReceivedQuantities(Object.fromEntries(loaded.items.map((item) => [item.id, item.quantity])));
        setChecked(Object.fromEntries(loaded.items.map((item) => [item.id, true])));
        setPageState('ready');
      })
      .catch((err) => {
        setLoadError(err instanceof ApiError ? err.message : 'Unable to load order details.');
        setPageState('error');
      });
  }, [id]);

  const allChecked =
    order !== null &&
    order.items.length > 0 &&
    order.items.every((item) => checked[item.id]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!order) return;
    if (!confirmedBy.trim()) {
      setSubmitError('Enter the name of the person confirming receipt.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await ordersApi.createReceipt(id, {
        confirmed_by: confirmedBy.trim(),
        has_discrepancy: hasDiscrepancy,
        items: order.items.map((item) => ({
          order_item_id: item.id,
          received_qty: receivedQuantities[item.id] ?? 0,
        })),
      });
      setPageState('submitted');
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : 'Unable to confirm receipt. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const onIssueSuccess = () => {
    setShowIssueModal(false);
    setIssuesToast('Issue reported successfully.');
    window.setTimeout(() => setIssuesToast(null), 3200);
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <div className="receipt-page">
        <div className="receipt-loading">Loading order details…</div>
      </div>
    );
  }

  // ── Load error ───────────────────────────────────────────────────────────
  if (pageState === 'error' || order === null) {
    return (
      <div className="receipt-page">
        <Link className="receipt-back" to="/store-manager/receiving">
          <ArrowLeft size={16} /> Back to Receiving
        </Link>
        <div className="receipt-load-error" role="alert">
          {loadError ?? 'Order not found.'}
        </div>
      </div>
    );
  }

  // ── Success state ────────────────────────────────────────────────────────
  if (pageState === 'submitted') {
    return (
      <div className="receipt-page">
        <Link className="receipt-back" to="/store-manager/receiving">
          <ArrowLeft size={16} /> Back to Receiving
        </Link>
        <div className="receipt-success-card">
          <div className="receipt-success-icon">
            <CheckCircle2 size={34} />
          </div>
          <p className="dashboard-kicker">Receipt confirmed</p>
          <h2>Delivery received</h2>
          <p>
            Receipt has been recorded for order{' '}
            <span className="receipt-order-id">{id.slice(0, 8)}</span>.
            {hasDiscrepancy && (
              <strong className="receipt-discrepancy-note">
                {' '}A discrepancy was logged — the dispatch team has been notified.
              </strong>
            )}
          </p>
          <div className="receipt-success-actions">
            <Link className="receipt-btn-primary" to="/store-manager/receiving">
              Back to Receiving
            </Link>
            <Link className="receipt-btn-ghost" to="/store-manager">
              Go to Dashboard
            </Link>
          </div>
        </div>
        {showIssueModal && (
          <IssueReportModal orderId={id} onClose={() => setShowIssueModal(false)} onSuccess={onIssueSuccess} />
        )}
      </div>
    );
  }

  // ── Main receipt confirmation form ───────────────────────────────────────
  return (
    <div className="receipt-page">
      <Link className="receipt-back" to="/store-manager/receiving">
        <ArrowLeft size={16} /> Back to Receiving
      </Link>

      <div className="receipt-heading">
        <div>
          <p className="dashboard-kicker">Receipt confirmation</p>
          <h2>Confirm delivery</h2>
          <p className="receipt-subtitle">
            Check each item against what was delivered, then confirm receipt.
          </p>
        </div>
        <span className="order-status status-delivered">DELIVERED</span>
      </div>

      {issuesToast && (
        <div className="receipt-toast" role="status">
          <Check size={15} /> {issuesToast}
        </div>
      )}

      <div className="receipt-workspace">
        {/* ── Left: order summary ─────────────────────────────────── */}
        <aside className="receipt-summary-card">
          <p className="dashboard-kicker">Order</p>
          <h3 className="receipt-order-ref">{order.id.slice(0, 8)}</h3>
          <dl className="receipt-meta">
            <div>
              <dt>Brand</dt>
              <dd>{order.brand}{order.order_type ? ` · ${order.order_type}` : ''}</dd>
            </div>
            <div>
              <dt>Requested date</dt>
              <dd>
                {order.requested_delivery_date
                  ? new Intl.DateTimeFormat('en', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  }).format(new Date(`${order.requested_delivery_date}T00:00:00`))
                  : 'Not scheduled'}
              </dd>
            </div>
            <div>
              <dt>Items</dt>
              <dd>{order.items.length} line{order.items.length !== 1 ? 's' : ''}</dd>
            </div>
          </dl>
          <button
            className="receipt-issue-btn"
            onClick={() => setShowIssueModal(true)}
            type="button"
          >
            <AlertCircle size={15} /> Report an issue
          </button>
        </aside>

        {/* ── Right: checklist + form ─────────────────────────────── */}
        <section className="receipt-form-card">
          <div className="receipt-checklist-heading">
            <div>
              <p className="dashboard-kicker">Item checklist</p>
              <h3>Verify delivered items</h3>
            </div>
            {allChecked && (
              <span className="receipt-all-checked">
                <Check size={13} /> All items checked
              </span>
            )}
          </div>

          <form onSubmit={submit}>
            <div className="receipt-checklist">
              {order.items.map((item) => (
                <label
                  className={`receipt-checklist-row${checked[item.id] ? ' is-checked' : ''}`}
                  key={item.id}
                >
                  <input
                    checked={checked[item.id] ?? false}
                    onChange={(e) => {
                      const quantity = e.target.checked ? item.quantity : 0;
                      const next = { ...receivedQuantities, [item.id]: quantity };
                      setChecked((prev) => ({ ...prev, [item.id]: e.target.checked }));
                      setReceivedQuantities(next);
                      setHasDiscrepancy(order.items.some((line) => (next[line.id] ?? line.quantity) !== line.quantity));
                    }}
                    type="checkbox"
                  />
                  <span className="receipt-item-info">
                    <strong>{item.item_name}</strong>
                    <small>
                      {item.quantity} {item.unit}
                    </small>
                  </span>
                  <input
                    aria-label={`Received quantity for ${item.item_name}`}
                    max={item.quantity}
                    min="0"
                    onChange={(e) => {
                      const quantity = Math.max(0, Math.min(item.quantity, Number(e.target.value)));
                      const next = { ...receivedQuantities, [item.id]: quantity };
                      setReceivedQuantities(next);
                      setChecked((current) => ({ ...current, [item.id]: quantity === item.quantity }));
                      setHasDiscrepancy(order.items.some((line) => (next[line.id] ?? line.quantity) !== line.quantity));
                    }}
                    type="number"
                    value={receivedQuantities[item.id] ?? 0}
                  />
                  {checked[item.id] && (
                    <span className="receipt-item-tick" aria-hidden="true">
                      <Check size={13} />
                    </span>
                  )}
                </label>
              ))}
            </div>

            <div className="receipt-fields">
              <label className="receipt-field">
                <span>Confirmed by</span>
                <input
                  onChange={(e) => setConfirmedBy(e.target.value)}
                  placeholder="Name of person confirming receipt"
                  value={confirmedBy}
                />
              </label>

              <label className="receipt-discrepancy">
                <input
                  checked={hasDiscrepancy}
                  onChange={(e) => setHasDiscrepancy(e.target.checked)}
                  type="checkbox"
                />
                <span>There is a discrepancy with this delivery</span>
              </label>
            </div>

            {submitError && (
              <div className="receipt-submit-error" role="alert">
                {submitError}
              </div>
            )}

            <div className="receipt-actions">
              <button
                className="receipt-submit-btn"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? (
                  'Confirming…'
                ) : (
                  <>
                    <ClipboardCheck size={16} />
                    Confirm — Everything Received
                  </>
                )}
              </button>
              <button
                className="receipt-issue-btn-inline"
                onClick={() => setShowIssueModal(true)}
                type="button"
              >
                <AlertCircle size={15} /> Report an issue
              </button>
            </div>
          </form>
        </section>
      </div>

      {showIssueModal && (
        <IssueReportModal
          orderId={id}
          onClose={() => setShowIssueModal(false)}
          onSuccess={onIssueSuccess}
        />
      )}
    </div>
  );
}
