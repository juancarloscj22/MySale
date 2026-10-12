do $$
declare
  v_function_oid oid := pg_catalog.to_regprocedure(
    'public.create_order(uuid,jsonb,text,text,text,time,text,boolean,boolean,text)'
  );
  v_definition text;
  v_old text;
  v_new text;
  v_occurrences integer;
begin
  if v_function_oid is null then
    raise exception 'No se encontró la función create_order de cupones.';
  end if;

  v_definition := pg_catalog.pg_get_functiondef(v_function_oid);

  v_old := '  v_discount_percent numeric(5, 2) := 0;';
  v_new := v_old || pg_catalog.chr(10)
    || '  v_coupon_details jsonb;';
  v_occurrences := (
    pg_catalog.length(v_definition) - pg_catalog.length(pg_catalog.replace(v_definition, v_old, ''))
  ) / pg_catalog.length(v_old);
  if v_occurrences <> 1 then
    raise exception 'Las variables de create_order para cupones no coinciden con la definición esperada.';
  end if;
  v_definition := pg_catalog.replace(v_definition, v_old, v_new);

  v_old := 'v_discount_percent := public.validate_order_coupon(v_coupon_code);';
  v_new := 'v_coupon_details := public.validate_order_coupon_details(v_coupon_code);';
  v_occurrences := (
    pg_catalog.length(v_definition) - pg_catalog.length(pg_catalog.replace(v_definition, v_old, ''))
  ) / pg_catalog.length(v_old);
  if v_occurrences <> 1 then
    raise exception 'La validación del cupón de create_order no coincide con la definición esperada.';
  end if;
  v_definition := pg_catalog.replace(v_definition, v_old, v_new);

  v_old := $old$
    v_coupon_discount := pg_catalog.round(
      v_subtotal * v_discount_percent / 100,
      2
    );
$old$;
  v_new := $new$
      v_coupon_discount := case
        when v_coupon_details ->> 'type' = 'amount' then
          pg_catalog.least((v_coupon_details ->> 'value')::numeric, v_subtotal)
        else
          pg_catalog.round(
            v_subtotal * (v_coupon_details ->> 'value')::numeric / 100,
            2
          )
      end;
$new$;
  v_occurrences := (
    pg_catalog.length(v_definition) - pg_catalog.length(pg_catalog.replace(v_definition, v_old, ''))
  ) / pg_catalog.length(v_old);
  if v_occurrences <> 1 then
    raise exception 'El cálculo de cupón de create_order no coincide con la definición esperada.';
  end if;

  execute pg_catalog.replace(v_definition, v_old, v_new);
end;
$$;
