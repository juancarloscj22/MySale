alter table public.coupons
  add column max_uses integer
    check (max_uses is null or max_uses > 0),
  add column used_count integer not null default 0
    check (used_count >= 0);

update public.coupons
set used_count = usage_counts.total
from (
  select orders.coupon_code, count(*)::integer as total
  from public.orders
  where orders.coupon_code is not null
  group by orders.coupon_code
) as usage_counts
where public.coupons.code = usage_counts.coupon_code;

alter table public.coupons
  add constraint coupons_usage_within_limit
  check (max_uses is null or used_count <= max_uses);

create or replace function public.validate_order_coupon(p_code text)
returns numeric
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

  return v_coupon.discount_percent;
end;
$$;

create function public.increment_coupon_usage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_coupon public.coupons%rowtype;
begin
  if new.coupon_code is null then
    return new;
  end if;

  if old.coupon_code is not null then
    if new.coupon_code is distinct from old.coupon_code then
      raise exception 'El cupón aplicado a un pedido no se puede cambiar.'
        using errcode = '22023';
    end if;
    return new;
  end if;

  select coupons.*
  into v_coupon
  from public.coupons
  where coupons.code = new.coupon_code
  for update;

  if not found
    or not v_coupon.active
    or (v_coupon.expires_at is not null and v_coupon.expires_at <= pg_catalog.now())
    or (v_coupon.max_uses is not null and v_coupon.used_count >= v_coupon.max_uses)
  then
    raise exception 'El cupón no existe, venció o alcanzó su límite de usos.'
      using errcode = 'P0002';
  end if;

  update public.coupons
  set used_count = used_count + 1
  where id = v_coupon.id;

  return new;
end;
$$;

create trigger orders_increment_coupon_usage
before update of coupon_code on public.orders
for each row
when (new.coupon_code is distinct from old.coupon_code)
execute function public.increment_coupon_usage();

revoke all on function public.increment_coupon_usage() from public, anon, authenticated;
revoke all on function public.validate_order_coupon(text) from public, anon;
grant execute on function public.validate_order_coupon(text) to authenticated;
