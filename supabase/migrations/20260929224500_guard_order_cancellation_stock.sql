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

  select orders.*
  into v_order
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
      select order_items.product_id, sum(order_items.quantity)::integer as quantity
      from public.order_items
      where order_items.order_id = v_order.id
        and order_items.product_id is not null
      group by order_items.product_id
      order by order_items.product_id
    loop
      update public.products
      set stock = products.stock + v_item.quantity
      where products.id = v_item.product_id;
    end loop;
  end if;

  update public.orders
  set status = p_status
  where orders.id = v_order.id
  returning orders.* into v_order;

  return v_order;
end;
$$;
