insert into public.user_reward_points (user_id, points)
select profiles.id, 0
from public.profiles
on conflict (user_id) do nothing;

create or replace function public.initialize_user_reward_points()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_reward_points (user_id, points)
  values (new.id, 0)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function public.initialize_user_reward_points() from public, anon, authenticated;

drop trigger if exists profiles_initialize_reward_points on public.profiles;

create trigger profiles_initialize_reward_points
after insert on public.profiles
for each row execute function public.initialize_user_reward_points();
