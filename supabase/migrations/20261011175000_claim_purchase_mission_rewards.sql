alter table public.purchase_reward_mission_notifications
  add column mission_title text,
  add column points_awarded integer check (points_awarded is null or points_awarded > 0),
  add column purchase_target numeric check (purchase_target is null or purchase_target > 0),
  add column claimed_at timestamptz;

create policy "Customers can read their purchase mission rewards"
on public.purchase_reward_mission_notifications
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

grant select on table public.purchase_reward_mission_notifications to authenticated;

create or replace function public.notify_purchase_mission_completed(
  p_order_id uuid,
  p_mission_id text,
  p_mission_title text,
  p_points_awarded integer,
  p_purchase_target numeric
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  completed_order public.orders%rowtype;
  notification_created boolean := false;
begin
  if current_user_id is null or not public.is_admin() then
    raise exception 'Solo administración o desarrollo puede notificar misiones de compra.'
      using errcode = '42501';
  end if;

  if p_order_id is null
    or p_mission_id is null
    or length(trim(p_mission_id)) not between 1 and 120
    or p_mission_title is null
    or length(trim(p_mission_title)) not between 1 and 120
    or p_points_awarded is null
    or p_points_awarded <= 0
    or p_purchase_target is null
    or p_purchase_target <= 0 then
    raise exception 'Los datos de la misión completada no son válidos.'
      using errcode = '22023';
  end if;

  select orders.*
  into completed_order
  from public.orders
  where orders.id = p_order_id
    and orders.status = 'completed'::public.order_status
    and orders.total >= p_purchase_target
    and orders.user_id is not null
  for update;

  if not found then
    raise exception 'El pedido no está completado o no cumple el objetivo de la misión.'
      using errcode = '22023';
  end if;

  insert into public.purchase_reward_mission_notifications (
    user_id, mission_id, order_id, mission_title, points_awarded, purchase_target
  )
  values (
    completed_order.user_id, p_mission_id, completed_order.id, trim(p_mission_title),
    p_points_awarded, p_purchase_target
  )
  on conflict (user_id, mission_id) do nothing;

  notification_created := found;

  if not notification_created then
    update public.purchase_reward_mission_notifications
    set order_id = completed_order.id,
        mission_title = trim(p_mission_title),
        points_awarded = p_points_awarded,
        purchase_target = p_purchase_target,
        notified_at = now()
    where user_id = completed_order.user_id
      and mission_id = p_mission_id
      and points_awarded is null
      and claimed_at is null
    returning true into notification_created;

    notification_created := coalesce(notification_created, false);
  end if;

  if not notification_created then
    return false;
  end if;

  insert into public.messages (created_by, recipient_user_id, title, body, reward_points)
  values (
    null,
    completed_order.user_id,
    '¡Misión completada!',
    pg_catalog.format(
      'Has completado una misión. Por favor revisa tu panel de recompensas para canjear tus %s MayCoins por «%s».',
      p_points_awarded,
      trim(p_mission_title)
    ),
    0
  );

  return true;
end;
$$;

create or replace function public.claim_purchase_mission_reward(p_mission_id text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  reward_claim public.purchase_reward_mission_notifications%rowtype;
  updated_balance integer;
begin
  if current_user_id is null or not exists (
    select 1
    from public.profiles
    where profiles.id = current_user_id
      and profiles.role = 'customer'::public.app_role
      and not profiles.blocked
  ) then
    raise exception 'Solo los clientes activos pueden canjear esta misión.'
      using errcode = '42501';
  end if;

  if p_mission_id is null or length(trim(p_mission_id)) not between 1 and 120 then
    raise exception 'La misión indicada no es válida.'
      using errcode = '22023';
  end if;

  select notifications.*
  into reward_claim
  from public.purchase_reward_mission_notifications as notifications
  where notifications.user_id = current_user_id
    and notifications.mission_id = p_mission_id
    and notifications.points_awarded is not null
  for update;

  if not found then
    raise exception 'No tienes una recompensa completada disponible para esta misión.'
      using errcode = 'P0002';
  end if;

  if reward_claim.claimed_at is not null then
    raise exception 'Esta recompensa ya fue canjeada.'
      using errcode = '22023';
  end if;

  insert into public.user_reward_points (user_id, points)
  values (current_user_id, reward_claim.points_awarded)
  on conflict (user_id) do update
    set points = public.user_reward_points.points + excluded.points
  returning points into updated_balance;

  update public.purchase_reward_mission_notifications
  set claimed_at = now()
  where user_id = current_user_id
    and mission_id = p_mission_id;

  return updated_balance;
end;
$$;

revoke all on function public.claim_purchase_mission_reward(text) from public, anon;
grant execute on function public.claim_purchase_mission_reward(text) to authenticated;
