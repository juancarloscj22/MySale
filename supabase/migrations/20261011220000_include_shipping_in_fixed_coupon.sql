do $$
declare
  v_function_oid oid;
  v_definition text;
  v_updated_definition text;
begin
  v_function_oid := pg_catalog.to_regprocedure(
    'public.calculate_order_coupon_discount(text,uuid)'
  );
  if v_function_oid is null then
    raise exception 'No se encontró la función de cálculo de cupones.';
  end if;

  v_definition := pg_catalog.pg_get_functiondef(v_function_oid);
  v_updated_definition := pg_catalog.replace(
    v_definition,
    '  v_subtotal numeric(12, 2);',
    '  v_subtotal numeric(12, 2);' || pg_catalog.chr(10)
      || '  v_shipping_fee numeric(10, 2);'
  );
  if v_updated_definition = v_definition then
    raise exception 'No se encontró la variable subtotal esperada en la función de cupones.';
  end if;
  v_definition := v_updated_definition;

  v_updated_definition := pg_catalog.replace(
    v_definition,
    '  v_value := v_coupon.discount_value;',
    $replacement$
  select orders.shipping_fee
  into v_shipping_fee
  from public.orders
  where orders.id = p_order_id
    and orders.user_id = (select auth.uid());

  v_value := v_coupon.discount_value;
$replacement$
  );
  if v_updated_definition = v_definition then
    raise exception 'No se encontró el punto esperado para cargar el envío en la función de cupones.';
  end if;
  v_definition := v_updated_definition;

  v_updated_definition := pg_catalog.replace(
    v_definition,
    'return case when v_value < v_subtotal then v_value else v_subtotal end;',
    'return case when v_value < v_subtotal + v_shipping_fee'
      || ' then v_value else v_subtotal + v_shipping_fee end;'
  );
  if v_updated_definition = v_definition then
    raise exception 'No se encontró el límite esperado del cupón fijo en la función de cupones.';
  end if;
  execute v_updated_definition;
end;
$$;

do $$
declare
  v_function_oid oid := pg_catalog.to_regprocedure(
    'public.create_order(uuid,jsonb,text,text,text,time,text,boolean,boolean,text)'
  );
  v_definition text;
  v_updated_definition text;
begin
  if v_function_oid is null then
    raise exception 'No se encontró la función de creación de pedidos con cupones.';
  end if;

  v_definition := pg_catalog.pg_get_functiondef(v_function_oid);
  v_updated_definition := pg_catalog.replace(
    v_definition,
    '(v_coupon_details ->> ''value'')::numeric < v_subtotal',
    '(v_coupon_details ->> ''value'')::numeric < v_subtotal + ('
      || 'select orders.shipping_fee from public.orders as orders '
      || 'where orders.id = (v_created ->> ''id'')::uuid)'
  );
  if v_updated_definition = v_definition then
    raise exception 'No se encontró la comparación del monto fijo en create_order.';
  end if;
  v_definition := v_updated_definition;

  v_updated_definition := pg_catalog.replace(
    v_definition,
    'else v_subtotal',
    'else v_subtotal + (select orders.shipping_fee from public.orders as orders '
      || 'where orders.id = (v_created ->> ''id'')::uuid)'
  );
  if v_updated_definition = v_definition then
    raise exception 'No se encontró el tope del descuento en create_order.';
  end if;

  execute v_updated_definition;
end;
$$;
