import { supabase } from '../lib/supabaseClient';

export async function getCoupons() {
  const { data, error } = await supabase
    .from('coupons')
    .select('id, code, discount_percent, expires_at, active, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createCoupon({ code, discountPercent, expiresAt }) {
  const { error } = await supabase.from('coupons').insert({
    code: code.trim().toUpperCase(),
    discount_percent: Number(discountPercent),
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
