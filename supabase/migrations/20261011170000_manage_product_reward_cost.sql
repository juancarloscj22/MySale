create or replace function public.set_product_reward_points_cost(
  p_product_id uuid,
  p_reward_points_cost integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Solo administración puede modificar productos.'
      using errcode = '42501';
  end if;

  if p_product_id is null or p_reward_points_cost is null or p_reward_points_cost <= 0 then
    raise exception 'El producto y el costo de canje deben ser válidos.'
      using errcode = '22023';
  end if;

  update public.products
  set reward_points_cost = p_reward_points_cost
  where id = p_product_id;

  if not found then
    raise exception 'No se encontró el producto que intentas actualizar.'
      using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_product_reward_points_cost(uuid, integer) from public, anon;
grant execute on function public.set_product_reward_points_cost(uuid, integer) to authenticated;
