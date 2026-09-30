import { supabase } from '../lib/supabaseClient';

export async function getAdminDashboardMetrics() {
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const { data, error } = await supabase.rpc('get_admin_dashboard_metrics', {
    p_day_start: dayStart.toISOString(),
    p_day_end: dayEnd.toISOString(),
  });

  if (error) throw error;
  if (
    !data
    || !Number.isFinite(Number(data.orders_today))
    || !Number.isFinite(Number(data.low_stock_products))
    || !Number.isFinite(Number(data.users))
    || !Number.isFinite(Number(data.sales_today))
    || !data.currency_code
  ) {
    throw new Error('Supabase no devolvió métricas válidas para el dashboard.');
  }

  return {
    ordersToday: Number(data.orders_today),
    lowStockProducts: Number(data.low_stock_products),
    users: Number(data.users),
    salesToday: Number(data.sales_today),
    currencyCode: data.currency_code,
  };
}
