do $$
declare
  v_function record;
  v_definition text;
begin
  for v_function in
    select procedures.oid
    from pg_catalog.pg_proc as procedures
    join pg_catalog.pg_namespace as namespaces
      on namespaces.oid = procedures.pronamespace
    where namespaces.nspname = 'public'
      and procedures.proname in ('calculate_order_coupon_discount', 'create_order')
      and pg_catalog.strpos(
        pg_catalog.pg_get_functiondef(procedures.oid),
        'pg_catalog.least('
      ) > 0
  loop
    v_definition := pg_catalog.pg_get_functiondef(v_function.oid);
    execute pg_catalog.replace(v_definition, 'pg_catalog.least(', 'least(');
  end loop;
end;
$$;
