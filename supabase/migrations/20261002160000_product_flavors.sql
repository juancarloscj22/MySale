create table public.product_flavors (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  flavor text not null check (length(trim(flavor)) between 1 and 100),
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index product_flavors_product_name_idx
  on public.product_flavors (product_id, pg_catalog.lower(flavor));
create index product_flavors_active_product_idx
  on public.product_flavors (product_id)
  where active;

insert into public.product_flavors (product_id, flavor, stock, active)
select
  products.id,
  coalesce(nullif(pg_catalog.btrim(products.flavor), ''), 'Original'),
  products.stock,
  true
from public.products
on conflict do nothing;

alter table public.product_flavors enable row level security;
revoke all on table public.product_flavors from public, anon, authenticated;
grant select on table public.product_flavors to anon, authenticated;

create policy "Public can read active product flavors"
on public.product_flavors
for select
to anon, authenticated
using (active or (select public.is_admin()));

create function public.refresh_product_stock_from_flavors()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product_id uuid;
begin
  if tg_op = 'DELETE' then
    v_product_id := old.product_id;
  else
    v_product_id := new.product_id;
  end if;

  update public.products
  set stock = (
    select coalesce(sum(product_flavors.stock), 0)::integer
    from public.product_flavors
    where product_flavors.product_id = v_product_id
      and product_flavors.active
  )
  where id = v_product_id;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger product_flavors_refresh_product_stock
after insert or update of stock, active or delete on public.product_flavors
for each row
execute function public.refresh_product_stock_from_flavors();

create trigger product_flavors_set_updated_at
before update on public.product_flavors
for each row
execute function public.set_updated_at();

alter table public.order_items
  add column product_flavor_id uuid references public.product_flavors (id) on delete set null,
  add column flavor_name text;

update public.order_items
set product_flavor_id = product_flavors.id,
    flavor_name = coalesce(
      nullif(pg_catalog.btrim(products.flavor), ''),
      product_flavors.flavor
    )
from public.products
join public.product_flavors
  on product_flavors.product_id = products.id
where public.order_items.product_id = products.id
  and public.order_items.product_flavor_id is null;

create function public.save_product(
  p_product_id uuid,
  p_name text,
  p_description text,
  p_price numeric,
  p_discount_percent numeric,
  p_brand text,
  p_category_id uuid,
  p_nicotine text,
  p_puffs integer,
  p_image_url text,
  p_active boolean,
  p_flavors jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product_id uuid := p_product_id;
  v_flavor jsonb;
  v_flavor_id uuid;
  v_flavor_name text;
  v_flavor_stock integer;
  v_flavor_active boolean;
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Solo administración puede guardar productos.'
      using errcode = '42501';
  end if;

  if p_name is null or length(pg_catalog.btrim(p_name)) not between 1 and 200
     or p_price is null or p_price < 0
     or p_discount_percent is null or p_discount_percent < 0 or p_discount_percent > 100
     or p_active is null
     or p_flavors is null
  then
    raise exception 'Los datos del producto no son válidos.'
      using errcode = '22023';
  end if;

  if pg_catalog.jsonb_typeof(p_flavors) <> 'array' then
    raise exception 'Los sabores deben enviarse como una lista.'
      using errcode = '22023';
  end if;

  if pg_catalog.jsonb_array_length(p_flavors) not between 1 and 100 then
    raise exception 'El producto debe tener entre 1 y 100 sabores.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_flavors) as flavors(value)
    where pg_catalog.jsonb_typeof(flavors.value) <> 'object'
       or nullif(pg_catalog.btrim(flavors.value ->> 'flavor'), '') is null
       or length(pg_catalog.btrim(flavors.value ->> 'flavor')) > 100
       or jsonb_typeof(flavors.value -> 'stock') is distinct from 'number'
       or (flavors.value ->> 'stock') !~ '^[0-9]{1,9}$'
       or jsonb_typeof(flavors.value -> 'active') is distinct from 'boolean'
  ) then
    raise exception 'Cada sabor debe tener un nombre, stock entero y estado válido.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_flavors) as flavors(value)
    where flavors.value -> 'active' = 'true'::jsonb
  ) then
    raise exception 'El producto debe tener al menos un sabor activo.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_flavors) as flavors(value)
    group by pg_catalog.lower(pg_catalog.btrim(flavors.value ->> 'flavor'))
    having count(*) > 1
  ) then
    raise exception 'Los sabores de un producto no se pueden repetir.'
      using errcode = '22023';
  end if;

  if v_product_id is null then
    insert into public.products (
      name, description, price, discount_percent, stock, brand,
      category_id, flavor, nicotine, puffs, image_url, active
    )
    values (
      pg_catalog.btrim(p_name), nullif(pg_catalog.btrim(p_description), ''),
      p_price, p_discount_percent, 0, nullif(pg_catalog.btrim(p_brand), ''),
      p_category_id, null, nullif(pg_catalog.btrim(p_nicotine), ''),
      p_puffs, nullif(pg_catalog.btrim(p_image_url), ''), p_active
    )
    returning id into v_product_id;
  else
    update public.products
    set name = pg_catalog.btrim(p_name),
        description = nullif(pg_catalog.btrim(p_description), ''),
        price = p_price,
        discount_percent = p_discount_percent,
        brand = nullif(pg_catalog.btrim(p_brand), ''),
        category_id = p_category_id,
        nicotine = nullif(pg_catalog.btrim(p_nicotine), ''),
        puffs = p_puffs,
        image_url = nullif(pg_catalog.btrim(p_image_url), ''),
        active = p_active
    where id = v_product_id;

    if not found then
      raise exception 'No se encontró el producto que intentas editar.'
        using errcode = 'P0002';
    end if;
  end if;

  for v_flavor in
    select value from pg_catalog.jsonb_array_elements(p_flavors)
  loop
    v_flavor_name := pg_catalog.btrim(v_flavor ->> 'flavor');
    v_flavor_stock := (v_flavor ->> 'stock')::integer;
    v_flavor_active := (v_flavor ->> 'active')::boolean;

    if nullif(v_flavor ->> 'id', '') is not null then
      if (v_flavor ->> 'id') !~
        '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      then
        raise exception 'El identificador de un sabor no es válido.'
          using errcode = '22023';
      end if;

      update public.product_flavors
      set flavor = v_flavor_name,
          stock = v_flavor_stock,
          active = v_flavor_active
      where id = (v_flavor ->> 'id')::uuid
        and product_id = v_product_id
      returning id into v_flavor_id;

      if not found then
        raise exception 'Uno de los sabores no pertenece a este producto.'
          using errcode = '22023';
      end if;
    else
      select id into v_flavor_id
      from public.product_flavors
      where product_id = v_product_id
        and pg_catalog.lower(flavor) = pg_catalog.lower(v_flavor_name)
      for update;

      if found then
        update public.product_flavors
        set stock = v_flavor_stock,
            active = v_flavor_active
        where id = v_flavor_id;
      else
        insert into public.product_flavors (product_id, flavor, stock, active)
        values (v_product_id, v_flavor_name, v_flavor_stock, v_flavor_active)
        returning id into v_flavor_id;
      end if;
    end if;
  end loop;

  update public.products
  set flavor = (
    select pg_catalog.string_agg(product_flavors.flavor, ', ' order by product_flavors.flavor)
    from public.product_flavors
    where product_flavors.product_id = v_product_id
      and product_flavors.active
  )
  where id = v_product_id;

  return v_product_id;
