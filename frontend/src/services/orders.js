import { supabase } from '../lib/supabaseClient';

export async function getCheckoutSettings() {
  const { data, error } = await supabase
    .from('site_settings')
    .select('whatsapp_number, shipping_fee, currency_code, accepting_orders')
    .eq('id', true)
    .single();

  if (error) throw error;

  return {
    whatsappNumber: data.whatsapp_number ?? '',
    shippingFee: Number(data.shipping_fee),
    currencyCode: data.currency_code,
    acceptingOrders: data.accepting_orders,
  };
}

export async function createOrder({
  requestId,
  items,
  deliveryName,
  deliveryPhone,
  deliveryAddress,
  deliveryDate,
  deliveryTime,
  paymentMethod,
  cashChangeRequired,
  adjacentZone,
  couponCode,
}) {
  const { data, error } = await supabase.rpc('create_order', {
    p_request_id: requestId,
    p_items: items.map((item) => ({
      product_id: item.id,
      flavor_id: item.flavor_id,
      quantity: item.quantity,
    })),
    p_delivery_name: deliveryName,
    p_delivery_phone: deliveryPhone,
    p_delivery_address: deliveryAddress,
    p_delivery_time: deliveryTime || null,
    p_payment_method: paymentMethod,
    p_cash_change_required: cashChangeRequired,
    p_adjacent_zone: adjacentZone,
    p_coupon_code: couponCode || null,
    p_delivery_date: deliveryDate,
  });

  if (error) throw error;
  if (!data?.id || !Array.isArray(data.items)) {
    throw new Error('Supabase no devolvió los datos esperados del pedido.');
  }

  return data;
}

const orderFields =
  'id, total, shipping_fee, coupon_code, coupon_discount, currency_code, status, created_at, delivery_name, delivery_phone, delivery_address, delivery_date, delivery_time, payment_method, cash_change_required, adjacent_zone, order_items(product_name, flavor_name, quantity, unit_price, subtotal)';

export async function validateCoupon(code) {
  const { data, error } = await supabase.rpc('validate_order_coupon', {
    p_code: code,
  });

  if (error) throw error;
  return Number(data);
}

export async function getMyOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select(orderFields)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return data;
}

export async function getAllOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select(orderFields)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw error;
  return data;
}

export async function getOrdersForDeliveryMonth(year, month) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  const toLocalDate = (date) => {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return localDate.toISOString().slice(0, 10);
  };

  const { data, error } = await supabase
    .from('orders')
    .select('id, delivery_date, delivery_time, delivery_name, status')
    .gte('delivery_date', toLocalDate(start))
    .lt('delivery_date', toLocalDate(end))
    .order('delivery_date')
    .order('delivery_time', { nullsFirst: false })
    .limit(500);

  if (error) throw error;
  return data;
}

export async function updateOrderStatus(orderId, status) {
  const { data, error } = await supabase.rpc('set_order_status', {
    p_order_id: orderId,
    p_status: status,
  });

  if (error) throw error;
  return { id: data.id, status: data.status };
}
