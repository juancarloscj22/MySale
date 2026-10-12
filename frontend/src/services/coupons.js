import { supabase } from '../lib/supabaseClient';

export async function getCoupons() {
  const { data, error } = await supabase
    .from('coupons')
    .select('id, code, discount_type, discount_value, max_uses, used_count, expires_at, active, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createCoupon({ code, discountType, discountValue, maxUses, expiresAt }) {
  const parsedMaxUses = maxUses === '' ? null : Number(maxUses);
  if (parsedMaxUses !== null && (!Number.isInteger(parsedMaxUses) || parsedMaxUses < 1)) {
    throw new Error('La cantidad máxima de usos debe ser un entero mayor que cero.');
  }

  const parsedDiscountValue = Number(discountValue);
  if (
    !Number.isFinite(parsedDiscountValue)
    || parsedDiscountValue <= 0
    || (discountType === 'percent' && parsedDiscountValue > 100)
    || !['percent', 'amount'].includes(discountType)
  ) {
    throw new Error(
      discountType === 'percent'
        ? 'El descuento porcentual debe ser mayor que cero y no superar el 100%.'
        : 'El monto del descuento debe ser mayor que cero.',
    );
  }

  const { error } = await supabase.rpc('create_coupon', {
    p_code: code.trim().toUpperCase(),
    p_discount_type: discountType,
    p_discount_value: parsedDiscountValue,
    p_max_uses: parsedMaxUses,
    p_expires_at: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
  });

  if (error) throw error;
}

export async function setCouponActive(id, active) {
  const { error } = await supabase
    .from('coupons')
    .update({ active })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteCoupon(id) {
  const { error } = await supabase.rpc('delete_coupon', {
    p_coupon_id: id,
  });

  if (error) throw error;
}
