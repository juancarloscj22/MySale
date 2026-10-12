do $$
declare
  v_function_oid oid;
  v_definition text;
  v_updated_definition text;
begin
  v_function_oid := pg_catalog.to_regprocedure(
    'public.redeem_product_for_points(uuid)'
  );
  if v_function_oid is null then
    raise exception 'No se encontró la función de canje de productos.';
  end if;

  v_definition := pg_catalog.pg_get_functiondef(v_function_oid);
  v_updated_definition := pg_catalog.replace(
    v_definition,
    'Administración coordinará la entrega.',
    ''
  );
  if v_updated_definition = v_definition then
    raise exception 'No se encontró el texto esperado en la función de canje de productos.';
  end if;
  execute v_updated_definition;

  v_function_oid := pg_catalog.to_regprocedure(
    'public.redeem_product_for_points_for_checkout(uuid)'
  );
  if v_function_oid is null then
    raise exception 'No se encontró la función de canje de productos para el carrito.';
  end if;

  v_definition := pg_catalog.pg_get_functiondef(v_function_oid);
  v_updated_definition := pg_catalog.replace(
    v_definition,
    ' para coordinar la entrega.',
    '.'
  );
  if v_updated_definition = v_definition then
    raise exception 'No se encontró el texto esperado en la función de canje para el carrito.';
  end if;
  execute v_updated_definition;
end;
$$;
