import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import './OrderConfirmedPage.css';

export function OrderConfirmedPage() {
  const { id } = useParams();

  return (
    <div className="confirmed-page">
      <div className="confirmed-icon"><CheckCircle2 size={34} /></div>
      <p className="dashboard-kicker">Order placed</p>
      <h2>Order confirmed</h2>
      <p>Your order has been sent to the delivery planning team.</p>
      <span className="confirmed-id">Order ID: {id}</span>
      <div className="confirmed-actions">
        <Link className="confirmed-primary" to="/store-manager/orders">View order history <ArrowRight size={16} /></Link>
        <Link className="confirmed-secondary" to="/store-manager">Back to dashboard</Link>
      </div>
    </div>
  );
}