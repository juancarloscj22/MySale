alter table public.orders
  add column cash_change_required boolean not null default false;

create function public.create_order(
  p_request_id uuid,
  p_items jsonb,
  p_delivery_name text,
  p_delivery_phone text,
  p_delivery_address text,
  p_delivery_time time,
  p_payment_method text,
  p_cash_change_required boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order jsonb;
  v_order_id uuid;
begin
  if p_cash_change_required and p_payment_method <> 'cash' then
    raise exception 'La solicitud de cambio solo aplica para pago en efectivo.'
      using errcode = '22023';
  end if;

  v_order := public.create_order(
    p_request_id,
    p_items,
    p_delivery_name,
    p_delivery_phone,
    p_delivery_address,
    p_delivery_time,
    p_payment_method
  );
  v_order_id := (v_order ->> 'id')::uuid;

  update public.orders
  set cash_change_required = p_cash_change_required
  where id = v_order_id
    and user_id = (select auth.uid());

  if not found then
    raise exception 'No se pudo guardar la preferencia de cambio para el pedido.'
      using errcode = 'P0002';
  end if;

  return v_order || jsonb_build_object(
    'cash_change_required',
    p_cash_change_required
  );
end;
$$;

revoke all on function public.create_order(uuid, jsonb, text, text, text, time, text, boolean) from public;
revoke all on function public.create_order(uuid, jsonb, text, text, text, time, text, boolean) from anon;
grant execute on function public.create_order(uuid, jsonb, text, text, text, time, text, boolean) to authenticated;
