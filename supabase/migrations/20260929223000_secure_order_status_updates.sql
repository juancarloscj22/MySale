drop policy "Admins can manage orders" on public.orders;
drop policy "Admins can manage order items" on public.order_items;

revoke insert, update, delete on public.orders from anon, authenticated;
revoke insert, update, delete on public.order_items from anon, authenticated;

create function public.set_order_status(
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

  if v_order.status <> 'cancelled' and p_status = 'cancelled' then
    update public.products
    set stock = products.stock + item_totals.quantity
    from (
      select order_items.product_id, sum(order_items.quantity)::integer as quantity
      from public.order_items
      where order_items.order_id = v_order.id
        and order_items.product_id is not null
      group by order_items.product_id
      order by order_items.product_id
    ) as item_totals
    where products.id = item_totals.product_id;
  end if;

  update public.orders
  set status = p_status
  where orders.id = v_order.id
  returning orders.* into v_order;

  return v_order;
end;
$$;

revoke all on function public.set_order_status(uuid, public.order_status) from public;
revoke all on function public.set_order_status(uuid, public.order_status) from anon;
grant execute on function public.set_order_status(uuid, public.order_status) to authenticated;
