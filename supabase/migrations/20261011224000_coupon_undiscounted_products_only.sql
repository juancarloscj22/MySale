alter table public.coupons
  add column only_undiscounted_products boolean not null default false;

drop function public.create_coupon(text, text, numeric, integer, timestamptz);

create function public.create_coupon(
  p_code text,
  p_discount_type text,
  p_discount_value numeric,
  p_max_uses integer,
  p_expires_at timestamptz,
  p_only_undiscounted_products boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_code text := pg_catalog.upper(pg_catalog.btrim(p_code));
  v_coupon_id uuid;
begin
  if v_user_id is null or not (select public.is_admin()) then
    raise exception 'Solo administración puede crear cupones.'
      using errcode = '42501';
  end if;

  if v_code is null or v_code !~ '^[A-Z0-9_-]{3,32}$' then
    raise exception 'El código del cupón debe tener entre 3 y 32 letras, números, guiones o guiones bajos.'
      using errcode = '22023';
  end if;

  if p_discount_type not in ('percent', 'amount')
    or p_discount_value is null
    or p_discount_value <= 0
    or (p_discount_type = 'percent' and p_discount_value > 100)
    or (p_max_uses is not null and p_max_uses < 1)
    or p_only_undiscounted_products is null
  then
    raise exception 'El tipo o valor del descuento no es válido.'
      using errcode = '22023';
  end if;

  insert into public.coupons (
    code,
    discount_type,
    discount_value,
    discount_percent,
    only_undiscounted_products,
    max_uses,
    expires_at,
    created_by
  )
  values (
    v_code,
    p_discount_type,
    p_discount_value,
    case when p_discount_type = 'percent' then p_discount_value else null end,
    p_only_undiscounted_products,
    p_max_uses,
    p_expires_at,
    v_user_id
  )
  returning id into v_coupon_id;

  return v_coupon_id;
end;
$$;

revoke all on function public.create_coupon(text, text, numeric, integer, timestamptz, boolean)
  from public, anon;
grant execute on function public.create_coupon(text, text, numeric, integer, timestamptz, boolean)
  to authenticated;

create or replace function public.validate_order_coupon_details(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_coupon public.coupons%rowtype;
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

  select coupons.*
  into v_coupon
  from public.coupons
  where coupons.code = v_code
  for update;

  if not found
    or not v_coupon.active
    or (v_coupon.expires_at is not null and v_coupon.expires_at <= pg_catalog.now())
    or (v_coupon.max_uses is not null and v_coupon.used_count >= v_coupon.max_uses)
  then
    raise exception 'El cupón no existe, está desactivado, venció o alcanzó su límite de usos.'
      using errcode = 'P0002';
  end if;

  return pg_catalog.jsonb_build_object(
    'type', v_coupon.discount_type,
    'value', v_coupon.discount_value,
    'only_undiscounted_products', v_coupon.only_undiscounted_products
  );
end;
$$;

create or replace function public.calculate_order_coupon_discount(p_code text, p_order_id uuid)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_coupon public.coupons%rowtype;
  v_value numeric(10, 2);
  v_subtotal numeric(12, 2);
  v_eligible_subtotal numeric(12, 2);
  v_shipping_fee numeric(10, 2);
  v_discount_base numeric(12, 2);
begin
  if not exists (
    select 1
    from public.orders
    where orders.id = p_order_id
      and orders.user_id = (select auth.uid())
      and orders.coupon_code = pg_catalog.upper(pg_catalog.btrim(p_code))
  ) then
    raise exception 'El cupón no corresponde al pedido de esta cuenta.'
      using errcode = '22023';
  end if;

  select coupons.*
  into v_coupon
  from public.coupons
  where coupons.code = pg_catalog.upper(pg_catalog.btrim(p_code))
  for update;

  if not found
    or not v_coupon.active
    or (v_coupon.expires_at is not null and v_coupon.expires_at <= pg_catalog.now())
    or (v_coupon.max_uses is not null and v_coupon.used_count > v_coupon.max_uses)
  then
    raise exception 'El cupón ya no está disponible.'
      using errcode = 'P0002';
  end if;

  select
    coalesce(sum(order_items.subtotal), 0),
    coalesce(sum(order_items.subtotal) filter (
      where coalesce(products.discount_percent, 0) <= 0
    ), 0)
  into v_subtotal, v_eligible_subtotal
  from public.order_items
  left join public.products on products.id = order_items.product_id
  where order_items.order_id = p_order_id;

  select orders.shipping_fee
  into v_shipping_fee
  from public.orders
  where orders.id = p_order_id
    and orders.user_id = (select auth.uid());

  v_value := v_coupon.discount_value;
  v_discount_base := case
    when v_coupon.only_undiscounted_products then v_eligible_subtotal
    else v_subtotal
  end;

  if v_coupon.only_undiscounted_products and v_eligible_subtotal <= 0 then
    raise exception 'Este cupón solo aplica a productos sin descuento.'
      using errcode = '22023';
  end if;

  if v_coupon.discount_type = 'amount' then
    if not v_coupon.only_undiscounted_products then
      v_discount_base := v_discount_base + coalesce(v_shipping_fee, 0);
    end if;
    return case when v_value < v_discount_base then v_value else v_discount_base end;
  end if;

  return pg_catalog.round(v_discount_base * v_value / 100, 2);
end;
$$;

revoke all on function public.validate_order_coupon_details(text) from public, anon;
grant execute on function public.validate_order_coupon_details(text) to authenticated;
revoke all on function public.calculate_order_coupon_discount(text, uuid) from public, anon;
grant execute on function public.calculate_order_coupon_discount(text, uuid) to authenticated;
