alter table public.products
  add column discount_percent numeric(5, 2) not null default 0
    check (discount_percent >= 0 and discount_percent <= 100);

alter table public.orders
  add column coupon_code text,
  add column coupon_discount numeric(10, 2) not null default 0
    check (coupon_discount >= 0);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique
    check (code ~ '^[A-Z0-9_-]{3,32}$'),
  discount_percent numeric(5, 2) not null
    check (discount_percent > 0 and discount_percent <= 100),
  expires_at timestamptz,
  active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.coupons enable row level security;
revoke all on table public.coupons from anon, authenticated;
grant select, insert, update on table public.coupons to authenticated;

create policy "Admins can manage coupons"
on public.coupons
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create function public.validate_order_coupon(p_code text)
returns numeric
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_discount numeric(5, 2);
  v_code text := pg_catalog.upper(pg_catalog.btrim(p_code));
begin
  if (select auth.uid()) is null then
    raise exception 'Debes iniciar sesión para validar un cupón.'
      using errcode = '42501';
  end if;

  if v_code is null or v_code !~ '^[A-Z0-9_-]{3,32}$' then
    raise exception 'El código del cupón no tiene un formato válido.'
      using errcode = '22023';
  end if;

  select coupons.discount_percent
  into v_discount
  from public.coupons
  where coupons.code = v_code
    and coupons.active
    and (coupons.expires_at is null or coupons.expires_at > pg_catalog.now());

  if not found then
    raise exception 'El cupón no existe, está desactivado o venció.'
      using errcode = 'P0002';
  end if;

  return v_discount;
end;
$$;

revoke all on function public.validate_order_coupon(text) from public;
revoke all on function public.validate_order_coupon(text) from anon;
grant execute on function public.validate_order_coupon(text) to authenticated;

create function public.create_order(
  p_request_id uuid,
  p_items jsonb,
  p_delivery_name text,
  p_delivery_phone text,
  p_delivery_address text,
  p_delivery_time time,
  p_payment_method text,
  p_cash_change_required boolean,
  p_adjacent_zone boolean,
  p_coupon_code text
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
  v_order public.orders%rowtype;
  v_order_items jsonb;
  v_subtotal numeric(12, 2);
  v_coupon_discount numeric(10, 2) := 0;
  v_discount_percent numeric(5, 2) := 0;
  v_coupon_code text := nullif(pg_catalog.upper(pg_catalog.btrim(p_coupon_code)), '');
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión para crear un pedido.'
      using errcode = '42501';
  end if;

  if p_request_id is null or p_adjacent_zone is null or p_cash_change_required is null then
    raise exception 'Faltan datos requeridos para crear el pedido.'
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
    v_order := v_existing;
  else
    if v_coupon_code is not null then
      v_discount_percent := public.validate_order_coupon(v_coupon_code);
    end if;

    v_created := public.create_order(
      p_request_id,
      p_items,
      p_delivery_name,
      p_delivery_phone,
      p_delivery_address,
      p_delivery_time,
      p_payment_method,
      p_cash_change_required,
      p_adjacent_zone
    );

    update public.order_items
    set unit_price = pg_catalog.round(
      order_items.unit_price
        * (100 - products.discount_percent)
        / 100,
      2
    )
    from public.products
    where order_items.order_id = (v_created ->> 'id')::uuid
      and products.id = order_items.product_id
      and products.discount_percent > 0;

    select coalesce(sum(order_items.subtotal), 0)
    into v_subtotal
    from public.order_items
    where order_items.order_id = (v_created ->> 'id')::uuid;

    v_coupon_discount := pg_catalog.round(
      v_subtotal * v_discount_percent / 100,
      2
    );

    update public.orders
    set coupon_code = v_coupon_code,
        coupon_discount = v_coupon_discount,
        total = v_subtotal - v_coupon_discount + orders.shipping_fee
    where orders.id = (v_created ->> 'id')::uuid
      and orders.user_id = v_user_id;

    if not found then
      raise exception 'No se pudieron guardar los descuentos del pedido.'
        using errcode = 'P0002';
    end if;

    select orders.*
    into v_order
    from public.orders
    where orders.id = (v_created ->> 'id')::uuid
      and orders.user_id = v_user_id;
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

  return jsonb_build_object(
    'id', v_order.id,
    'status', v_order.status,
    'subtotal', v_subtotal,
    'shipping_fee', v_order.shipping_fee,
    'coupon_code', v_order.coupon_code,
    'coupon_discount', v_order.coupon_discount,
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

revoke all on function public.create_order(uuid, jsonb, text, text, text, time, text, boolean, boolean, text) from public;
revoke all on function public.create_order(uuid, jsonb, text, text, text, time, text, boolean, boolean, text) from anon;
grant execute on function public.create_order(uuid, jsonb, text, text, text, time, text, boolean, boolean, text) to authenticated;
