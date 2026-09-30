create function public.get_admin_dashboard_metrics(
  p_day_start timestamptz,
  p_day_end timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_metrics jsonb;
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'No tienes permiso para consultar las métricas administrativas.'
      using errcode = '42501';
  end if;

  if p_day_start is null
     or p_day_end is null
     or p_day_end <= p_day_start
     or p_day_end - p_day_start > interval '26 hours' then
    raise exception 'El rango de fechas solicitado no es válido.'
      using errcode = '22023';
  end if;

  select jsonb_build_object(
    'orders_today',
    (
      select count(*)
      from public.orders
      where orders.created_at >= p_day_start
        and orders.created_at < p_day_end
    ),
    'low_stock_products',
    (
      select count(*)
      from public.products
      where products.active
        and products.stock <= 5
    ),
    'users',
    (
      select count(*)
      from public.profiles
    ),
    'sales_today',
    coalesce(
      (
        select sum(orders.total)
        from public.orders
        where orders.created_at >= p_day_start
          and orders.created_at < p_day_end
          and orders.status <> 'cancelled'::public.order_status
      ),
      0
    ),
    'currency_code',
    (
      select site_settings.currency_code
      from public.site_settings
      where site_settings.id = true
    )
  )
  into v_metrics;

  return v_metrics;
end;
$$;

revoke all on function public.get_admin_dashboard_metrics(timestamptz, timestamptz) from public;
revoke all on function public.get_admin_dashboard_metrics(timestamptz, timestamptz) from anon;
grant execute on function public.get_admin_dashboard_metrics(timestamptz, timestamptz) to authenticated;
