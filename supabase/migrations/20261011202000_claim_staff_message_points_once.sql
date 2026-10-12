insert into public.message_reward_claims (message_id, user_id)
select messages.id, messages.recipient_user_id
from public.messages
join public.profiles
  on profiles.id = messages.recipient_user_id
where messages.reward_points > 0
  and profiles.role in (
    'admin'::public.app_role,
    'developer'::public.app_role
  )
on conflict (message_id, user_id) do nothing;

drop trigger if exists messages_grant_reward_points on public.messages;
drop function if exists public.grant_message_reward_points();
