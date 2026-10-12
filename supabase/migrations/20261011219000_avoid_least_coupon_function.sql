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
    'return least(v_value, v_subtotal);',
    'return case when v_value < v_subtotal then v_value else v_subtotal end;'
  );
  if v_updated_definition = v_definition then
    raise exception 'No se encontró el límite de descuento esperado en la función de cupones.';
  end if;
  execute v_updated_definition;

  v_function_oid := pg_catalog.to_regprocedure(
    'public.create_order(uuid,jsonb,text,text,text,time,text,boolean,boolean,text)'
  );
  if v_function_oid is null then
    raise exception 'No se encontró la función de creación de pedidos con cupones.';
  end if;

  v_definition := pg_catalog.pg_get_functiondef(v_function_oid);
  v_updated_definition := pg_catalog.replace(
    v_definition,
    'least((v_coupon_details ->> ''value'')::numeric, v_subtotal)',
    'case
            when (v_coupon_details ->> ''value'')::numeric < v_subtotal
              then (v_coupon_details ->> ''value'')::numeric
            else v_subtotal
          end'
  );
  if v_updated_definition = v_definition then
    raise exception 'No se encontró el límite de descuento fijo esperado en create_order.';
  end if;
  execute v_updated_definition;
end;
$$;
