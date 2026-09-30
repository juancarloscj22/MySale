revoke delete on table public.products from public, anon, authenticated;

create function public.delete_product(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not (select public.is_developer()) then
    raise exception 'Solo un desarrollador activo puede eliminar productos.'
      using errcode = '42501';
  end if;

  delete from public.products
  where id = p_product_id;

  if not found then
    raise exception 'El producto no existe o ya fue eliminado.'
      using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.delete_product(uuid) from public, anon;
grant execute on function public.delete_product(uuid) to authenticated;
