import { AlertTriangle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, OrderDeferral, ordersApi } from '@/shared/api/apiClient';
import './DeferralPage.css';

const formatDate = (value: string | null) => value
  ? new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`))
  : 'Not scheduled';

export function DeferralPage() {
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const [deferral, setDeferral] = useState<OrderDeferral | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void ordersApi.getDeferral(id)
      .then(setDeferral)
      .catch((requestError) => setError(
        requestError instanceof ApiError ? requestError.message : 'Unable to load the deferral notice.',
      ));
  }, [id]);

  if (error) return <div className="deferral-error" role="alert">{error}</div>;
  if (!deferral) return <div className="deferral-loading">Loading deferral notice...</div>;

  return (
    <div className="deferral-page">
      <Link className="deferral-back" to="/store-manager"><ArrowLeft size={16} /> Back to dashboard</Link>
      <section className={`deferral-card${deferral.is_repeat_deferral ? ' is-repeat' : ''}`}>
        <div className="deferral-icon"><AlertTriangle size={28} /></div>
        <p className="dashboard-kicker">Order update</p>
        <h2>Delivery date changed</h2>
        {deferral.is_repeat_deferral && <div className="repeat-warning"><AlertTriangle size={17} /><span>This order has been deferred more than once. Please contact dispatch if the revised date creates an issue.</span></div>}
        <dl className="deferral-details">
          <div><dt>Reason</dt><dd>{deferral.reason}</dd></div>
          <div><dt>Original date</dt><dd>{formatDate(deferral.original_date)}</dd></div>
          <div><dt>Revised date</dt><dd>{formatDate(deferral.revised_date)}</dd></div>
        </dl>
        <button className="deferral-acknowledge" onClick={() => navigate('/store-manager')} type="button"><CheckCircle2 size={17} /> Acknowledge and return to Dashboard</button>
      </section>
    </div>
  );
}