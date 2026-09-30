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

export async function manageUser({ userId, action, blocked }) {
  const { data, error } = await supabase.functions.invoke('manage-user', {
    body: { userId, action, blocked },
  });

  if (error) {
    if (error.context instanceof Response) {
      const responseBody = await error.context.clone().json().catch(() => null);
      if (typeof responseBody?.error === 'string') {
        throw new Error(responseBody.error);
      }
    }
    throw error;
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
