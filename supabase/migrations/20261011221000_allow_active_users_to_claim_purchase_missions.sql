drop policy if exists "Customers can read their purchase mission rewards"
  on public.purchase_reward_mission_notifications;

create policy "Active users can read their purchase mission rewards"
on public.purchase_reward_mission_notifications
for select
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and not profiles.blocked
  )
);

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
      and not profiles.blocked
  ) then
    raise exception 'Solo los usuarios activos pueden canjear esta misión.'
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
