import { useCallback, useEffect, useState } from 'react';
import { getPaymentMethodLabel } from '../../lib/orderOptions';
import { getAllOrders, updateOrderStatus } from '../../services/orders';

const statuses = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'preparing', label: 'Preparando' },
  { value: 'ready', label: 'Listo' },
  { value: 'in_transit', label: 'En tránsito' },
  { value: 'completed', label: 'Completado' },
  { value: 'cancelled', label: 'Cancelado' },
];

const formatDate = (value) =>
  new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );

const formatAmount = (value, currency) => `${currency} ${Number(value).toFixed(2)}`;

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyOrderId, setBusyOrderId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadOrders = useCallback(async () => {
    try {
      setOrders(await getAllOrders());
      setError('');
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    getAllOrders()
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

  const handleStatusChange = async (order, status) => {
    setBusyOrderId(order.id);
    setError('');
    setMessage('');

    try {
      const updatedOrder = await updateOrderStatus(order.id, status);
      setOrders((current) =>
        current.map((item) =>
          item.id === updatedOrder.id ? { ...item, status: updatedOrder.status } : item,
        ),
      );
      setMessage('Estado del pedido actualizado.');
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setBusyOrderId('');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Administración</p>
          <h1 className="mt-2 text-4xl font-black text-slate-900">Pedidos</h1>
        </div>
        <button
          type="button"
          onClick={() => void loadOrders()}
          disabled={loading}
          className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Actualizar
        </button>
      </div>

      {message && <p role="status" className="mt-6 rounded-xl bg-emerald-50 p-4 text-emerald-800">{message}</p>}
      {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">No se pudieron cargar/actualizar los pedidos: {error}</p>}
      {loading && <p className="py-10 text-slate-600">Cargando pedidos...</p>}
      {!loading && !error && orders.length === 0 && (
        <p className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          Aún no hay pedidos.
        </p>
      )}

      {!loading && orders.length > 0 && (
        <div className="mt-8 space-y-5">
          {orders.map((order) => (
            <article key={order.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Pedido</p>
                  <p className="mt-1 break-all font-mono text-sm text-slate-700">{order.id}</p>
                  <p className="mt-2 text-sm text-slate-500">{formatDate(order.created_at)}</p>
                </div>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-500">Estado</span>
                  <select
                    value={order.status}
                    disabled={busyOrderId === order.id}
                    onChange={(event) => void handleStatusChange(order, event.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
                  >
                    {statuses.map((status) => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 md:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Entrega</p>
                  <p className="mt-1 font-semibold text-slate-900">{order.delivery_name}</p>
                  <p className="text-sm text-slate-600">{order.delivery_phone}</p>
                  <p className="mt-1 text-sm text-slate-600">{order.delivery_address}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Zona aledaña: {order.adjacent_zone ? 'Sí' : 'No'}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Fecha preferida: {order.delivery_date ?? 'Sin preferencia'}
                  </p>
                  <p className="text-sm text-slate-600">
                    Hora preferida: {order.delivery_time ? String(order.delivery_time).slice(0, 5) : 'Sin preferencia'}
                  </p>
                  <p className="text-sm text-slate-600">
                    Pago: {getPaymentMethodLabel(order.payment_method)}
                  </p>
                  {order.payment_method === 'cash' && (
                    <p className="text-sm text-slate-600">
                      Requiere cambio: {order.cash_change_required ? 'Sí' : 'No'}
                    </p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Productos</p>
                  <ul className="mt-2 space-y-2 text-sm text-slate-600">
                    {order.order_items.map((item, index) => (
                      <li key={`${order.id}-${index}`} className="flex justify-between gap-4">
                        <span>{item.product_name}{item.flavor_name ? ` · ${item.flavor_name}` : ''} × {item.quantity}</span>
                        <span>{formatAmount(item.subtotal, order.currency_code)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex justify-between border-t border-slate-100 pt-3 text-sm">
                    <span className="text-slate-600">Envío {formatAmount(order.shipping_fee, order.currency_code)}</span>
                  </div>
                  {Number(order.coupon_discount) > 0 && (
                    <p className="mt-2 text-right text-sm font-semibold text-purple-700">
                      Cupón {order.coupon_code}: -{formatAmount(order.coupon_discount, order.currency_code)}
                    </p>
                  )}
                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-slate-600">Total</span>
                    <strong className="text-lg text-slate-900">{formatAmount(order.total, order.currency_code)}</strong>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
