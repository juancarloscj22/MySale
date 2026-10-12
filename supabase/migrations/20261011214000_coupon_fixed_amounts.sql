alter table public.coupons
  add column discount_type text not null default 'percent'
    check (discount_type in ('percent', 'amount')),
  add column discount_value numeric(10, 2);

update public.coupons
set discount_value = discount_percent;

alter table public.coupons
  alter column discount_percent drop not null;

do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select constraints.conname
    from pg_catalog.pg_constraint as constraints
    where constraints.conrelid = 'public.coupons'::regclass
      and constraints.contype = 'c'
      and pg_catalog.pg_get_constraintdef(constraints.oid) like '%discount_percent%'
  loop
    execute pg_catalog.format(
      'alter table public.coupons drop constraint %I',
      v_constraint.conname
    );
  end loop;
end;
$$;

alter table public.coupons
  alter column discount_value set not null,
  add constraint coupons_discount_value_valid check (
    (discount_type = 'percent' and discount_value > 0 and discount_value <= 100)
    or (discount_type = 'amount' and discount_value > 0)
  ),
  add constraint coupons_discount_percent_legacy_valid check (
    discount_percent is null
    or (discount_percent > 0 and discount_percent <= 100)
  );

create function public.validate_order_coupon_details(p_code text)
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
    'value', v_coupon.discount_value
  );
end;
$$;

create function public.calculate_order_coupon_discount(p_code text, p_order_id uuid)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_coupon public.coupons%rowtype;
  v_value numeric(10, 2);
  v_subtotal numeric(12, 2);
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

  select coalesce(sum(order_items.subtotal), 0)
  into v_subtotal
  from public.order_items
  join public.orders on orders.id = order_items.order_id
  where order_items.order_id = p_order_id
    and orders.user_id = (select auth.uid());

  v_value := v_coupon.discount_value;

  if v_coupon.discount_type = 'amount' then
    return pg_catalog.least(v_value, v_subtotal);
  end if;

  return pg_catalog.round(v_subtotal * v_value / 100, 2);
end;
$$;

revoke all on function public.validate_order_coupon_details(text) from public, anon;
grant execute on function public.validate_order_coupon_details(text) to authenticated;
revoke all on function public.calculate_order_coupon_discount(text, uuid) from public, anon;
grant execute on function public.calculate_order_coupon_discount(text, uuid) to authenticated;

do $$
declare
  v_function_oid oid := pg_catalog.to_regprocedure(
    'public.create_order(uuid,jsonb,text,text,text,time,text,boolean,boolean,text,date)'
  );
  v_definition text;
  v_old text;
  v_new text;
  v_occurrences integer;
begin
  if v_function_oid is null then
    raise exception 'No se encontró la función create_order con la firma esperada.';
  end if;

  v_definition := pg_catalog.pg_get_functiondef(v_function_oid);
  v_old := 'else public.validate_order_coupon(orders.coupon_code)';
  v_new := 'else public.calculate_order_coupon_discount(orders.coupon_code, v_order_id)';
  v_occurrences := (
    pg_catalog.length(v_definition) - pg_catalog.length(pg_catalog.replace(v_definition, v_old, ''))
  ) / pg_catalog.length(v_old);
  if v_occurrences <> 2 then
    raise exception 'La validación del cupón de create_order no coincide con la definición esperada.';
  end if;
  v_definition := pg_catalog.replace(v_definition, v_old, v_new);

  v_old := 'set coupon_discount = pg_catalog.round(subtotal.total * v_coupon_percent / 100, 2),';
  v_new := 'set coupon_discount = v_coupon_percent,';
  v_occurrences := (
    pg_catalog.length(v_definition) - pg_catalog.length(pg_catalog.replace(v_definition, v_old, ''))
  ) / pg_catalog.length(v_old);
  if v_occurrences <> 2 then
    raise exception 'La asignación del descuento de create_order no coincide con la definición esperada.';
  end if;
  v_definition := pg_catalog.replace(v_definition, v_old, v_new);

  v_old := '- pg_catalog.round(subtotal.total * v_coupon_percent / 100, 2)';
  v_new := '- v_coupon_percent';
  v_occurrences := (
    pg_catalog.length(v_definition) - pg_catalog.length(pg_catalog.replace(v_definition, v_old, ''))
  ) / pg_catalog.length(v_old);
  if v_occurrences <> 2 then
    raise exception 'El total con cupón de create_order no coincide con la definición esperada.';
  end if;

  execute pg_catalog.replace(v_definition, v_old, v_new);
end;
$$;
