alter table public.messages
  add column if not exists reward_points integer not null default 0
  check (reward_points >= 0);

drop policy if exists "Users can update their own reward balance"
  on public.user_reward_points;
revoke insert, update on table public.user_reward_points from public, anon, authenticated;
grant select on table public.user_reward_points to authenticated;

create or replace function public.grant_message_reward_points()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  sender_role public.app_role;
begin
  if new.reward_points = 0 then
    return new;
  end if;

  select profiles.role
  into sender_role
  from public.profiles
  where profiles.id = new.created_by
    and not profiles.blocked;

  if sender_role is null
    or sender_role not in ('admin'::public.app_role, 'developer'::public.app_role) then
    raise exception 'Solo administración puede enviar puntos por mensaje.';
  end if;

  if new.recipient_user_id is not null then
    if not exists (
      select 1
      from public.profiles
      where profiles.id = new.recipient_user_id
        and profiles.role = 'customer'::public.app_role
        and not profiles.blocked
    ) then
      raise exception 'El destinatario no es un cliente activo.';
    end if;

    insert into public.user_reward_points (user_id, points)
    values (new.recipient_user_id, new.reward_points)
    on conflict (user_id) do update
      set points = public.user_reward_points.points + excluded.points;
  else
    insert into public.user_reward_points (user_id, points)
    select profiles.id, new.reward_points
    from public.profiles
    where profiles.role = 'customer'::public.app_role
      and not profiles.blocked
    on conflict (user_id) do update
      set points = public.user_reward_points.points + excluded.points;
  end if;

  return new;
end;
$$;

revoke all on function public.grant_message_reward_points() from public, anon, authenticated;

drop trigger if exists messages_grant_reward_points on public.messages;
create trigger messages_grant_reward_points
after insert on public.messages
for each row execute function public.grant_message_reward_points();
