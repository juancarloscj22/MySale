drop policy if exists "Customers can read their daily reward claims"
  on public.daily_reward_claims;

create policy "Active users can read their daily reward claims"
on public.daily_reward_claims
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
      and not profiles.blocked
  ) then
    raise exception 'Solo los usuarios activos pueden reclamar misiones.'
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
