create table public.messages (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles (id) on delete set null,
  recipient_user_id uuid references public.profiles (id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 120),
  body text not null check (length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);

create table public.message_reads (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index messages_recipient_created_at_idx
  on public.messages (recipient_user_id, created_at desc);
create index messages_created_by_created_at_idx
  on public.messages (created_by, created_at desc);

alter table public.messages enable row level security;
alter table public.message_reads enable row level security;

revoke all on table public.messages, public.message_reads from public, anon, authenticated;
grant select, insert on table public.messages to authenticated;
grant select, insert on table public.message_reads to authenticated;

create policy "Users can read broadcast, own, or authored messages"
on public.messages
for select
to authenticated
using (
  recipient_user_id is null
  or recipient_user_id = (select auth.uid())
  or created_by = (select auth.uid())
);

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
        and profiles.role = 'customer'::public.app_role
        and not profiles.blocked
    )
  )
);

create policy "Users can read own message receipts"
on public.message_reads
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Users can mark messages addressed to them as read"
on public.message_reads
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.messages
    where messages.id = message_reads.message_id
      and (
        messages.recipient_user_id is null
        or messages.recipient_user_id = (select auth.uid())
      )
  )
);
