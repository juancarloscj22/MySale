import { supabase } from '../lib/supabaseClient';

export async function getAdminUsers({ page = 0, pageSize = 25 } = {}) {
  const start = page * pageSize;
  const { data, count, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone, role, blocked, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(start, start + pageSize - 1);

  if (error) throw error;
  if (!Array.isArray(data) || count === null) {
    throw new Error('Supabase no devolvió una lista válida de usuarios.');
  }

  return { users: data, total: count };
}
