alter table public.site_settings
  add column accepting_orders boolean not null default true;

alter function public.create_order(
  uuid, jsonb, text, text, text, time, text, boolean, boolean, text, date
) rename to create_order_when_open;

revoke all on function public.create_order_when_open(
  uuid, jsonb, text, text, text, time, text, boolean, boolean, text, date
) from public, anon, authenticated;

create function public.set_order_acceptance(p_accepting boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_accepting boolean;
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Solo un administrador o desarrollador activo puede cambiar la recepción de pedidos.'
      using errcode = '42501';
  end if;

  if p_accepting is null then
    raise exception 'Indica si la tienda debe aceptar pedidos.'
      using errcode = '22023';
  end if;

  update public.site_settings
  set accepting_orders = p_accepting
  where id = true
  returning accepting_orders into v_accepting;

  if not found then
    raise exception 'No se encontró la configuración de la tienda.'
      using errcode = 'P0002';
  end if;

  return v_accepting;
end;
$$;

revoke all on function public.set_order_acceptance(boolean) from public, anon;
grant execute on function public.set_order_acceptance(boolean) to authenticated;

create function public.create_order(
  p_request_id uuid,
  p_items jsonb,
  p_delivery_name text,
  p_delivery_phone text,
  p_delivery_address text,
  p_delivery_time time,
  p_payment_method text,
  p_cash_change_required boolean,
  p_adjacent_zone boolean,
  p_coupon_code text,
  p_delivery_date date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_existing_order boolean;
  v_accepting boolean;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión para crear un pedido.'
      using errcode = '42501';
  end if;

  if p_request_id is null then
    raise exception 'Falta el identificador de solicitud del pedido.'
      using errcode = '22023';
  end if;

  select exists (
    select 1
    from public.orders
    where user_id = v_user_id
      and client_request_id = p_request_id
  )
  into v_existing_order;

  if not v_existing_order then
    select accepting_orders
    into v_accepting
    from public.site_settings
    where id = true
    for share;

    if not found then
      raise exception 'No se encontró la configuración de la tienda.'
        using errcode = 'P0002';
    end if;

    if not v_accepting then
      raise exception 'La tienda no está aceptando pedidos por el momento.'
        using errcode = '55000';
    end if;
  end if;

  return public.create_order_when_open(
    p_request_id,
    p_items,
    p_delivery_name,
    p_delivery_phone,
    p_delivery_address,
    p_delivery_time,
    p_payment_method,
    p_cash_change_required,
    p_adjacent_zone,
    p_coupon_code,
    p_delivery_date
  );
end;
$$;

revoke all on function public.create_order(
  uuid, jsonb, text, text, text, time, text, boolean, boolean, text, date
) from public, anon;
grant execute on function public.create_order(
  uuid, jsonb, text, text, text, time, text, boolean, boolean, text, date
) to authenticated;
