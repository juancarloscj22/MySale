drop policy if exists "Customers can read their product redemptions"
  on public.reward_product_redemptions;

create policy "Active users can read their product redemptions"
on public.reward_product_redemptions
for select
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role in (
        'customer'::public.app_role,
        'admin'::public.app_role,
        'developer'::public.app_role
      )
      and not profiles.blocked
  )
);

create or replace function public.redeem_product_for_points(p_product_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  reward_product public.products%rowtype;
  current_balance integer;
  updated_balance integer;
  store_accepting_orders boolean;
  flavor_id uuid;
begin
  if current_user_id is null or not exists (
    select 1
    from public.profiles
    where profiles.id = current_user_id
      and profiles.role in (
        'customer'::public.app_role,
        'admin'::public.app_role,
        'developer'::public.app_role
      )
      and not profiles.blocked
  ) then
    raise exception 'Solo las cuentas activas pueden canjear productos.'
      using errcode = '42501';
  end if;

  select settings.accepting_orders
  into store_accepting_orders
  from public.site_settings as settings
  where settings.id;

  if not coalesce(store_accepting_orders, false) then
    raise exception 'La tienda está cerrada y no acepta canjes.'
      using errcode = '22023';
  end if;

  select products.*
  into reward_product
  from public.products
  where products.id = p_product_id
  for update;

  if not found or not reward_product.active or reward_product.reward_points_cost <= 0 then
    raise exception 'El producto no está disponible para canje.'
      using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.reward_product_redemptions as redemptions
    where redemptions.user_id = current_user_id
      and redemptions.product_id = p_product_id
  ) then
    raise exception 'Ya canjeaste este producto.'
      using errcode = '23505';
  end if;

  insert into public.user_reward_points (user_id, points)
  values (current_user_id, 0)
  on conflict (user_id) do nothing;

  select points.points
  into current_balance
  from public.user_reward_points as points
  where points.user_id = current_user_id
  for update;

  if current_balance < reward_product.reward_points_cost then
    raise exception 'No tienes suficientes MayCoins para este canje.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.product_flavors
    where product_flavors.product_id = p_product_id
  ) then
    select product_flavors.id
    into flavor_id
    from public.product_flavors
    where product_flavors.product_id = p_product_id
      and product_flavors.active
      and product_flavors.stock > 0
    order by product_flavors.stock desc, product_flavors.id
    limit 1
    for update;

    if not found then
      raise exception 'El producto está agotado y no se puede canjear.'
        using errcode = '22023';
    end if;

    update public.product_flavors
    set stock = product_flavors.stock - 1
    where product_flavors.id = flavor_id
      and product_flavors.stock > 0;

    if not found then
      raise exception 'El producto se agotó; actualiza la página e inténtalo de nuevo.'
        using errcode = '40001';
    end if;
  else
    update public.products
    set stock = products.stock - 1
    where products.id = p_product_id
      and products.active
      and products.stock > 0;

    if not found then
      raise exception 'El producto está agotado y no se puede canjear.'
        using errcode = '22023';
    end if;
  end if;

  update public.user_reward_points
  set points = points - reward_product.reward_points_cost
  where user_id = current_user_id
    and points >= reward_product.reward_points_cost
  returning points into updated_balance;

  if not found then
    raise exception 'El saldo cambió; actualiza la página e inténtalo de nuevo.'
      using errcode = '40001';
  end if;

  insert into public.reward_product_redemptions (
    user_id, product_id, product_name, points_spent
  )
  values (
    current_user_id, reward_product.id, reward_product.name,
    reward_product.reward_points_cost
  );

  insert into public.messages (created_by, recipient_user_id, title, body, reward_points)
  values (
    null,
    current_user_id,
    '¡Canje registrado!',
    pg_catalog.format(
      'Tu canje del producto «%s» por %s MayCoins quedó registrado. Administración coordinará la entrega.',
      reward_product.name,
      reward_product.reward_points_cost
    ),
    0
  );

  return updated_balance;
end;
$$;

revoke all on function public.redeem_product_for_points(uuid) from public, anon;
grant execute on function public.redeem_product_for_points(uuid) to authenticated;
