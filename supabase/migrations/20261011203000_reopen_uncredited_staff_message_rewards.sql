delete from public.message_reward_claims as claims
using public.messages as messages,
      public.profiles as recipients
where claims.message_id = messages.id
  and claims.user_id = messages.recipient_user_id
  and recipients.id = messages.recipient_user_id
  and messages.reward_points > 0
  and recipients.role in (
    'admin'::public.app_role,
    'developer'::public.app_role
  )
  and not recipients.blocked
  and not exists (
    select 1
    from public.user_reward_points as balances
    where balances.user_id = recipients.id
      and balances.points > 0
  );
