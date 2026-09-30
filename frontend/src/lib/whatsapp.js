import { getPaymentMethodLabel } from './orderOptions';

const formatAmount = (amount, currencyCode) =>
  `${currencyCode} ${Number(amount).toFixed(2)}`;

export const buildOrderMessage = (order) => {
  const lines = [
    'Hola, quiero confirmar mi pedido.',
    `Pedido: ${order.id}`,
    `Nombre: ${order.delivery_name}`,
    `Teléfono: ${order.delivery_phone}`,
    `Dirección: ${order.delivery_address}`,
    `Zona aledaña: ${order.adjacent_zone ? 'Sí' : 'No'}`,
    ...(order.delivery_date ? [`Fecha preferida de entrega: ${order.delivery_date}`] : []),
    ...(order.delivery_time ? [`Hora preferida de entrega: ${String(order.delivery_time).slice(0, 5)}`] : []),
    `Medio de pago: ${getPaymentMethodLabel(order.payment_method)}`,
    ...(order.payment_method === 'cash'
      ? [`¿Requiere cambio?: ${order.cash_change_required ? 'Sí' : 'No'}`]
      : []),
    `Subtotal: ${formatAmount(order.subtotal, order.currency_code)}`,
    ...(Number(order.coupon_discount) > 0
      ? [`Cupón ${order.coupon_code}: -${formatAmount(order.coupon_discount, order.currency_code)}`]
      : []),
    `Envío: ${formatAmount(order.shipping_fee, order.currency_code)}`,
    `Total: ${formatAmount(order.total, order.currency_code)}`,
    'Productos:',
    ...order.items.map(
      (item) =>
        `- ${item.name} x${item.quantity} (${formatAmount(item.subtotal, order.currency_code)})`,
    ),
  ];

  return lines.join('\n');
};

export const buildWhatsAppUrl = (phone, message) => {
  const cleanPhone = String(phone).replace(/\D/g, '');

  if (!/^\d{8,15}$/.test(cleanPhone)) {
    throw new Error('Configura un número de WhatsApp válido en los ajustes de tienda.');
  }

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};
