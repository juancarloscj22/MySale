create or replace function public.grant_message_reward_points()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  sender_role public.app_role;
  recipient_role public.app_role;
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
    raise exception 'Solo administración puede enviar puntos por mensaje.'
      using errcode = '42501';
  end if;

  if new.recipient_user_id is not null then
    select profiles.role
    into recipient_role
    from public.profiles
    where profiles.id = new.recipient_user_id
      and not profiles.blocked;

    if recipient_role is null
      or recipient_role not in (
        'customer'::public.app_role,
        'admin'::public.app_role,
        'developer'::public.app_role
      ) then
      raise exception 'El destinatario no tiene un rol activo que pueda recibir puntos.'
        using errcode = '22023';
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
    raise exception 'Debes iniciar sesión para recibir puntos.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles
    where profiles.id = current_user_id
      and profiles.role in (
        'customer'::public.app_role,
        'admin'::public.app_role,
        'developer'::public.app_role
      )
      and not profiles.blocked
  ) then
    raise exception 'Solo las cuentas activas pueden recibir puntos.'
      using errcode = '42501';
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
    raise exception 'El mensaje no existe o no está dirigido a tu cuenta.'
      using errcode = 'P0002';
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

drop policy if exists "Admins and developers can create messages"
  on public.messages;

create policy "Admins and developers can create messages"
on public.messages
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and (select public.is_admin())
  and (
    recipient_user_id is null
    or exists (
      select 1
      from public.profiles
      where profiles.id = messages.recipient_user_id
        and profiles.role in (
          'customer'::public.app_role,
          'admin'::public.app_role,
          'developer'::public.app_role
        )
        and not profiles.blocked
    )
  )
);
