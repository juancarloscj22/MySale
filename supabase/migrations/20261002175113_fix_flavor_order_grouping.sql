do $$
declare
  v_function_oid oid := pg_catalog.to_regprocedure(
    'public.create_order(uuid,jsonb,text,text,text,time,text,boolean,boolean,text,date)'
  );
  v_definition text;
  v_old_group_by constant text := 'group by product_flavors.id, product_flavors.flavor';
  v_new_group_by constant text :=
    'group by product_flavors.id, product_flavors.flavor, (items.value ->> ''flavor_id'')::uuid';
  v_occurrences integer;
begin
  if v_function_oid is null then
    raise exception 'No se encontró la función create_order con la firma esperada.';
  end if;

  v_definition := pg_catalog.pg_get_functiondef(v_function_oid);
  v_occurrences := (
    pg_catalog.length(v_definition)
    - pg_catalog.length(pg_catalog.replace(v_definition, v_old_group_by, ''))
  ) / pg_catalog.length(v_old_group_by);

  if v_occurrences <> 1 then
    raise exception 'La definición de create_order no coincide con el agrupamiento esperado.';
  end if;

  execute pg_catalog.replace(v_definition, v_old_group_by, v_new_group_by);
end;
$$;
