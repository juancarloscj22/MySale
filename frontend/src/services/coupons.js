import { supabase } from '../lib/supabaseClient';

export async function getCoupons() {
  const { data, error } = await supabase
    .from('coupons')
    .select('id, code, discount_percent, max_uses, used_count, expires_at, active, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createCoupon({ code, discountPercent, maxUses, expiresAt }) {
  const parsedMaxUses = maxUses === '' ? null : Number(maxUses);
  if (parsedMaxUses !== null && (!Number.isInteger(parsedMaxUses) || parsedMaxUses < 1)) {
    throw new Error('La cantidad máxima de usos debe ser un entero mayor que cero.');
  }

  const { error } = await supabase.from('coupons').insert({
    code: code.trim().toUpperCase(),
    discount_percent: Number(discountPercent),
    max_uses: parsedMaxUses,
    expires_at: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
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
