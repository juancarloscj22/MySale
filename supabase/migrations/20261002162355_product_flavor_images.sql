alter table public.product_flavors
  add column image_url text
    check (image_url is null or length(image_url) <= 2048);

create function public.save_product_flavor_images(
  p_product_id uuid,
  p_flavors jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_flavor jsonb;
  v_flavor_name text;
  v_updated_count integer;
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Solo administración puede guardar imágenes de sabores.'
      using errcode = '42501';
  end if;

  if p_product_id is null
     or p_flavors is null
     or pg_catalog.jsonb_typeof(p_flavors) <> 'array'
     or pg_catalog.jsonb_array_length(p_flavors) not between 1 and 100
  then
    raise exception 'Los datos de imágenes de sabores no son válidos.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_flavors) as flavors(value)
    where pg_catalog.jsonb_typeof(flavors.value) <> 'object'
       or nullif(pg_catalog.btrim(flavors.value ->> 'flavor'), '') is null
       or (
         flavors.value ? 'image_url'
         and pg_catalog.jsonb_typeof(flavors.value -> 'image_url')
           not in ('string', 'null')
       )
       or length(coalesce(flavors.value ->> 'image_url', '')) > 2048
  ) then
    raise exception 'Cada sabor debe incluir un nombre válido y una URL de imagen válida.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_flavors) as flavors(value)
    group by pg_catalog.lower(pg_catalog.btrim(flavors.value ->> 'flavor'))
    having count(*) > 1
  ) then
    raise exception 'Los sabores de un producto no se pueden repetir.'
      using errcode = '22023';
  end if;

  for v_flavor in
    select value from pg_catalog.jsonb_array_elements(p_flavors)
  loop
    v_flavor_name := pg_catalog.btrim(v_flavor ->> 'flavor');

    update public.product_flavors
    set image_url = nullif(pg_catalog.btrim(v_flavor ->> 'image_url'), '')
    where product_id = p_product_id
      and pg_catalog.lower(flavor) = pg_catalog.lower(v_flavor_name);

    get diagnostics v_updated_count = row_count;
    if v_updated_count <> 1 then
      raise exception 'No se encontró el sabor "%" en el producto.', v_flavor_name
        using errcode = '22023';
    end if;
  end loop;
end;
$$;

revoke all on function public.save_product_flavor_images(uuid, jsonb) from public, anon;
grant execute on function public.save_product_flavor_images(uuid, jsonb) to authenticated;
