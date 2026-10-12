create table public.daily_reward_notifications (
  user_id uuid not null references public.profiles (id) on delete cascade,
  claim_date date not null,
  notified_at timestamptz not null default now(),
  primary key (user_id, claim_date)
);

alter table public.daily_reward_notifications enable row level security;
revoke all on table public.daily_reward_notifications from public, anon, authenticated;

create or replace function public.notify_daily_reward_claimed()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null or not exists (
    select 1
    from public.profiles
    where profiles.id = current_user_id
      and profiles.role = 'customer'::public.app_role
      and not profiles.blocked
  ) then
    raise exception 'Solo los clientes activos pueden completar la misión diaria.'
      using errcode = '42501';
  end if;

  insert into public.daily_reward_notifications (user_id, claim_date)
  values (current_user_id, (now() at time zone 'utc')::date)
  on conflict (user_id, claim_date) do nothing;

  if not found then
    return false;
  end if;

  insert into public.messages (created_by, recipient_user_id, title, body, reward_points)
  values (
    null,
    current_user_id,
    '¡Misión diaria completada!',
    'Has completado una misión diaria. Por favor revisa tu panel de recompensas.',
    0
  );

  return true;
end;
$$;

revoke all on function public.notify_daily_reward_claimed() from public, anon;
grant execute on function public.notify_daily_reward_claimed() to authenticated;
