import { supabase } from '../lib/supabaseClient';

const productFields =
  'id, name, description, price, stock, brand, flavor, nicotine, puffs, image_url, active, categories(name)';

const mapProduct = (row) => ({
  ...row,
  price: Number(row.price),
  puffs: row.puffs ? String(row.puffs) : '',
  image:
    row.image_url ||
    'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=900&q=80',
  category: row.categories?.name ?? 'Vape',
});

export async function getProducts({ limit, includeInactive = false } = {}) {
  let query = supabase
    .from('products')
    .select(productFields)
    .order('name');

  if (!includeInactive) query = query.eq('active', true);
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;

  return data.map(mapProduct);
}

export async function getProductById(id) {
  const { data, error } = await supabase
    .from('products')
    .select(productFields)
    .eq('id', id)
    .eq('active', true)
    .maybeSingle();

  if (error) throw error;

  return data ? mapProduct(data) : null;
}
