create type public.app_role as enum ('customer', 'admin', 'developer');
create type public.order_status as enum (
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'in_transit',
  'completed',
  'cancelled'
);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  role public.app_role not null default 'customer',
  blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) > 0),
  slug text not null unique check (length(trim(slug)) > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  description text,
  price numeric(10, 2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  brand text,
  category_id uuid references public.categories (id) on delete set null,
  flavor text,
  nicotine text,
  puffs integer check (puffs is null or puffs > 0),
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  total numeric(10, 2) not null check (total >= 0),
  currency_code text not null default 'MXN'
    check (currency_code ~ '^[A-Z]{3}$'),
  status public.order_status not null default 'pending',
  whatsapp_sent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null check (length(trim(product_name)) > 0),
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  subtotal numeric(12, 2) generated always as (quantity * unit_price) stored
);

create table public.site_settings (
  id boolean primary key default true check (id),
  whatsapp_number text,
  store_name text not null default 'MySale Shop',
  logo_url text,
  whatsapp_message text,
  currency_code text not null default 'MXN'
    check (currency_code ~ '^[A-Z]{3}$'),
  updated_at timestamptz not null default now()
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  action text not null check (length(trim(action)) > 0),
  entity text not null check (length(trim(entity)) > 0),
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.site_settings (id) values (true);

create index products_active_category_idx
  on public.products (category_id)
  where active;
create index products_active_name_idx
  on public.products (name)
  where active;
create index orders_user_created_at_idx
  on public.orders (user_id, created_at desc);
create index orders_status_created_at_idx
  on public.orders (status, created_at desc);
create index order_items_order_id_idx
  on public.order_items (order_id);
create index order_items_product_id_idx
  on public.order_items (product_id);
create index activity_logs_user_created_at_idx
  on public.activity_logs (user_id, created_at desc);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();
create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();
create trigger site_settings_set_updated_at
before update on public.site_settings
for each row execute function public.set_updated_at();

create function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.site_settings enable row level security;
alter table public.activity_logs enable row level security;
