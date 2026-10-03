import { ArrowLeft, ChevronDown, Minus, Plus, Send } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, ordersApi } from '@/shared/api/apiClient';
import './NewOrderPage.css';

type Brand = 'fresh' | 'style' | 'tech';
type OrderType = 'dry' | 'chilled';
type Item = { item_name: string; quantity: number; unit: string };

const today = () => new Date().toISOString().slice(0, 10);

function cutoffDate(date: string) {
  const cutoff = new Date(`${date}T16:00:00`);
  return cutoff;
}

function formatCountdown(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function NewOrderPage() {
  const navigate = useNavigate();
  const [brand, setBrand] = useState<Brand>('fresh');
  const [orderType, setOrderType] = useState<OrderType>('dry');
  const [requestedDate, setRequestedDate] = useState(today);
  const [items, setItems] = useState<Item[]>([{ item_name: '', quantity: 1, unit: 'case' }]);
  const [countdown, setCountdown] = useState(() => cutoffDate(today()).getTime() - Date.now());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sameDayCutoffPassed = useMemo(
    () => requestedDate === today() && countdown <= 0,
    [countdown, requestedDate],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown(cutoffDate(requestedDate).getTime() - Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [requestedDate]);

  const updateItem = (index: number, field: keyof Item, value: string | number) => {
    setItems((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )));
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (brand === 'fresh' && !orderType) {
      nextErrors.order_type = 'Choose Dry or Chilled for fresh orders.';
    }
    if (sameDayCutoffPassed) {
      nextErrors.requested_delivery_date = 'The 4:00 PM cutoff for same-day orders has passed.';
    }
    items.forEach((item, index) => {
      if (!item.item_name.trim()) nextErrors[`item_${index}`] = 'Enter an item name.';
      if (item.quantity < 1) nextErrors[`quantity_${index}`] = 'Quantity must be at least 1.';
      if (!item.unit.trim()) nextErrors[`unit_${index}`] = 'Enter a unit.';
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const order = await ordersApi.create({
        brand,
        order_type: brand === 'fresh' ? orderType : null,
        requested_delivery_date: requestedDate,
        items,
      });
      navigate(`/store-manager/orders/${order.id}/confirmed`);
    } catch (requestError) {
      setErrors({
        form: requestError instanceof ApiError
          ? requestError.message
          : 'Unable to place the order. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="new-order-page">
      <button className="new-order-back" onClick={() => navigate('/store-manager/orders')} type="button">
        <ArrowLeft size={16} /> Back to orders
      </button>
      <div className="new-order-heading">
        <div>
          <p className="dashboard-kicker">Store orders</p>
          <h2>Place a new order</h2>
          <p className="dashboard-subtitle">Tell us what your store needs delivered.</p>
        </div>
        <div className={`cutoff-clock${sameDayCutoffPassed ? ' is-closed' : ''}`}>
          <span>{sameDayCutoffPassed ? 'Same-day cutoff passed' : 'Same-day cutoff'}</span>
          <strong>{sameDayCutoffPassed ? 'Choose a later date' : formatCountdown(countdown)}</strong>
        </div>
      </div>

      <form className="new-order-form" onSubmit={submit}>
        {errors.form && <div className="new-order-error" role="alert">{errors.form}</div>}
        <section className="new-order-section">
          <div className="new-order-section-heading"><span>01</span><div><h3>Order details</h3><p>Choose the brand and delivery date.</p></div></div>
          <div className="new-order-fields">
            <label className="new-order-field">
              <span>Brand</span>
              <span className="select-wrap">
                <select value={brand} onChange={(event) => setBrand(event.target.value as Brand)}>
                  <option value="fresh">Fresh</option>
                  <option value="style">Style</option>
                  <option value="tech">Tech</option>
                </select>
                <ChevronDown size={16} />
              </span>
            </label>
            <label className="new-order-field">
              <span>Requested delivery date</span>
              <input min={today()} onChange={(event) => setRequestedDate(event.target.value)} type="date" value={requestedDate} />
              {errors.requested_delivery_date && <em>{errors.requested_delivery_date}</em>}
            </label>
          </div>
          {brand === 'fresh' && (
            <div className="order-type-field">
              <span>Temperature requirement</span>
              <div className="order-type-toggle" role="group" aria-label="Temperature requirement">
                {(['dry', 'chilled'] as OrderType[]).map((type) => (
                  <button className={orderType === type ? 'is-selected' : ''} key={type} onClick={() => setOrderType(type)} type="button">
                    {type === 'dry' ? 'Dry' : 'Chilled'}
                  </button>
                ))}
              </div>
              {errors.order_type && <em>{errors.order_type}</em>}
            </div>
          )}
        </section>

        <section className="new-order-section">
          <div className="new-order-section-heading"><span>02</span><div><h3>Items</h3><p>Add each item and the quantity required.</p></div></div>
          <div className="order-items">
            {items.map((item, index) => (
              <div className="order-item-row" key={`${index}-${item.item_name}`}>
                <label><span>Item name</span><input onChange={(event) => updateItem(index, 'item_name', event.target.value)} placeholder="e.g. Cooking oil" value={item.item_name} />{errors[`item_${index}`] && <em>{errors[`item_${index}`]}</em>}</label>
                <label className="quantity-field"><span>Qty</span><input min="1" onChange={(event) => updateItem(index, 'quantity', Number(event.target.value))} type="number" value={item.quantity} />{errors[`quantity_${index}`] && <em>{errors[`quantity_${index}`]}</em>}</label>
                <label><span>Unit</span><input onChange={(event) => updateItem(index, 'unit', event.target.value)} placeholder="case" value={item.unit} />{errors[`unit_${index}`] && <em>{errors[`unit_${index}`]}</em>}</label>
                <button aria-label="Remove item" className="remove-item" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} type="button"><Minus size={16} /></button>
              </div>
            ))}
          </div>
          <button className="add-item" onClick={() => setItems((current) => [...current, { item_name: '', quantity: 1, unit: 'case' }])} type="button"><Plus size={16} /> Add another item</button>
        </section>

        <div className="new-order-actions">
          <button className="new-order-cancel" onClick={() => navigate('/store-manager')} type="button">Cancel</button>
          <button className="new-order-submit" disabled={isSubmitting} type="submit"><Send size={16} />{isSubmitting ? 'Placing order...' : 'Place order'}</button>
        </div>
      </form>
    </div>
  );
}