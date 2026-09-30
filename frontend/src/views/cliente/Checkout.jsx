import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { useCart } from '../../context/useCart';
import { buildOrderMessage, buildWhatsAppUrl } from '../../lib/whatsapp';
import { paymentMethods } from '../../lib/orderOptions';
import { createOrder, getCheckoutSettings, validateCoupon } from '../../services/orders';

const initialDelivery = {
  address: '',
  date: '',
  time: '',
  paymentMethod: '',
  adjacentZone: null,
  cashChangeRequired: false,
};
const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500';
const today = new Date().toLocaleDateString('en-CA');

function getPendingRequestId() {
  const storageKey = 'pending-order-request-id';
  const savedRequestId = sessionStorage.getItem(storageKey);
  if (savedRequestId) return savedRequestId;

  const requestId = crypto.randomUUID();
  sessionStorage.setItem(storageKey, requestId);
  return requestId;
}

export default function Checkout() {
  const { profile } = useAuth();
  const { items, subtotal, removeItem, updateQuantity, clearCart } = useCart();
  const [settings, setSettings] = useState(null);
  const [settingsError, setSettingsError] = useState('');
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [delivery, setDelivery] = useState(initialDelivery);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [requestId, setRequestId] = useState(getPendingRequestId);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  useEffect(() => {
    let active = true;

    getCheckoutSettings()
      .then((result) => {
        if (active) setSettings(result);
      })
      .catch((loadError) => {
        if (active) setSettingsError(loadError.message);
      })
      .finally(() => {
        if (active) setLoadingSettings(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const updateDelivery = (event) => {
    const { name, value } = event.target;
    setDelivery((current) => ({
      ...current,
      [name]: value,
      ...(name === 'paymentMethod' && value !== 'cash' ? { cashChangeRequired: false } : {}),
    }));
  };

  const handleApplyCoupon = async () => {
    setCouponError('');
    setAppliedCoupon(null);
    if (!couponCode.trim()) {
      setCouponError('Escribe un código de cupón.');
      return;
    }

    setValidatingCoupon(true);
    try {
      const discountPercent = await validateCoupon(couponCode);
      setAppliedCoupon({ code: couponCode.trim().toUpperCase(), discountPercent });
    } catch (validationError) {
      setCouponError(validationError.message);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const couponDiscount = appliedCoupon
    ? Number((subtotal * appliedCoupon.discountPercent / 100).toFixed(2))
    : 0;
  const shippingFee = delivery.adjacentZone === true ? settings?.shippingFee ?? 0 : 0;
  const estimatedTotal = subtotal - couponDiscount + shippingFee;

  const handleSubmitOrder = async (event) => {
    event.preventDefault();
    setError('');

    if (delivery.adjacentZone === null) {
      setError('Indica si tu domicilio está en zona aledaña para calcular el costo de envío.');
      return;
    }

    if (!delivery.date) {
      setError('Selecciona la fecha preferida de entrega.');
      return;
    }

    if (settings?.acceptingOrders === false) {
      setError('La tienda no está aceptando pedidos por el momento. Inténtalo más tarde.');
      return;
    }

    if (!profile?.full_name?.trim() || !profile?.phone?.trim()) {
      setError('Completa tu nombre y teléfono en Mi cuenta antes de realizar el pedido.');
      return;
    }

    if (!settings?.whatsappNumber) {
      setError('Configura el número de WhatsApp en la consola de desarrollador antes de recibir pedidos.');
      return;
    }

    try {
      buildWhatsAppUrl(settings.whatsappNumber, '');
    } catch (configurationError) {
      setError(configurationError.message);
      return;
    }

    setSubmitting(true);
    try {
      const order = await createOrder({
        requestId,
        items,
        deliveryName: profile.full_name,
        deliveryPhone: profile.phone,
        deliveryAddress: delivery.address,
        deliveryDate: delivery.date,
        deliveryTime: delivery.time,
        paymentMethod: delivery.paymentMethod,
        cashChangeRequired: delivery.paymentMethod === 'cash' && delivery.cashChangeRequired,
        adjacentZone: delivery.adjacentZone,
        couponCode: appliedCoupon?.code ?? '',
      });
      const orderMessage = buildOrderMessage(order);

      setCompletedOrder({
        ...order,
        whatsappUrl: buildWhatsAppUrl(settings.whatsappNumber, orderMessage),
      });
      clearCart();
      sessionStorage.removeItem('pending-order-request-id');
      setRequestId(crypto.randomUUID());
    } catch (submitError) {
      setError(submitError.message);
      setSubmitting(false);
    }
  };

  if (completedOrder) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="rounded-3xl border border-emerald-200 bg-white p-8 shadow-sm sm:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Pedido registrado</p>
          <h1 className="mt-3 text-4xl font-black text-slate-900">¡Gracias por tu compra!</h1>
          <p className="mt-4 text-slate-600">
            Tu pedido quedó guardado. Esta página permanecerá abierta; puedes enviar los detalles a la tienda por WhatsApp cuando estés listo.
          </p>
          <p className="mt-5 break-all rounded-xl bg-slate-50 p-4 font-mono text-sm text-slate-600">
            Pedido: {completedOrder.id}
          </p>
          <a
            href={completedOrder.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex rounded-full bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-900 transition hover:bg-emerald-600"
          >
            Continuar a WhatsApp
          </a>
          <div>
            <Link to="/mis-pedidos" className="mt-5 inline-block text-sm font-semibold text-slate-600 hover:text-slate-900">
              Ver mis pedidos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h1 className="text-4xl font-black text-slate-900">Tu carrito está vacío</h1>
        <p className="mt-4 text-slate-600">Agrega algunos productos para continuar con tu pedido.</p>
        <Link to="/catalog" className="mt-6 inline-block rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white">
          Explorar catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-black text-slate-900">Checkout</h1>
      {settings?.acceptingOrders === false && (
        <p role="status" className="mt-5 rounded-xl bg-amber-50 p-4 text-amber-800">
          La tienda no está aceptando pedidos por el momento. Tu carrito se conserva para cuando vuelva el servicio.
        </p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_0.9fr]">
        <div className="space-y-8">
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <img src={item.image} alt={item.name} className="h-24 w-24 rounded-xl object-cover" />
                <div className="min-w-32 flex-1">
                  <h2 className="text-lg font-bold text-slate-900">{item.name}</h2>
                  <p className="text-sm text-slate-500">{item.flavor}</p>
                  {item.discount_percent > 0 && Number.isFinite(item.originalPrice) && (
                    <p className="mt-1 text-sm text-slate-500 line-through">
                      ${item.originalPrice.toFixed(2)}
                    </p>
                  )}
                  <p className="mt-2 text-lg font-black text-slate-900">
                    {settings?.currencyCode ?? '$'} {(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={`Quitar una unidad de ${item.name}`}
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    disabled={submitting}
                    className="h-8 w-8 rounded-full border border-slate-300 text-lg"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-semibold">{item.quantity}</span>
                  <button
                    type="button"
                    aria-label={`Agregar una unidad de ${item.name}`}
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    disabled={submitting}
                    className="h-8 w-8 rounded-full border border-slate-300 text-lg"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  disabled={submitting}
                  className="text-sm font-semibold text-red-500"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>

          <form id="checkout-form" onSubmit={handleSubmitOrder} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Datos de entrega</h2>
              <p className="mt-2 text-sm text-slate-600">Usaremos los datos de tu cuenta para coordinar la entrega.</p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
              <p><span className="font-semibold">Nombre:</span> {profile?.full_name || 'No registrado'}</p>
              <p className="mt-1"><span className="font-semibold">Teléfono:</span> {profile?.phone || 'No registrado'}</p>
              <Link to="/mi-cuenta" className="mt-2 inline-block font-semibold text-emerald-700 hover:text-emerald-800">
                Editar datos de mi cuenta
              </Link>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Dirección de entrega *</span>
              <textarea
                name="address"
                autoComplete="street-address"
                required
                minLength={5}
                maxLength={500}
                rows={3}
                value={delivery.address}
                onChange={updateDelivery}
                className={inputClass}
              />
            </label>
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold text-slate-700">¿Tu domicilio está en zona aledaña? *</legend>
              <div className="flex gap-3">
                {[
                  { value: true, label: 'Sí' },
                  { value: false, label: 'No' },
                ].map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    aria-pressed={delivery.adjacentZone === option.value}
                    onClick={() =>
                      setDelivery((current) => ({
                        ...current,
                        adjacentZone: option.value,
                      }))
                    }
                    className={`rounded-full border px-5 py-2 text-sm font-semibold transition ${
                      delivery.adjacentZone === option.value
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <span className="block text-xs text-slate-500">
                {delivery.adjacentZone === null
                  ? 'Selecciona una opción para calcular el envío.'
                  : delivery.adjacentZone
                    ? 'Se agregará el costo de envío configurado.'
                    : 'No se agregará costo de envío.'}
              </span>
            </fieldset>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Fecha preferida de entrega *</span>
              <input
                name="date"
                type="date"
                min={today}
                required
                value={delivery.date}
                onChange={updateDelivery}
                className={inputClass}
              />
              <span className="mt-1 block text-xs text-slate-500">La tienda confirmará la disponibilidad de la fecha.</span>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Hora preferida de entrega</span>
              <input
                name="time"
                type="time"
                value={delivery.time}
                onChange={updateDelivery}
                className={inputClass}
              />
              <span className="mt-1 block text-xs text-slate-500">La tienda confirmará la disponibilidad del horario.</span>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Medio de pago *</span>
              <select
                name="paymentMethod"
                required
                value={delivery.paymentMethod}
                onChange={updateDelivery}
                className={inputClass}
              >
                <option value="" disabled>Selecciona un medio de pago</option>
                {paymentMethods.map((method) => (
                  <option key={method.value} value={method.value}>{method.label}</option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-slate-500">El pago se coordina con la tienda; no se procesa en esta página.</span>
            </label>
            <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
              <label htmlFor="coupon-code" className="mb-2 block text-sm font-semibold text-slate-700">
                Cupón de descuento
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  id="coupon-code"
                  type="text"
                  maxLength={32}
                  value={couponCode}
                  onChange={(event) => {
                    setCouponCode(event.target.value.toUpperCase());
                    setAppliedCoupon(null);
                    setCouponError('');
                  }}
                  className={`${inputClass} min-w-0 flex-1`}
                  placeholder="Ingresa tu código"
                />
                <button
                  type="button"
                  onClick={() => void handleApplyCoupon()}
                  disabled={validatingCoupon || !couponCode.trim()}
                  className="rounded-xl bg-purple-200 px-5 py-3 text-sm font-bold text-purple-900 hover:bg-purple-300 disabled:opacity-60"
                >
                  {validatingCoupon ? 'Validando...' : 'Aplicar'}
                </button>
              </div>
              {appliedCoupon && (
                <p role="status" className="mt-2 text-sm font-semibold text-emerald-700">
                  Cupón {appliedCoupon.code} aplicado: {appliedCoupon.discountPercent}% de descuento.
                </p>
              )}
              {couponError && <p role="alert" className="mt-2 text-sm text-pink-700">{couponError}</p>}
            </div>
            {delivery.paymentMethod === 'cash' && (
              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold text-slate-700">¿Requieres cambio?</legend>
                <div className="flex gap-3">
                  {[
                    { value: false, label: 'No' },
                    { value: true, label: 'Sí' },
                  ].map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      aria-pressed={delivery.cashChangeRequired === option.value}
                      onClick={() =>
                        setDelivery((current) => ({
                          ...current,
                          cashChangeRequired: option.value,
                        }))
                      }
                      className={`rounded-full border px-5 py-2 text-sm font-semibold transition ${
                        delivery.cashChangeRequired === option.value
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
          </form>
        </div>

        <aside className="h-fit rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-900">Resumen</h2>
          <div className="mt-6 space-y-4 text-sm text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal estimado</span>
              <span>{settings?.currencyCode ?? '$'} {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Envío {delivery.adjacentZone === null ? '(selecciona zona)' : ''}</span>
              <span>
                {loadingSettings
                  ? 'Cargando...'
                  : settings
                    ? `${settings.currencyCode} ${shippingFee.toFixed(2)}`
                    : 'No disponible'}
              </span>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between text-purple-700">
                <span>Cupón {appliedCoupon.code} (-{appliedCoupon.discountPercent}%)</span>
                <span>-{settings ? `${settings.currencyCode} ${couponDiscount.toFixed(2)}` : `$${couponDiscount.toFixed(2)}`}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-4 font-bold text-slate-900">
              <span>Total estimado</span>
              <span>
                {settings
                  ? `${settings.currencyCode} ${estimatedTotal.toFixed(2)}`
                  : `$${estimatedTotal.toFixed(2)}`}
              </span>
            </div>
            <p className="border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">
              El envío configurado se cobra si indicas que tu domicilio está en zona aledaña.
            </p>
          </div>

          {(settingsError || error) && (
            <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {error || `No se pudo cargar la configuración: ${settingsError}`}
            </p>
          )}

          {!loadingSettings && settings && !settings.whatsappNumber && (
            <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
              El número de WhatsApp de la tienda todavía no está configurado.
            </p>
          )}

          <button
            type="submit"
            form="checkout-form"
            disabled={submitting || loadingSettings || !settings?.whatsappNumber || delivery.adjacentZone === null || settings?.acceptingOrders === false}
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-900 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Validando y guardando...' : 'Crear pedido y continuar a WhatsApp'}
          </button>

          <button
            type="button"
            onClick={clearCart}
            disabled={submitting}
            className="mt-3 w-full rounded-full border border-slate-300 px-6 py-3 text-sm font-bold text-slate-700 disabled:opacity-50"
          >
            Vaciar carrito
          </button>
        </aside>
      </div>
    </div>
  );
}
