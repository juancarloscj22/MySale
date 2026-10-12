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
          'developer'::public.app_role
        )
        and not profiles.blocked
    )
  )
);
