alter table public.reward_product_redemptions
  add column flavor_id uuid references public.product_flavors (id) on delete set null,
  add column flavor_name text,
  add column image_url text,
  add column order_id uuid references public.orders (id) on delete set null,
  add column requires_order boolean not null default false,
  add column cancelled boolean not null default false;

alter table public.order_items
  add column redemption_id uuid unique
    references public.reward_product_redemptions (id) on delete set null;

create function public.redeem_product_for_points_for_checkout(p_product_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  reward_product public.products%rowtype;
  current_balance integer;
  updated_balance integer;
  store_accepting_orders boolean;
  flavor_id uuid;
  flavor_name text;
  flavor_image_url text;
  redemption_id uuid;
begin
  if current_user_id is null or not exists (
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
    raise exception 'Solo las cuentas activas pueden canjear productos.'
      using errcode = '42501';
  end if;

  select settings.accepting_orders
  into store_accepting_orders
  from public.site_settings as settings
  where settings.id;

  if not coalesce(store_accepting_orders, false) then
    raise exception 'La tienda está cerrada y no acepta canjes.'
      using errcode = '22023';
  end if;

  select products.*
  into reward_product
  from public.products
  where products.id = p_product_id
  for update;

  if not found or not reward_product.active or reward_product.reward_points_cost <= 0 then
    raise exception 'El producto no está disponible para canje.'
      using errcode = 'P0002';
  end if;

  insert into public.user_reward_points (user_id, points)
  values (current_user_id, 0)
  on conflict (user_id) do nothing;

  select points.points
  into current_balance
  from public.user_reward_points as points
  where points.user_id = current_user_id
  for update;

  if current_balance < reward_product.reward_points_cost then
    raise exception 'No tienes suficientes MayCoins para este canje.'
      using errcode = '22023';
  end if;

  select product_flavors.id, product_flavors.flavor, product_flavors.image_url
  into flavor_id, flavor_name, flavor_image_url
  from public.product_flavors
  where product_flavors.product_id = p_product_id
    and product_flavors.active
    and product_flavors.stock > 0
  order by product_flavors.stock desc, product_flavors.id
  limit 1
  for update;

  if not found then
    raise exception 'El producto está agotado o no tiene un sabor disponible para el pedido.'
      using errcode = '22023';
  end if;

  update public.product_flavors
  set stock = product_flavors.stock - 1
  where product_flavors.id = flavor_id
    and product_flavors.stock > 0;

  if not found then
    raise exception 'El producto se agotó; actualiza la página e inténtalo de nuevo.'
      using errcode = '40001';
  end if;

  update public.user_reward_points
  set points = points - reward_product.reward_points_cost
  where user_id = current_user_id
    and points >= reward_product.reward_points_cost
  returning points into updated_balance;

  if not found then
    raise exception 'El saldo cambió; actualiza la página e inténtalo de nuevo.'
      using errcode = '40001';
  end if;

  insert into public.reward_product_redemptions (
    user_id, product_id, product_name, points_spent,
    flavor_id, flavor_name, image_url, requires_order
  )
  values (
    current_user_id, reward_product.id, reward_product.name,
    reward_product.reward_points_cost, flavor_id, flavor_name,
    coalesce(flavor_image_url, reward_product.image_url, ''), true
  )
  returning id into redemption_id;

  insert into public.messages (created_by, recipient_user_id, title, body, reward_points)
  values (
    null,
    current_user_id,
    '¡Canje agregado al carrito!',
    pg_catalog.format(
      'El producto «%s» quedó apartado con tus MayCoins. Completa el pedido desde el carrito para coordinar la entrega.',
      reward_product.name
    ),
    0
  );

  return pg_catalog.jsonb_build_object(
    'points', updated_balance,
    'points_spent', reward_product.reward_points_cost,
    'redemption_id', redemption_id,
    'flavor_id', flavor_id,
    'flavor', flavor_name,
    'image_url', coalesce(flavor_image_url, reward_product.image_url, '')
  );
end;
$$;

revoke all on function public.redeem_product_for_points_for_checkout(uuid) from public, anon;
grant execute on function public.redeem_product_for_points_for_checkout(uuid) to authenticated;

create function public.get_pending_product_redemptions()
returns table (
  id uuid,
  product_id uuid,
  product_name text,
  points_spent integer,
  flavor_id uuid,
  flavor_name text,
  image_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    redemptions.id,
    redemptions.product_id,
    redemptions.product_name,
    redemptions.points_spent,
    redemptions.flavor_id,
    redemptions.flavor_name,
    redemptions.image_url
  from public.reward_product_redemptions as redemptions
  where redemptions.user_id = (select auth.uid())
    and redemptions.requires_order
    and redemptions.order_id is null
    and not redemptions.cancelled
  order by redemptions.redeemed_at;
$$;

revoke all on function public.get_pending_product_redemptions() from public, anon;
grant execute on function public.get_pending_product_redemptions() to authenticated;

create function public.refund_cancelled_reward_redemptions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_refund record;
begin
  for v_refund in
    select redemptions.user_id, sum(redemptions.points_spent)::integer as points
    from public.reward_product_redemptions as redemptions
    where redemptions.order_id = new.id
      and not redemptions.cancelled
    group by redemptions.user_id
    order by redemptions.user_id
  loop
    update public.user_reward_points
    set points = points + v_refund.points
    where user_id = v_refund.user_id;

    if not found then
      raise exception 'No se pudo reembolsar el saldo del producto canjeado.'
        using errcode = 'P0002';
    end if;
  end loop;

  update public.reward_product_redemptions
  set cancelled = true,
      requires_order = false
  where order_id = new.id
    and not cancelled;

  update public.order_items
  set redemption_id = null
  where order_id = new.id
    and redemption_id is not null;

  return new;
end;
$$;

revoke all on function public.refund_cancelled_reward_redemptions() from public, anon, authenticated;

create trigger orders_refund_cancelled_reward_redemptions
after update of status on public.orders
for each row
when (old.status is distinct from 'cancelled'::public.order_status
  and new.status = 'cancelled'::public.order_status)
execute function public.refund_cancelled_reward_redemptions();

do $$
declare
  v_function_oid oid := pg_catalog.to_regprocedure(
    'public.create_order(uuid,jsonb,text,text,text,time,text,boolean,boolean,text,date)'
  );
  v_definition text;
  v_old text;
  v_new text;
  v_occurrences integer;
begin
  if v_function_oid is null then
    raise exception 'No se encontró la función create_order con la firma esperada.';
  end if;

  v_definition := pg_catalog.pg_get_functiondef(v_function_oid);

  v_old := $old$
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
$old$;
  v_new := v_old || $new$

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_items) as items(value)
    where items.value ? 'redemption_id'
      and (
        jsonb_typeof(items.value -> 'redemption_id') is distinct from 'string'
        or (items.value ->> 'redemption_id') !~
          '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        or (items.value ->> 'quantity') <> '1'
      )
  ) then
    raise exception 'El producto canjeado enviado al pedido no es válido.'
      using errcode = '22023';
  end if;

  if exists (
    select items.value ->> 'redemption_id'
    from pg_catalog.jsonb_array_elements(p_items) as items(value)
    where items.value ? 'redemption_id'
    group by items.value ->> 'redemption_id'
    having count(*) > 1
  ) then
    raise exception 'Un producto canjeado no se puede agregar más de una vez al pedido.'
      using errcode = '22023';
  end if;

  for v_redemption_id in
    select (items.value ->> 'redemption_id')::uuid
    from pg_catalog.jsonb_array_elements(p_items) as items(value)
    where items.value ? 'redemption_id'
    order by (items.value ->> 'redemption_id')::uuid
  loop
    perform 1
    from public.reward_product_redemptions as redemptions
    where redemptions.id = v_redemption_id
      and redemptions.user_id = v_user_id
      and redemptions.product_id = (
        select (items.value ->> 'product_id')::uuid
        from pg_catalog.jsonb_array_elements(p_items) as items(value)
        where (items.value ->> 'redemption_id')::uuid = v_redemption_id
      )
      and redemptions.flavor_id = (
        select (items.value ->> 'flavor_id')::uuid
        from pg_catalog.jsonb_array_elements(p_items) as items(value)
        where (items.value ->> 'redemption_id')::uuid = v_redemption_id
      )
      and redemptions.order_id is null
    for update;

    if not found then
      raise exception 'El canje ya se utilizó o no pertenece a esta cuenta.'
        using errcode = '42501';
    end if;
  end loop;

  if exists (
    select 1
    from public.reward_product_redemptions as redemptions
    where redemptions.user_id = v_user_id
      and redemptions.requires_order
      and redemptions.order_id is null
      and not exists (
        select 1
        from pg_catalog.jsonb_array_elements(p_items) as items(value)
        where items.value ->> 'redemption_id' = redemptions.id::text
      )
  ) then
    raise exception 'Agrega al pedido todos los productos canjeados pendientes.'
      using errcode = '22023';
  end if;
$new$;

  v_occurrences := (
    pg_catalog.length(v_definition) - pg_catalog.length(pg_catalog.replace(v_definition, v_old, ''))
  ) / pg_catalog.length(v_old);
  if v_occurrences <> 1 then
    raise exception 'La validación de productos de create_order no coincide con la definición esperada.';
  end if;
  v_definition := pg_catalog.replace(v_definition, v_old, v_new);

  v_old := $old$
    from pg_catalog.jsonb_array_elements(p_items) as items(value)
    group by
      (items.value ->> 'product_id')::uuid,
      (items.value ->> 'flavor_id')::uuid
    order by (items.value ->> 'flavor_id')::uuid
$old$;
  v_new := $new$
    from pg_catalog.jsonb_array_elements(p_items) as items(value)
    where not (items.value ? 'redemption_id')
    group by
      (items.value ->> 'product_id')::uuid,
      (items.value ->> 'flavor_id')::uuid
    order by (items.value ->> 'flavor_id')::uuid
$new$;
  v_occurrences := (
    pg_catalog.length(v_definition) - pg_catalog.length(pg_catalog.replace(v_definition, v_old, ''))
  ) / pg_catalog.length(v_old);
  if v_occurrences <> 2 then
    raise exception 'Los bloques de reserva de stock de create_order no coinciden con la definición esperada.';
  end if;
  v_definition := pg_catalog.replace(v_definition, v_old, v_new);

  v_old := 'v_order_item := public.create_order_when_open(';
  v_new := $new$
  if not v_existing then
    for v_variant in
      select
        (items.value ->> 'product_id')::uuid as product_id,
        sum((items.value ->> 'quantity')::integer)::integer as quantity
      from pg_catalog.jsonb_array_elements(p_items) as items(value)
      where items.value ? 'redemption_id'
      group by (items.value ->> 'product_id')::uuid
      order by (items.value ->> 'product_id')::uuid
    loop
      update public.products
      set stock = products.stock + v_variant.quantity
      where products.id = v_variant.product_id;

      if not found then
        raise exception 'No se pudo validar el inventario del producto canjeado.'
          using errcode = 'P0002';
      end if;
    end loop;
  end if;

  v_order_item := public.create_order_when_open(
$new$;
  v_occurrences := (
    pg_catalog.length(v_definition) - pg_catalog.length(pg_catalog.replace(v_definition, v_old, ''))
  ) / pg_catalog.length(v_old);
  if v_occurrences <> 2 then
    raise exception 'Las llamadas de creación del pedido no coinciden con la definición esperada.';
  end if;
  v_definition := pg_catalog.replace(v_definition, v_old, v_new);

  v_old := $old$
      select
        (items.value ->> 'flavor_id')::uuid as flavor_id,
        sum((items.value ->> 'quantity')::integer)::integer as quantity,
        product_flavors.flavor
      from pg_catalog.jsonb_array_elements(p_items) as items(value)
      join public.product_flavors
        on product_flavors.id = (items.value ->> 'flavor_id')::uuid
      where (items.value ->> 'product_id')::uuid = v_product_order_item.product_id
      group by product_flavors.id, product_flavors.flavor, (items.value ->> 'flavor_id')::uuid
      order by product_flavors.flavor
$old$;
  v_new := $new$
      select
        (items.value ->> 'flavor_id')::uuid as flavor_id,
        sum((items.value ->> 'quantity')::integer)::integer as quantity,
        product_flavors.flavor,
        nullif(items.value ->> 'redemption_id', '')::uuid as redemption_id
      from pg_catalog.jsonb_array_elements(p_items) as items(value)
      join public.product_flavors
        on product_flavors.id = (items.value ->> 'flavor_id')::uuid
      where (items.value ->> 'product_id')::uuid = v_product_order_item.product_id
      group by
        product_flavors.id,
        product_flavors.flavor,
        (items.value ->> 'flavor_id')::uuid,
        nullif(items.value ->> 'redemption_id', '')::uuid
      order by product_flavors.flavor, redemption_id nulls first
$new$;
  v_occurrences := (
    pg_catalog.length(v_definition) - pg_catalog.length(pg_catalog.replace(v_definition, v_old, ''))
  ) / pg_catalog.length(v_old);
  if v_occurrences <> 1 then
    raise exception 'La agrupación de sabores de create_order no coincide con la definición esperada.';
  end if;
  v_definition := pg_catalog.replace(v_definition, v_old, v_new);

  v_old := $old$
        update public.order_items
        set quantity = v_variant.quantity,
            product_flavor_id = v_variant.flavor_id,
            flavor_name = v_variant.flavor
        where id = v_product_order_item.id;
$old$;
  v_new := $new$
        update public.order_items
        set quantity = v_variant.quantity,
            unit_price = case
              when v_variant.redemption_id is not null then 0
              else v_product_order_item.unit_price
            end,
            product_flavor_id = v_variant.flavor_id,
            flavor_name = v_variant.flavor,
            redemption_id = v_variant.redemption_id
        where id = v_product_order_item.id;
$new$;
  v_occurrences := (
    pg_catalog.length(v_definition) - pg_catalog.length(pg_catalog.replace(v_definition, v_old, ''))
  ) / pg_catalog.length(v_old);
  if v_occurrences <> 1 then
    raise exception 'La actualización de order_items no coincide con la definición esperada.';
  end if;
  v_definition := pg_catalog.replace(v_definition, v_old, v_new);

  v_old := $old$
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
$old$;
  v_new := $new$
        insert into public.order_items (
          order_id, product_id, product_name, quantity, unit_price,
          product_flavor_id, flavor_name, redemption_id
        )
        values (
          v_product_order_item.order_id,
          v_product_order_item.product_id,
          v_product_order_item.product_name,
          v_variant.quantity,
          case
            when v_variant.redemption_id is not null then 0
            else v_product_order_item.unit_price
          end,
          v_variant.flavor_id,
          v_variant.flavor,
          v_variant.redemption_id
        );
$new$;
  v_occurrences := (
    pg_catalog.length(v_definition) - pg_catalog.length(pg_catalog.replace(v_definition, v_old, ''))
  ) / pg_catalog.length(v_old);
  if v_occurrences <> 1 then
    raise exception 'La inserción de order_items no coincide con la definición esperada.';
  end if;
  v_definition := pg_catalog.replace(v_definition, v_old, v_new);

  v_old := 'return pg_catalog.jsonb_set(v_order_item, ''{items}'', v_items, true);';
  v_new := $new$
  update public.reward_product_redemptions as redemptions
  set order_id = v_order_id,
      requires_order = false
  where redemptions.id in (
    select (items.value ->> 'redemption_id')::uuid
    from pg_catalog.jsonb_array_elements(p_items) as items(value)
    where items.value ? 'redemption_id'
  )
    and redemptions.order_id is null;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_items) as items(value)
    join public.reward_product_redemptions as redemptions
      on redemptions.id = (items.value ->> 'redemption_id')::uuid
    where items.value ? 'redemption_id'
      and redemptions.order_id is distinct from v_order_id
  ) then
    raise exception 'No se pudo asociar el canje al pedido.'
      using errcode = '40001';
  end if;

  if not v_existing then
    select case
      when orders.coupon_code is null then 0
      else public.validate_order_coupon(orders.coupon_code)
    end
    into v_coupon_percent
    from public.orders as orders
    where orders.id = v_order_id;

    update public.orders as orders
    set coupon_discount = pg_catalog.round(subtotal.total * v_coupon_percent / 100, 2),
        total = subtotal.total
          - pg_catalog.round(subtotal.total * v_coupon_percent / 100, 2)
          + orders.shipping_fee
    from (
      select coalesce(sum(order_items.subtotal), 0) as total
      from public.order_items
      where order_items.order_id = v_order_id
    ) as subtotal
    where orders.id = v_order_id;
  end if;

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

  select pg_catalog.jsonb_set(
    pg_catalog.jsonb_set(
      pg_catalog.jsonb_set(
        v_order_item,
        '{subtotal}',
        pg_catalog.to_jsonb(coalesce((
          select sum(order_items.subtotal)
          from public.order_items
          where order_items.order_id = v_order_id
        ), 0)),
        true
      ),
      '{coupon_discount}',
      pg_catalog.to_jsonb(orders.coupon_discount),
      true
    ),
    '{total}',
    pg_catalog.to_jsonb(orders.total),
    true
  )
  into v_order_item
  from public.orders as orders
  where orders.id = v_order_id;

  return pg_catalog.jsonb_set(v_order_item, '{items}', v_items, true);
$new$;
  v_occurrences := (
    pg_catalog.length(v_definition) - pg_catalog.length(pg_catalog.replace(v_definition, v_old, ''))
  ) / pg_catalog.length(v_old);
  if v_occurrences <> 2 then
    raise exception 'El armado de respuesta de create_order no coincide con la definición esperada.';
  end if;
  v_definition := pg_catalog.replace(v_definition, v_old, v_new);

  v_old := '  v_first_variant boolean;';
  v_new := '  v_first_variant boolean;' || pg_catalog.chr(10)
    || '  v_redemption_id uuid;' || pg_catalog.chr(10)
    || '  v_coupon_percent numeric(5, 2) := 0;';
  v_occurrences := (
    pg_catalog.length(v_definition) - pg_catalog.length(pg_catalog.replace(v_definition, v_old, ''))
  ) / pg_catalog.length(v_old);
  if v_occurrences <> 1 then
    raise exception 'Las variables de create_order no coinciden con la definición esperada.';
  end if;
  v_definition := pg_catalog.replace(v_definition, v_old, v_new);

  execute v_definition;
end;
$$;
