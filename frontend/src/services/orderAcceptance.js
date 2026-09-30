import { supabase } from '../lib/supabaseClient';

export async function getOrderAcceptance() {
  const { data, error } = await supabase
    .from('site_settings')
    .select('accepting_orders')
    .eq('id', true)
    .single();

  if (error) throw error;
  return data.accepting_orders;
}

export async function setOrderAcceptance(accepting) {
  const { data, error } = await supabase.rpc('set_order_acceptance', {
    p_accepting: accepting,
  });

  if (error) throw error;
  return data;
}
