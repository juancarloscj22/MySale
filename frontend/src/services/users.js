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

  if (data.length === 0) return { users: data, total: count };

  const userIds = data.map((user) => user.id);
  const { data: balances, error: balancesError } = await supabase
    .from('user_reward_points')
    .select('user_id, points')
    .in('user_id', userIds);

  if (balancesError) throw balancesError;
  if (!Array.isArray(balances)) {
    throw new Error('Supabase no devolvió los saldos de MayCoins.');
  }

  const pointsByUserId = new Map(balances.map((balance) => [balance.user_id, balance.points]));
  return {
    users: data.map((user) => ({
      ...user,
      reward_points: pointsByUserId.get(user.id) ?? 0,
    })),
    total: count,
  };
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