end;
$$;

revoke all on function public.save_product(uuid, text, text, numeric, numeric, text, uuid, text, integer, text, boolean, jsonb) from public, anon;
grant execute on function public.save_product(uuid, text, text, numeric, numeric, text, uuid, text, integer, text, boolean, jsonb) to authenticated;

create or replace function public.set_order_status(
  p_order_id uuid,
  p_status public.order_status
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Solo administración puede actualizar pedidos.'
      using errcode = '42501';
  end if;

  if p_order_id is null or p_status is null then
    raise exception 'El pedido y el nuevo estado son obligatorios.'
      using errcode = '22023';
  end if;

  select orders.* into v_order
  from public.orders
  where orders.id = p_order_id
  for update;

  if not found then
    raise exception 'No se encontró el pedido.'
      using errcode = 'P0002';
  end if;

  if v_order.status = 'cancelled' and p_status <> 'cancelled' then
    raise exception 'Un pedido cancelado no se puede reabrir; crea un pedido nuevo.'
      using errcode = '22023';
  end if;

  if v_order.status = 'completed' and p_status <> 'completed' then
    raise exception 'Un pedido completado no se puede modificar.'
      using errcode = '22023';
  end if;

  if p_status = 'cancelled'
     and v_order.status not in ('pending', 'confirmed', 'preparing', 'ready', 'cancelled') then
    raise exception 'Solo se pueden cancelar pedidos que aún no están en tránsito.'
      using errcode = '22023';
  end if;

  if v_order.status <> 'cancelled' and p_status = 'cancelled' then
    for v_item in
      select order_items.product_id
      from public.order_items
      where order_items.order_id = v_order.id
        and order_items.product_id is not null
      group by order_items.product_id
      order by order_items.product_id
    loop
      perform 1
      from public.products
      where products.id = v_item.product_id
      for update;
    end loop;

    for v_item in
      select order_items.product_flavor_id,
             sum(order_items.quantity)::integer as quantity
      from public.order_items
      where order_items.order_id = v_order.id
        and order_items.product_flavor_id is not null
      group by order_items.product_flavor_id
      order by order_items.product_flavor_id
    loop
      update public.product_flavors
      set stock = product_flavors.stock + v_item.quantity
      where id = v_item.product_flavor_id;
    end loop;

    for v_item in
      select order_items.product_id,
             sum(order_items.quantity)::integer as quantity
      from public.order_items
      where order_items.order_id = v_order.id
        and order_items.product_id is not null
        and order_items.product_flavor_id is null
      group by order_items.product_id
      order by order_items.product_id
    loop
      update public.products
      set stock = products.stock + v_item.quantity
      where id = v_item.product_id;
    end loop;
  end if;

  update public.orders
  set status = p_status
  where id = v_order.id
  returning orders.* into v_order;

  return v_order;
end;
$$;

create or replace function public.create_order(
  p_request_id uuid,
  p_items jsonb,
  p_delivery_name text,
  p_delivery_phone text,
  p_delivery_address text,
  p_delivery_time time,
  p_payment_method text,
  p_cash_change_required boolean,
  p_adjacent_zone boolean,
  p_coupon_code text,
  p_delivery_date date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_existing_order public.orders%rowtype;
  v_existing boolean;
  v_accepting boolean;
  v_variant record;
  v_product_order_item record;
  v_order_item jsonb;
  v_items jsonb;
  v_order_id uuid;
  v_product_id uuid;
  v_first_variant boolean;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión para crear un pedido.'
      using errcode = '42501';
  end if;

  if p_request_id is null then
    raise exception 'Falta el identificador de solicitud del pedido.'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || p_request_id::text, 0)
  );

  select orders.* into v_existing_order
  from public.orders
  where orders.user_id = v_user_id
    and orders.client_request_id = p_request_id;
  v_existing := found;

  if v_existing then
    v_order_item := public.create_order_when_open(
      p_request_id, p_items, p_delivery_name, p_delivery_phone,
      p_delivery_address, p_delivery_time, p_payment_method,
      p_cash_change_required, p_adjacent_zone, p_coupon_code, p_delivery_date
    );
    v_order_id := (v_order_item ->> 'id')::uuid;

    select coalesce(
      pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'product_id', order_items.product_id,
          'name', order_items.product_name,
          'flavor', order_items.flavor_name,
          'quantity', order_items.quantity,
          'price', order_items.unit_price,
          'subtotal', order_items.subtotal
        )
        order by order_items.product_name, order_items.flavor_name
      ),
      '[]'::jsonb
    )
    into v_items
    from public.order_items
    where order_items.order_id = v_order_id;

    return pg_catalog.jsonb_set(v_order_item, '{items}', v_items, true);
  end if;

  if p_items is null or pg_catalog.jsonb_typeof(p_items) <> 'array' then
    raise exception 'El carrito debe ser una lista de productos y sabores.'
      using errcode = '22023';
  end if;

  if pg_catalog.jsonb_array_length(p_items) not between 1 and 100 then
    raise exception 'El carrito debe contener entre 1 y 100 productos.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_items) as items(value)
    where pg_catalog.jsonb_typeof(items.value) <> 'object'
       or jsonb_typeof(items.value -> 'product_id') is distinct from 'string'
       or (items.value ->> 'product_id') !~
          '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
       or jsonb_typeof(items.value -> 'flavor_id') is distinct from 'string'
       or (items.value ->> 'flavor_id') !~
          '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
       or jsonb_typeof(items.value -> 'quantity') is distinct from 'number'
       or (items.value ->> 'quantity') !~ '^[1-9][0-9]{0,3}$'
  ) then
    raise exception 'El carrito debe incluir producto, sabor y cantidad válidos.'
      using errcode = '22023';
  end if;

  select site_settings.accepting_orders into v_accepting
  from public.site_settings
  where site_settings.id = true
  for share;

  if not found then
    raise exception 'No se encontró la configuración de la tienda.'
      using errcode = 'P0002';
  end if;

  if not v_accepting then
    raise exception 'La tienda no está aceptando pedidos por el momento.'
      using errcode = '55000';
  end if;

  for v_product_id in
    select
      (items.value ->> 'product_id')::uuid
    from pg_catalog.jsonb_array_elements(p_items) as items(value)
    group by (items.value ->> 'product_id')::uuid
    order by (items.value ->> 'product_id')::uuid
  loop
    perform 1
    from public.products
    where products.id = v_product_id
      and products.active
    for update;

    if not found then
      raise exception 'Uno de los productos del carrito ya no está disponible.'
        using errcode = 'P0002';
    end if;
  end loop;

  for v_variant in
    select
      (items.value ->> 'product_id')::uuid as product_id,
      (items.value ->> 'flavor_id')::uuid as flavor_id,
      sum((items.value ->> 'quantity')::integer)::integer as quantity
    from pg_catalog.jsonb_array_elements(p_items) as items(value)
    group by
      (items.value ->> 'product_id')::uuid,
      (items.value ->> 'flavor_id')::uuid
    order by (items.value ->> 'flavor_id')::uuid
  loop
    perform 1
    from public.product_flavors
    where id = v_variant.flavor_id
      and product_id = v_variant.product_id
      and active
    for update;

    if not found then
      raise exception 'Uno de los sabores seleccionados ya no está disponible.'
        using errcode = 'P0002';
    end if;

    if (select products.active from public.products where products.id = v_variant.product_id) is distinct from true then
      raise exception 'Uno de los productos del carrito ya no está disponible.'
        using errcode = 'P0002';
    end if;

    if (select product_flavors.stock from public.product_flavors where id = v_variant.flavor_id) < v_variant.quantity then
      raise exception 'Stock insuficiente para el sabor seleccionado.'
        using errcode = '22023';
    end if;
  end loop;

  v_order_item := public.create_order_when_open(
    p_request_id, p_items, p_delivery_name, p_delivery_phone,
    p_delivery_address, p_delivery_time, p_payment_method,
    p_cash_change_required, p_adjacent_zone, p_coupon_code, p_delivery_date
  );
  v_order_id := (v_order_item ->> 'id')::uuid;

  for v_variant in
    select
      (items.value ->> 'product_id')::uuid as product_id,
      (items.value ->> 'flavor_id')::uuid as flavor_id,
      sum((items.value ->> 'quantity')::integer)::integer as quantity
    from pg_catalog.jsonb_array_elements(p_items) as items(value)
    group by
      (items.value ->> 'product_id')::uuid,
      (items.value ->> 'flavor_id')::uuid
    order by (items.value ->> 'flavor_id')::uuid
  loop
    update public.product_flavors
    set stock = product_flavors.stock - v_variant.quantity
    where id = v_variant.flavor_id;
  end loop;

  for v_product_order_item in
    select order_items.*
    from public.order_items
    where order_items.order_id = v_order_id
    order by order_items.product_id
    for update
  loop
    v_first_variant := true;
    for v_variant in
      select
        (items.value ->> 'flavor_id')::uuid as flavor_id,
        sum((items.value ->> 'quantity')::integer)::integer as quantity,
        product_flavors.flavor
      from pg_catalog.jsonb_array_elements(p_items) as items(value)
      join public.product_flavors
        on product_flavors.id = (items.value ->> 'flavor_id')::uuid
      where (items.value ->> 'product_id')::uuid = v_product_order_item.product_id
      group by product_flavors.id, product_flavors.flavor
      order by product_flavors.flavor
    loop
      if v_first_variant then
        update public.order_items
        set quantity = v_variant.quantity,
            product_flavor_id = v_variant.flavor_id,
            flavor_name = v_variant.flavor
        where id = v_product_order_item.id;
        v_first_variant := false;
      else
        insert into public.order_items (
          order_id, product_id, product_name, quantity, unit_price,
          product_flavor_id, flavor_name
        )
        values (
          v_product_order_item.order_id,
          v_product_order_item.product_id,
          v_product_order_item.product_name,
          v_variant.quantity,
          v_product_order_item.unit_price,
          v_variant.flavor_id,
          v_variant.flavor
        );
      end if;
    end loop;
  end loop;

  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'product_id', order_items.product_id,
        'name', order_items.product_name,
        'flavor', order_items.flavor_name,
        'quantity', order_items.quantity,
        'price', order_items.unit_price,
        'subtotal', order_items.subtotal
      )
      order by order_items.product_name, order_items.flavor_name
    ),
    '[]'::jsonb
  )
  into v_items
  from public.order_items
  where order_items.order_id = v_order_id;

  return pg_catalog.jsonb_set(v_order_item, '{items}', v_items, true);
end;
$$;

revoke all on function public.create_order(
  uuid, jsonb, text, text, text, time, text, boolean, boolean, text, date
) from public, anon;
grant execute on function public.create_order(
  uuid, jsonb, text, text, text, time, text, boolean, boolean, text, date
) to authenticated;
