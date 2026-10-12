alter table public.reward_missions
  drop constraint if exists reward_missions_type_check;

alter table public.reward_missions
  add constraint reward_missions_type_check
  check (type in ('daily_login', 'purchase_total', 'purchase_quantity'));

alter table public.reward_missions
  add constraint reward_missions_quantity_target_check
  check (type <> 'purchase_quantity' or target_value = trunc(target_value));

insert into public.reward_missions (
  title, description, type, target_value, reward_points, active
)
select
  'Inicio de sesión diario',
  'Gana MayCoins por iniciar sesión cada día.',
  'daily_login',
  1,
  50,
  true
where not exists (
  select 1 from public.reward_missions where type = 'daily_login'
);

insert into public.reward_missions (
  title, description, type, target_value, reward_points, active
)
select
  'Compra mínima de $100',
  'Obtén MayCoins cuando superes $100 en una compra.',
  'purchase_total',
  100,
  120,
  true
where not exists (
  select 1 from public.reward_missions
  where type = 'purchase_total' and target_value = 100
);

update public.products
set reward_points_cost = greatest(100, round(price * 8)::integer)
where reward_points_cost = 0;

create table public.daily_reward_claims (
  user_id uuid not null references public.profiles (id) on delete cascade,
  mission_id uuid not null references public.reward_missions (id) on delete cascade,
  claim_date date not null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, mission_id, claim_date)
);
create index daily_reward_claims_user_date_idx
  on public.daily_reward_claims (user_id, claim_date);

alter table public.daily_reward_claims enable row level security;
revoke all on table public.daily_reward_claims from public, anon, authenticated;
grant select on table public.daily_reward_claims to authenticated;

create policy "Customers can read their daily reward claims"
on public.daily_reward_claims
for select
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'customer'::public.app_role
      and not profiles.blocked
  )
);

create table public.reward_product_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  points_spent integer not null check (points_spent > 0),
  redeemed_at timestamptz not null default now(),
  unique (user_id, product_id)
);

alter table public.reward_product_redemptions enable row level security;
revoke all on table public.reward_product_redemptions from public, anon, authenticated;
grant select on table public.reward_product_redemptions to authenticated;

create policy "Customers can read their product redemptions"
on public.reward_product_redemptions
for select
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'customer'::public.app_role
      and not profiles.blocked
  )
);

create policy "Admins can read product redemptions"
on public.reward_product_redemptions
for select
to authenticated
using ((select public.is_admin()));

revoke insert, update, delete on table public.user_reward_points
  from public, anon, authenticated;
grant select on table public.user_reward_points to authenticated;
revoke insert, update, delete on table public.reward_claims
  from public, anon, authenticated;
grant select on table public.reward_claims to authenticated;

create policy "Admins can read all reward balances"
on public.user_reward_points
for select
to authenticated
using ((select public.is_admin()));

