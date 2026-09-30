import { supabase } from '../lib/supabaseClient';

const productFields =
  'id, name, description, price, discount_percent, stock, brand, category_id, flavor, nicotine, puffs, image_url, active, categories(id, name)';

const mapProduct = (row) => {
  const originalPrice = Number(row.price);
  const discountPercent = Number(row.discount_percent ?? 0);

  return {
    ...row,
    originalPrice,
    discount_percent: discountPercent,
    price: Number((originalPrice * (100 - discountPercent) / 100).toFixed(2)),
    puffs: row.puffs ? String(row.puffs) : '',
    image:
      row.image_url ||
      'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=900&q=80',
    category: row.categories?.name ?? 'Vape',
  };
};

export async function getProducts({ limit, includeInactive = false, onSaleOnly = false } = {}) {
  let query = supabase
    .from('products')
    .select(productFields)
    .order('name');

  if (!includeInactive) query = query.eq('active', true);
  if (onSaleOnly) query = query.gt('discount_percent', 0);
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

async function getOrCreateCategory(categoryName) {
  const name = categoryName.trim();
  if (!name) return null;

  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  if (!slug) throw new Error('El nombre de categoría no genera un identificador válido.');

  const { data: existing, error: lookupError } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from('categories')
    .insert({ name, slug })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function saveProduct(product) {
  const categoryId = await getOrCreateCategory(product.category ?? '');
  const payload = {
    name: product.name.trim(),
    description: product.description.trim() || null,
    price: Number(product.price),
    discount_percent: Number(product.discount_percent ?? 0),
    stock: Number(product.stock),
    brand: product.brand.trim() || null,
    category_id: categoryId,
    flavor: product.flavor.trim() || null,
    nicotine: product.nicotine.trim() || null,
    puffs: product.puffs === '' ? null : Number(product.puffs),
    image_url: product.image_url.trim() || null,
    active: product.active,
  };

  const query = product.id
    ? supabase.from('products').update(payload).eq('id', product.id)
    : supabase.from('products').insert(payload);

  const { error } = await query.select('id').single();
  if (error) throw error;
}

export async function setProductActive(id, active) {
  const { error } = await supabase
    .from('products')
    .update({ active })
    .eq('id', id)
    .select('id')
    .single();
  if (error) throw error;
}
