create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'::public.app_role
      and not blocked
  );
$$;

create function public.is_developer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'developer'::public.app_role
      and not blocked
  );
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_developer() from public;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_developer() to anon, authenticated;

create policy "Public can read active categories"
on public.categories
for select
to anon, authenticated
using (active or (select public.is_admin()));

create policy "Admins can manage categories"
on public.categories
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Public can read active products"
on public.products
for select
to anon, authenticated
using (active or (select public.is_admin()));

create policy "Admins can manage products"
on public.products
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (id = (select auth.uid()) or (select public.is_admin()));

create policy "Users can read own orders"
on public.orders
for select
to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "Admins can manage orders"
on public.orders
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Users can read own order items"
on public.order_items
for select
to authenticated
using (
  (select public.is_admin())
  or exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = (select auth.uid())
  )
);

create policy "Admins can manage order items"
on public.order_items
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Anyone can read public store settings"
on public.site_settings
for select
to anon, authenticated
using (true);

create policy "Admins can manage store settings"
on public.site_settings
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Admins can read activity logs"
on public.activity_logs
for select
to authenticated
using ((select public.is_admin()));