create or replace function public.claim_daily_reward(p_mission_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  mission_record public.reward_missions%rowtype;
  updated_balance integer;
  current_claim_date date := (now() at time zone 'UTC')::date;
begin
  if current_user_id is null or not exists (
    select 1
    from public.profiles
    where profiles.id = current_user_id
      and profiles.role = 'customer'::public.app_role
      and not profiles.blocked
  ) then
    raise exception 'Solo los clientes activos pueden reclamar misiones.'
      using errcode = '42501';
  end if;

  select missions.*
  into mission_record
  from public.reward_missions as missions
  where missions.id = p_mission_id
    and missions.type = 'daily_login'
    and missions.active
  for share;

  if not found then
    raise exception 'La misión diaria no existe o está inactiva.'
      using errcode = 'P0002';
  end if;

  insert into public.daily_reward_claims (user_id, mission_id, claim_date)
  values (current_user_id, mission_record.id, current_claim_date)
  on conflict do nothing;

  if not found then
    raise exception 'Ya reclamaste esta misión diaria hoy.'
      using errcode = '23505';
  end if;

  insert into public.user_reward_points (user_id, points)
  values (current_user_id, mission_record.reward_points)
  on conflict (user_id) do update
    set points = public.user_reward_points.points + excluded.points
  returning points into updated_balance;

  insert into public.messages (created_by, recipient_user_id, title, body, reward_points)
  values (
    null,
    current_user_id,
    '¡Misión diaria completada!',
    pg_catalog.format(
      'Has completado la misión «%s» y recibiste %s MayCoins.',
      mission_record.title,
      mission_record.reward_points
    ),
    0
  );

  return updated_balance;
end;
$$;

revoke all on function public.claim_daily_reward(uuid) from public, anon;
grant execute on function public.claim_daily_reward(uuid) to authenticated;

drop function if exists public.notify_daily_reward_claimed();

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
begin
  if current_user_id is null or not exists (
    select 1
    from public.profiles
    where profiles.id = current_user_id
      and profiles.role = 'customer'::public.app_role
      and not profiles.blocked
  ) then
    raise exception 'Solo los clientes activos pueden canjear productos.'
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
    and products.active
  for update;

  if not found or reward_product.reward_points_cost <= 0 then
    raise exception 'El producto no está disponible para canje.'
      using errcode = 'P0002';
  end if;

  insert into public.user_reward_points (user_id, points)
  values (current_user_id, 0)
  on conflict (user_id) do nothing;

  select points.points
  into current_balance
  from public.user_reward_points as points
  where points.user_id = current_user_id
  for update;

  if exists (
    select 1
    from public.reward_product_redemptions as redemptions
    where redemptions.user_id = current_user_id
      and redemptions.product_id = p_product_id
  ) then
    raise exception 'Ya canjeaste este producto.'
      using errcode = '23505';
  end if;

  if current_balance < reward_product.reward_points_cost then
    raise exception 'No tienes suficientes MayCoins para este canje.'
      using errcode = '22023';
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

drop function if exists public.notify_purchase_mission_completed(uuid, text, text, integer, numeric);
drop function if exists public.notify_purchase_mission_completed(uuid, text, text, integer, numeric, text);

create function public.notify_purchase_mission_completed(
  p_order_id uuid,
  p_mission_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  mission_record public.reward_missions%rowtype;
  completed_order public.orders%rowtype;
  purchased_quantity bigint;
  notification_created boolean := false;
begin
  if current_user_id is null or not public.is_admin() then
    raise exception 'Solo administración o desarrollo puede notificar misiones de compra.'
      using errcode = '42501';
  end if;

  select missions.*
  into mission_record
  from public.reward_missions as missions
  where missions.id = p_mission_id
    and missions.active
    and missions.type in ('purchase_total', 'purchase_quantity')
  for share;

  if not found then
    raise exception 'La misión de compra no existe o está inactiva.'
      using errcode = 'P0002';
  end if;

  select orders.*
  into completed_order
  from public.orders
  where orders.id = p_order_id
    and orders.status = 'completed'::public.order_status
    and orders.user_id is not null
  for update;

  if not found then
    raise exception 'El pedido no está completado o no tiene un cliente asociado.'
      using errcode = '22023';
  end if;

  if mission_record.type = 'purchase_total'
    and completed_order.total < mission_record.target_value then
    raise exception 'El pedido no cumple el objetivo de gasto de la misión.'
      using errcode = '22023';
  end if;

  if mission_record.type = 'purchase_quantity' then
    select coalesce(sum(order_items.quantity), 0)
    into purchased_quantity
    from public.order_items
    where order_items.order_id = completed_order.id;

    if purchased_quantity < mission_record.target_value then
      raise exception 'El pedido no cumple el objetivo de cantidad de la misión.'
        using errcode = '22023';
    end if;
  end if;

  insert into public.purchase_reward_mission_notifications (
    user_id, mission_id, order_id, mission_title, points_awarded, purchase_target
  )
  values (
    completed_order.user_id,
    mission_record.id::text,
    completed_order.id,
    mission_record.title,
    mission_record.reward_points,
    mission_record.target_value
  )
  on conflict (user_id, mission_id) do nothing;

  notification_created := found;

  if not notification_created then
    update public.purchase_reward_mission_notifications
    set order_id = completed_order.id,
        mission_title = mission_record.title,
        points_awarded = mission_record.reward_points,
        purchase_target = mission_record.target_value,
        notified_at = now()
    where user_id = completed_order.user_id
      and mission_id = mission_record.id::text
      and points_awarded is null
      and claimed_at is null
    returning true into notification_created;

    if not coalesce(notification_created, false) then
      return false;
    end if;
  end if;

  insert into public.messages (created_by, recipient_user_id, title, body, reward_points)
  values (
    null,
    completed_order.user_id,
    '¡Misión completada!',
    pg_catalog.format(
      'Has completado la misión «%s». Revisa tu panel de recompensas para canjear tus %s MayCoins.',
      mission_record.title,
      mission_record.reward_points
    ),
    0
  );

  return true;
end;
$$;

revoke all on function public.notify_purchase_mission_completed(uuid, uuid) from public, anon;
grant execute on function public.notify_purchase_mission_completed(uuid, uuid) to authenticated;
