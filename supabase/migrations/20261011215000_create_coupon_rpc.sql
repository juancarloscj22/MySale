create function public.create_coupon(
  p_code text,
  p_discount_type text,
  p_discount_value numeric,
  p_max_uses integer,
  p_expires_at timestamptz
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
  then
    raise exception 'El tipo o valor del descuento no es válido.'
      using errcode = '22023';
  end if;

  insert into public.coupons (
    code,
    discount_type,
    discount_value,
    discount_percent,
    max_uses,
    expires_at,
    created_by
  )
  values (
    v_code,
    p_discount_type,
    p_discount_value,
    case when p_discount_type = 'percent' then p_discount_value else null end,
    p_max_uses,
    p_expires_at,
    v_user_id
  )
  returning id into v_coupon_id;

  return v_coupon_id;
end;
$$;

revoke all on function public.create_coupon(text, text, numeric, integer, timestamptz) from public, anon;
grant execute on function public.create_coupon(text, text, numeric, integer, timestamptz) to authenticated;
