import { useEffect, useState } from 'react';
import { getPaymentMethodLabel } from '../../lib/orderOptions';
import { getMyOrders } from '../../services/orders';

const statusLabels = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Listo',
  in_transit: 'En tránsito',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

const formatDate = (value) =>
  new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );

const formatAmount = (value, currency) => `${currency} ${Number(value).toFixed(2)}`;

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    getMyOrders()
      .then((result) => {
        if (active) setOrders(result);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Tu cuenta</p>
      <h1 className="mt-2 text-4xl font-black text-slate-900">Mis pedidos</h1>

      {loading && <p className="py-10 text-slate-600">Cargando pedidos...</p>}
      {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">No se pudieron cargar tus pedidos: {error}</p>}
      {!loading && !error && orders.length === 0 && (
        <p className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          Aún no tienes pedidos.
        </p>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="mt-8 space-y-4">
          {orders.map((order) => (
            <article key={order.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Pedido</p>
                  <p className="mt-1 break-all font-mono text-sm text-slate-700">{order.id}</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                  {statusLabels[order.status] ?? order.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500">{formatDate(order.created_at)}</p>
              <div className="mt-3 grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
                <p>Fecha preferida: {order.delivery_date ?? 'Sin preferencia'}</p>
                <p>Hora preferida: {order.delivery_time ? String(order.delivery_time).slice(0, 5) : 'Sin preferencia'}</p>
                <p>Zona aledaña: {order.adjacent_zone ? 'Sí' : 'No'}</p>
                <p>Medio de pago: {getPaymentMethodLabel(order.payment_method)}</p>
                {order.payment_method === 'cash' && (
                  <p>Requiere cambio: {order.cash_change_required ? 'Sí' : 'No'}</p>
                )}
              </div>
              <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
                {order.order_items.map((item, index) => (
                  <li key={`${order.id}-${index}`} className="flex justify-between gap-4">
                    <span>{item.product_name} × {item.quantity}</span>
                    <span>{formatAmount(item.subtotal, order.currency_code)}</span>
                  </li>
                ))}
              </ul>
              {Number(order.coupon_discount) > 0 && (
                <p className="mt-3 text-right text-sm font-semibold text-purple-700">
                  Cupón {order.coupon_code}: -{formatAmount(order.coupon_discount, order.currency_code)}
                </p>
              )}
              <div className="mt-4 flex justify-between border-t border-slate-100 pt-4 text-sm">
                <span className="text-slate-600">Envío {formatAmount(order.shipping_fee, order.currency_code)}</span>
                <strong className="text-lg text-slate-900">{formatAmount(order.total, order.currency_code)}</strong>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
