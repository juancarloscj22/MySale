create or replace function public.create_order_when_open(
  p_request_id uuid,
  p_items jsonb,
  p_delivery_name text,
  p_delivery_phone text,
  p_delivery_address text,
  p_delivery_time time,
  p_payment_method text,
  p_cash_change_required boolean,
  p_adjacent_zone boolean,
  p_coupon_code text,
  p_delivery_date date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_existing_date date;
  v_existing boolean;
  v_order jsonb;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión para crear un pedido.'
      using errcode = '42501';
  end if;

  if p_request_id is null then
    raise exception 'Falta el identificador de solicitud del pedido.'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || p_request_id::text, 0)
  );

  select orders.delivery_date
  into v_existing_date
  from public.orders
  where orders.user_id = v_user_id
    and orders.client_request_id = p_request_id;
  v_existing := found;

  v_order := public.create_order(
    p_request_id,
    p_items,
    p_delivery_name,
    p_delivery_phone,
    p_delivery_address,
    p_delivery_time,
    p_payment_method,
    p_cash_change_required,
    p_adjacent_zone,
    p_coupon_code
  );

  if not v_existing then
    update public.orders
    set delivery_date = p_delivery_date
    where orders.id = (v_order ->> 'id')::uuid
      and orders.user_id = v_user_id;

    if not found then
      raise exception 'No se pudo guardar la fecha de entrega.'
        using errcode = 'P0002';
    end if;
    v_existing_date := p_delivery_date;
  end if;

  return pg_catalog.jsonb_set(
    v_order,
    '{delivery_date}',
    coalesce(pg_catalog.to_jsonb(v_existing_date), 'null'::jsonb),
    true
  );
end;
$$;
