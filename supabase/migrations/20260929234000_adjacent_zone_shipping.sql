alter table public.orders
  add column adjacent_zone boolean not null default true;

create function public.create_order(
  p_request_id uuid,
  p_items jsonb,
  p_delivery_name text,
  p_delivery_phone text,
  p_delivery_address text,
  p_delivery_time time,
  p_payment_method text,
  p_cash_change_required boolean,
  p_adjacent_zone boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_existing public.orders%rowtype;
  v_created jsonb;
  v_order_items jsonb;
  v_subtotal numeric(12, 2);
  v_shipping_fee numeric(10, 2);
  v_order public.orders%rowtype;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión para crear un pedido.'
      using errcode = '42501';
  end if;

  if p_request_id is null then
    raise exception 'Falta el identificador de solicitud del pedido.'
      using errcode = '22023';
  end if;

  if p_adjacent_zone is null or p_cash_change_required is null then
    raise exception 'Selecciona las preferencias de envío y pago.'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || p_request_id::text, 0)
  );

  select orders.*
  into v_existing
  from public.orders
  where orders.user_id = v_user_id
    and orders.client_request_id = p_request_id;

  if found then
    v_created := public.create_order(
      p_request_id,
      p_items,
      p_delivery_name,
      p_delivery_phone,
      p_delivery_address,
      p_delivery_time,
      p_payment_method,
      v_existing.cash_change_required
    );
  else
    v_created := public.create_order(
      p_request_id,
      p_items,
      p_delivery_name,
      p_delivery_phone,
      p_delivery_address,
      p_delivery_time,
      p_payment_method,
      p_cash_change_required
    );

    update public.orders
    set adjacent_zone = p_adjacent_zone,
        shipping_fee = case
          when p_adjacent_zone then orders.shipping_fee
          else 0
        end,
        total = (
          select coalesce(sum(order_items.subtotal), 0)
          from public.order_items
          where order_items.order_id = orders.id
        ) + case
          when p_adjacent_zone then orders.shipping_fee
          else 0
        end
    where orders.id = (v_created ->> 'id')::uuid
      and orders.user_id = v_user_id;

    if not found then
      raise exception 'No se pudo guardar la preferencia de zona para el pedido.'
        using errcode = 'P0002';
    end if;
  end if;

  select orders.*
  into v_order
  from public.orders
  where orders.user_id = v_user_id
    and orders.client_request_id = p_request_id;

  if not found then
    raise exception 'No se encontró el pedido creado.'
      using errcode = 'P0002';
  end if;

  select coalesce(sum(order_items.subtotal), 0)
  into v_subtotal
  from public.order_items
  where order_items.order_id = v_order.id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'product_id', order_items.product_id,
        'name', order_items.product_name,
        'quantity', order_items.quantity,
        'price', order_items.unit_price,
        'subtotal', order_items.subtotal
      )
      order by order_items.product_name
    ),
    '[]'::jsonb
  )
  into v_order_items
  from public.order_items
  where order_items.order_id = v_order.id;

  v_shipping_fee := v_order.shipping_fee;

  return jsonb_build_object(
    'id', v_order.id,
    'status', v_order.status,
    'subtotal', v_subtotal,
    'shipping_fee', v_shipping_fee,
    'total', v_order.total,
    'currency_code', v_order.currency_code,
    'delivery_name', v_order.delivery_name,
    'delivery_phone', v_order.delivery_phone,
    'delivery_address', v_order.delivery_address,
    'delivery_time', v_order.delivery_time,
    'payment_method', v_order.payment_method,
    'cash_change_required', v_order.cash_change_required,
    'adjacent_zone', v_order.adjacent_zone,
    'items', v_order_items
  );
end;
$$;

revoke all on function public.create_order(uuid, jsonb, text, text, text, time, text, boolean, boolean) from public;
revoke all on function public.create_order(uuid, jsonb, text, text, text, time, text, boolean, boolean) from anon;
grant execute on function public.create_order(uuid, jsonb, text, text, text, time, text, boolean, boolean) to authenticated;
