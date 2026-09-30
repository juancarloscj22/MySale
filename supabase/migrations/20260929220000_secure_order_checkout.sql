alter table public.site_settings
  add column shipping_fee numeric(10, 2) not null default 5
    check (shipping_fee >= 0);

alter table public.orders
  add column shipping_fee numeric(10, 2) not null default 5
    check (shipping_fee >= 0),
  add column client_request_id uuid,
  add column delivery_name text not null default '',
  add column delivery_phone text not null default '',
  add column delivery_address text not null default '';

create unique index orders_user_request_id_idx
  on public.orders (user_id, client_request_id)
  where client_request_id is not null;

create function public.create_order(
  p_request_id uuid,
  p_items jsonb,
  p_delivery_name text,
  p_delivery_phone text,
  p_delivery_address text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_blocked boolean;
  v_order_id uuid;
  v_existing_order public.orders%rowtype;
  v_shipping_fee numeric(10, 2);
  v_currency_code text;
  v_subtotal numeric(12, 2) := 0;
  v_order_items jsonb := '[]'::jsonb;
  v_item record;
  v_product public.products%rowtype;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión para crear un pedido.'
      using errcode = '42501';
  end if;

  if p_request_id is null then
    raise exception 'Falta el identificador de solicitud del pedido.'
      using errcode = '22023';
  end if;

  select profiles.blocked
  into v_blocked
  from public.profiles
  where profiles.id = v_user_id;

  if not found then
    raise exception 'No se encontró el perfil de esta cuenta.'
      using errcode = 'P0002';
  end if;

  if v_blocked then
    raise exception 'La cuenta está bloqueada y no puede crear pedidos.'
      using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || p_request_id::text, 0)
  );

  select orders.*
  into v_existing_order
  from public.orders
  where orders.user_id = v_user_id
    and orders.client_request_id = p_request_id;

  if found then
    return jsonb_build_object(
      'id', v_existing_order.id,
      'status', v_existing_order.status,
      'subtotal', v_existing_order.total - v_existing_order.shipping_fee,
      'shipping_fee', v_existing_order.shipping_fee,
      'total', v_existing_order.total,
      'currency_code', v_existing_order.currency_code,
      'delivery_name', v_existing_order.delivery_name,
      'delivery_phone', v_existing_order.delivery_phone,
      'delivery_address', v_existing_order.delivery_address,
      'items', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'product_id', order_items.product_id,
              'name', order_items.product_name,
              'quantity', order_items.quantity,
              'price', order_items.unit_price,
              'subtotal', order_items.subtotal
            )
            order by order_items.product_name
          )
          from public.order_items
          where order_items.order_id = v_existing_order.id
        ),
        '[]'::jsonb
      )
    );
  end if;

  if p_delivery_name is null or length(trim(p_delivery_name)) not between 1 and 120
     or p_delivery_phone is null or length(trim(p_delivery_phone)) not between 7 and 32
     or p_delivery_address is null or length(trim(p_delivery_address)) not between 5 and 500 then
    raise exception 'Revisa el nombre, teléfono y dirección de entrega.'
      using errcode = '22023';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'El carrito debe ser una lista de productos.'
      using errcode = '22023';
  end if;

  if jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 100 then
    raise exception 'El pedido debe contener entre 1 y 100 productos.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) as items(item)
    where jsonb_typeof(items.item) <> 'object'
       or not (items.item ? 'product_id')
       or not (items.item ? 'quantity')
       or jsonb_typeof(items.item -> 'product_id') <> 'string'
       or (items.item ->> 'product_id') !~
          '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
       or jsonb_typeof(items.item -> 'quantity') <> 'number'
       or (items.item ->> 'quantity') !~ '^[1-9][0-9]{0,3}$'
       or (items.item ->> 'quantity')::integer > 1000
  ) then
    raise exception 'El carrito contiene un producto o cantidad no válida.'
      using errcode = '22023';
  end if;

  select site_settings.shipping_fee, site_settings.currency_code
  into v_shipping_fee, v_currency_code
  from public.site_settings
  where site_settings.id = true;

  if not found then
    raise exception 'Falta configurar la tienda.'
      using errcode = 'P0002';
  end if;

  insert into public.orders (
    user_id,
    client_request_id,
    total,
    shipping_fee,
    currency_code,
    status,
    delivery_name,
    delivery_phone,
    delivery_address
  )
  values (
    v_user_id,
    p_request_id,
    0,
    v_shipping_fee,
    v_currency_code,
    'pending',
    trim(p_delivery_name),
    trim(p_delivery_phone),
    trim(p_delivery_address)
  )
  returning id into v_order_id;

  for v_item in
    select
      (items.item ->> 'product_id')::uuid as product_id,
      sum((items.item ->> 'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) as items(item)
    group by (items.item ->> 'product_id')::uuid
    order by (items.item ->> 'product_id')::uuid
  loop
    select products.*
    into v_product
    from public.products
    where products.id = v_item.product_id
    for update;

    if not found or not v_product.active then
      raise exception 'Uno de los productos del carrito ya no está disponible.'
        using errcode = 'P0002';
    end if;

    if v_item.quantity > 1000 then
      raise exception 'La cantidad solicitada para un producto excede el límite permitido.'
        using errcode = '22023';
    end if;

    if v_product.stock < v_item.quantity then
      raise exception 'Stock insuficiente para el producto "%". Disponible: %.',
        v_product.name, v_product.stock
        using errcode = '22023';
    end if;

    update public.products
    set stock = products.stock - v_item.quantity
    where products.id = v_product.id;

    insert into public.order_items (
      order_id,
      product_id,
      product_name,
      quantity,
      unit_price
    )
    values (
      v_order_id,
      v_product.id,
      v_product.name,
      v_item.quantity,
      v_product.price
    );

    v_subtotal := v_subtotal + (v_product.price * v_item.quantity);
    v_order_items := v_order_items || jsonb_build_array(
      jsonb_build_object(
        'product_id', v_product.id,
        'name', v_product.name,
        'quantity', v_item.quantity,
        'price', v_product.price,
        'subtotal', v_product.price * v_item.quantity
      )
    );
  end loop;

  update public.orders
  set total = v_subtotal + v_shipping_fee
  where id = v_order_id;

  return jsonb_build_object(
    'id', v_order_id,
    'status', 'pending',
    'subtotal', v_subtotal,
    'shipping_fee', v_shipping_fee,
    'total', v_subtotal + v_shipping_fee,
    'currency_code', v_currency_code,
    'delivery_name', trim(p_delivery_name),
    'delivery_phone', trim(p_delivery_phone),
    'delivery_address', trim(p_delivery_address),
    'items', v_order_items
  );
end;
$$;

revoke all on function public.create_order(uuid, jsonb, text, text, text) from public;
revoke all on function public.create_order(uuid, jsonb, text, text, text) from anon;
grant execute on function public.create_order(uuid, jsonb, text, text, text) to authenticated;
