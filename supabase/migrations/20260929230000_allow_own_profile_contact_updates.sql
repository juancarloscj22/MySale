revoke update on table public.profiles from authenticated;
grant update (full_name, phone) on table public.profiles to authenticated;

create policy "Users can update own contact details"
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));
