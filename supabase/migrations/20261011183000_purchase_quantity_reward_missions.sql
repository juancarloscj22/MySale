alter table public.reward_missions
  drop constraint if exists reward_missions_type_check;

alter table public.reward_missions
  add constraint reward_missions_type_check
  check (type in ('daily_login', 'purchase_total', 'purchase_quantity'));

drop function if exists public.notify_purchase_mission_completed(uuid, text, text, integer, numeric);

create function public.notify_purchase_mission_completed(
  p_order_id uuid,
  p_mission_id text,
  p_mission_title text,
  p_points_awarded integer,
  p_purchase_target numeric,
  p_mission_type text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  completed_order public.orders%rowtype;
  purchased_quantity bigint;
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
    or p_purchase_target <= 0
    or p_mission_type is null
    or p_mission_type not in ('purchase_total', 'purchase_quantity')
    or (p_mission_type = 'purchase_quantity' and p_purchase_target <> trunc(p_purchase_target)) then
    raise exception 'Los datos de la misión completada no son válidos.'
      using errcode = '22023';
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

  if p_mission_type = 'purchase_total' and completed_order.total < p_purchase_target then
    raise exception 'El pedido no cumple el objetivo de gasto de la misión.'
      using errcode = '22023';
  end if;

  if p_mission_type = 'purchase_quantity' then
    select coalesce(sum(order_items.quantity), 0)
    into purchased_quantity
    from public.order_items
    where order_items.order_id = completed_order.id;

    if purchased_quantity < p_purchase_target then
      raise exception 'El pedido no cumple el objetivo de cantidad de la misión.'
        using errcode = '22023';
    end if;
  end if;

  insert into public.purchase_reward_mission_notifications (
    user_id, mission_id, order_id, mission_title, points_awarded, purchase_target
  )
  values (
    completed_order.user_id, p_mission_id, completed_order.id, trim(p_mission_title),
    p_points_awarded, p_purchase_target
  )
  on conflict (user_id, mission_id) do nothing;

  if not found then
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
      'Has completado una misión. Revisa tu panel de recompensas para canjear tus %s MayCoins por «%s».',
      p_points_awarded,
      trim(p_mission_title)
    ),
    0
  );

  return true;
end;
$$;

revoke all on function public.notify_purchase_mission_completed(uuid, text, text, integer, numeric, text)
  from public, anon;
grant execute on function public.notify_purchase_mission_completed(uuid, text, text, integer, numeric, text)
  to authenticated;
