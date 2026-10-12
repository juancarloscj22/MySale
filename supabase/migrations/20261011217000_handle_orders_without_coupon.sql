do $$
declare
  v_function_oid oid := pg_catalog.to_regprocedure(
    'public.create_order(uuid,jsonb,text,text,text,time,text,boolean,boolean,text)'
  );
  v_definition text;
  v_old text := 'when v_coupon_details ->> ''type'' = ''amount'' then';
  v_new text := 'when v_coupon_code is null then 0'
    || pg_catalog.chr(10)
    || '        when v_coupon_details ->> ''type'' = ''amount'' then';
  v_occurrences integer;
begin
  if v_function_oid is null then
    raise exception 'No se encontró la función create_order de cupones.';
  end if;

  v_definition := pg_catalog.pg_get_functiondef(v_function_oid);
  v_occurrences := (
    pg_catalog.length(v_definition) - pg_catalog.length(pg_catalog.replace(v_definition, v_old, ''))
  ) / pg_catalog.length(v_old);
  if v_occurrences <> 1 then
    raise exception 'La rama de cupón de create_order no coincide con la definición esperada.';
  end if;

  execute pg_catalog.replace(v_definition, v_old, v_new);
end;
$$;
