drop trigger if exists messages_grant_reward_points on public.messages;

create table public.message_reward_claims (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  claimed_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

alter table public.message_reward_claims enable row level security;
revoke all on table public.message_reward_claims from public, anon, authenticated;
grant select on table public.message_reward_claims to authenticated;

create policy "Users can read their own message reward claims"
on public.message_reward_claims
for select
to authenticated
using (user_id = (select auth.uid()));

insert into public.message_reward_claims (message_id, user_id)
select messages.id, profiles.id
from public.messages
join public.profiles
  on messages.recipient_user_id is null
  or messages.recipient_user_id = profiles.id
where messages.reward_points > 0
on conflict (message_id, user_id) do nothing;

create or replace function public.claim_message_points(p_message_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  points_to_award integer;
begin
  if current_user_id is null then
    raise exception 'Debes iniciar sesión para recibir puntos.';
  end if;

  if not exists (
    select 1
    from public.profiles
    where profiles.id = current_user_id
      and profiles.role = 'customer'::public.app_role
      and not profiles.blocked
  ) then
    raise exception 'Solo los clientes activos pueden recibir puntos.';
  end if;

  select messages.reward_points
  into points_to_award
  from public.messages
  where messages.id = p_message_id
    and messages.reward_points > 0
    and (
      messages.recipient_user_id is null
      or messages.recipient_user_id = current_user_id
    );

  if points_to_award is null then
    raise exception 'El mensaje no existe o no está dirigido a tu cuenta.';
  end if;

  insert into public.message_reward_claims (message_id, user_id)
  values (p_message_id, current_user_id)
  on conflict (message_id, user_id) do nothing;

  if not found then
    return 0;
  end if;

  insert into public.user_reward_points (user_id, points)
  values (current_user_id, points_to_award)
  on conflict (user_id) do update
    set points = public.user_reward_points.points + excluded.points;

  return points_to_award;
end;
$$;

revoke all on function public.claim_message_points(uuid) from public, anon;
grant execute on function public.claim_message_points(uuid) to authenticated;
