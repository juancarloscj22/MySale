import { supabase } from '../lib/supabaseClient';

const pointsByUser = new Map();

const dispatchRewardsUpdated = (userId) => {
  window.dispatchEvent(new CustomEvent('mysale:rewards-updated', { detail: { userId } }));
};

const mapRewardMission = (mission) => ({
  id: mission.id,
  title: mission.title,
  description: mission.description,
  type: mission.type,
  targetValue: Number(mission.target_value),
  rewardPoints: mission.reward_points,
  active: mission.active,
});

export async function getRewardMissions() {
  const { data, error } = await supabase
    .from('reward_missions')
    .select('id, title, description, type, target_value, reward_points, active')
    .order('created_at');

  if (error) throw error;
  return data.map(mapRewardMission);
}

export function getRewardMissionTargetLabel(mission) {
  if (mission.type === 'daily_login') return 'Acceso diario';
  if (mission.type === 'purchase_quantity') {
    return `Compra ${Number(mission.targetValue).toLocaleString('es-MX')} productos en un pedido`;
  }
  return `Gasta $${Number(mission.targetValue).toLocaleString('es-MX')}`;
}

export async function createRewardMission(mission, userId) {
  const { data, error } = await supabase
    .from('reward_missions')
    .insert({
      title: mission.title,
      description: mission.description,
      type: mission.type,
      target_value: mission.targetValue,
      reward_points: mission.rewardPoints,
      active: mission.active,
      created_by: userId,
    })
    .select('id, title, description, type, target_value, reward_points, active')
    .single();

  if (error) throw error;
  return mapRewardMission(data);
}

export async function updateRewardMission(missionId, updates) {
  const { data, error } = await supabase
    .from('reward_missions')
    .update({ active: updates.active })
    .eq('id', missionId)
    .select('id, title, description, type, target_value, reward_points, active')
    .single();

  if (error) throw error;
  return mapRewardMission(data);
}

export async function deleteRewardMission(missionId) {
  const { error } = await supabase
    .from('reward_missions')
    .delete()
    .eq('id', missionId);

  if (error) throw error;
}

export function getUserPoints(userId) {
  return userId ? pointsByUser.get(userId) ?? 0 : 0;
}

export function setUserPoints(points, userId) {
  if (!userId) return 0;
  const next = Math.max(0, Number(points) || 0);
  pointsByUser.set(userId, next);
  dispatchRewardsUpdated(userId);
  return next;
}

export async function loadUserRewards(userId) {
  if (!userId) return { points: 0 };

  const { data, error } = await supabase
    .from('user_reward_points')
    .select('points')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  const points = Number(data?.points ?? 0);
  pointsByUser.set(userId, points);
  dispatchRewardsUpdated(userId);
  return { points };
}

export async function getProductRedemptions(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('reward_product_redemptions')
    .select('id, product_id, product_name, points_spent, redeemed_at, products(image_url)')
    .eq('user_id', userId)
    .order('redeemed_at', { ascending: false });

  if (error) throw error;
  if (!Array.isArray(data)) {
    throw new Error('Supabase devolvió un historial de canjes inválido.');
  }

  return data.map((redemption) => ({
    ...redemption,
    image_url: redemption.products?.image_url ?? '',
  }));
}

export async function getPendingProductRedemptions(userId) {
  if (!userId) return [];

  const { data, error } = await supabase.rpc('get_pending_product_redemptions');

  if (error) throw error;
  if (!Array.isArray(data)) {
    throw new Error('Supabase devolvió una lista inválida de canjes pendientes.');
  }

  return data;
}

export function isMissingRewardCheckoutFunction(error) {
  return error?.code === 'PGRST202'
    && error.message?.includes('get_pending_product_redemptions');
}

export function subscribeToRewardPoints(userId, callback) {
  const handleRewardsUpdated = (event) => {
    if (event.detail?.userId === userId) callback();
  };
  window.addEventListener('mysale:rewards-updated', handleRewardsUpdated);
  return () => window.removeEventListener('mysale:rewards-updated', handleRewardsUpdated);
}

export function getRewardCostForProduct(product) {
  const productCost = Number(product?.reward_points_cost ?? product?.rewardPointsCost ?? 0);
  if (productCost > 0) {
    return Math.max(0, Math.round(productCost));
  }

  const price = Number(product?.price ?? product?.originalPrice ?? 0);
  if (!Number.isFinite(price) || price <= 0) return 0;

  return Math.max(100, Math.round(price * 8));
}

export async function getClaimedDailyRewardMissionIds() {
  const claimDate = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('daily_reward_claims')
    .select('mission_id')
    .eq('claim_date', claimDate);
  if (error) throw error;
  if (!Array.isArray(data)) {
    throw new Error('Supabase devolvió un resultado inválido al consultar las misiones diarias.');
  }
  return data.map((claim) => claim.mission_id);
}

export async function claimDailyLoginReward(mission) {
  if (!mission?.id || mission.type !== 'daily_login') {
    throw new Error('La misión diaria indicada no es válida.');
  }

  const { data, error } = await supabase.rpc('claim_daily_reward', {
    p_mission_id: mission.id,
  });
  if (error) throw error;
  const balance = Number(data);
  if (!Number.isSafeInteger(balance) || balance < 0) {
    throw new Error('Supabase devolvió un saldo inválido al reclamar la misión.');
  }
  return balance;
}

export async function redeemProductForPoints(product, userId) {
  if (!product?.id || !userId) {
    throw new Error('Inicia sesión para canjear productos con MayCoins.');
  }

  const { data, error } = await supabase.rpc('redeem_product_for_points_for_checkout', {
    p_product_id: product.id,
  });
  if (error) throw error;

  const points = Number(data?.points);
  const pointsSpent = Number(data?.points_spent);
  if (
    !Number.isSafeInteger(points)
    || points < 0
    || !Number.isSafeInteger(pointsSpent)
    || pointsSpent <= 0
    || typeof data?.redemption_id !== 'string'
    || typeof data?.flavor_id !== 'string'
    || typeof data?.flavor !== 'string'
  ) {
    throw new Error('Supabase devolvió datos inválidos después del canje.');
  }

  pointsByUser.set(userId, points);
  dispatchRewardsUpdated(userId);
  return { ...data, points, points_spent: pointsSpent };
}

export function canRedeemProduct(product, userId) {
  const cost = getRewardCostForProduct(product);
  if (!product || cost <= 0 || !userId) return false;
  return getUserPoints(userId) >= cost;
}

export function createMissionTemplate(overrides = {}) {
  return {
    title: 'Nueva misión',
    description: 'Describe la recompensa de MayCoins para esta misión.',
    type: 'daily_login',
    targetValue: 1,
    rewardPoints: 50,
    active: true,
    ...overrides,
  };
}
