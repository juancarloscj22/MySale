create function public.delete_coupon(p_coupon_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not (select public.is_developer()) then
    raise exception 'Solo un desarrollador activo puede eliminar cupones.'
      using errcode = '42501';
  end if;

  delete from public.coupons
  where id = p_coupon_id;

  if not found then
    raise exception 'El cupón no existe o ya fue eliminado.'
      using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.delete_coupon(uuid) from public, anon;
grant execute on function public.delete_coupon(uuid) to authenticated;
