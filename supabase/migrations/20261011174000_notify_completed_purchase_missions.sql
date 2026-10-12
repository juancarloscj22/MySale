create table public.purchase_reward_mission_notifications (
  user_id uuid not null references public.profiles (id) on delete cascade,
  mission_id text not null,
  order_id uuid not null references public.orders (id) on delete cascade,
  notified_at timestamptz not null default now(),
  primary key (user_id, mission_id)
);

alter table public.purchase_reward_mission_notifications enable row level security;
revoke all on table public.purchase_reward_mission_notifications from public, anon, authenticated;

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

  insert into public.purchase_reward_mission_notifications (user_id, mission_id, order_id)
  values (completed_order.user_id, p_mission_id, completed_order.id)
  on conflict (user_id, mission_id) do nothing;

  if not found then
    return false;
  end if;

  insert into public.messages (created_by, recipient_user_id, title, body, reward_points)
  values (
    null,
    completed_order.user_id,
    '¡Misión completada!',
    pg_catalog.format(
      'Completaste la misión «%s» al completar tu pedido de %s %s. Recibiste %s MayCoins.',
      trim(p_mission_title),
      completed_order.currency_code,
      pg_catalog.to_char(completed_order.total, 'FM999999999990D00'),
      p_points_awarded
    ),
    0
  );

  return true;
end;
$$;

revoke all on function public.notify_purchase_mission_completed(uuid, text, text, integer, numeric)
  from public, anon;
grant execute on function public.notify_purchase_mission_completed(uuid, text, text, integer, numeric)
  to authenticated;
