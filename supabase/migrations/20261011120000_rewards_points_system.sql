alter table public.products
  add column if not exists reward_points_cost integer not null default 0 check (reward_points_cost >= 0);

create table if not exists public.reward_missions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  description text not null default '',
  type text not null check (type in ('daily_login', 'purchase_total')),
  target_value numeric(10, 2) not null default 1 check (target_value >= 0),
  reward_points integer not null default 50 check (reward_points > 0),
  active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_reward_points (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  points integer not null default 0 check (points >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.reward_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  mission_id uuid not null references public.reward_missions (id) on delete cascade,
  points_awarded integer not null check (points_awarded > 0),
  claimed_at timestamptz not null default now(),
  unique (user_id, mission_id)
);

create trigger reward_missions_set_updated_at
before update on public.reward_missions
for each row execute function public.set_updated_at();

create trigger user_reward_points_set_updated_at
before update on public.user_reward_points
for each row execute function public.set_updated_at();

alter table public.reward_missions enable row level security;
alter table public.user_reward_points enable row level security;
alter table public.reward_claims enable row level security;

revoke all on table public.reward_missions, public.user_reward_points, public.reward_claims from public, anon, authenticated;

grant select on table public.reward_missions to authenticated;
grant insert, update, delete on table public.reward_missions to authenticated;
grant select, insert, update on table public.user_reward_points to authenticated;
grant select, insert on table public.reward_claims to authenticated;

create policy "Customers can read active reward missions"
on public.reward_missions
for select
to authenticated
using (active);

create policy "Admins and developers can manage missions"
on public.reward_missions
for all
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin'::public.app_role, 'developer'::public.app_role)
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin'::public.app_role, 'developer'::public.app_role)
  )
);

create policy "Users can read their own reward balance"
on public.user_reward_points
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can update their own reward balance"
on public.user_reward_points
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can read their own reward claims"
on public.reward_claims
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can insert their own reward claims"
on public.reward_claims
for insert
to authenticated
with check (user_id = auth.uid());
