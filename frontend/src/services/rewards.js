import { supabase } from '../lib/supabaseClient';

const pointsByUser = new Map();
const redeemedProductsByUser = new Map();

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
  if (!userId) return { points: 0, redeemedProductIds: [] };

  const [balanceResult, redemptionsResult] = await Promise.all([
    supabase
      .from('user_reward_points')
      .select('points')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('reward_product_redemptions')
      .select('product_id')
      .eq('user_id', userId)
      .not('product_id', 'is', null),
  ]);

  if (balanceResult.error) throw balanceResult.error;
  if (redemptionsResult.error) throw redemptionsResult.error;

  const points = Number(balanceResult.data?.points ?? 0);
  const redeemedProductIds = redemptionsResult.data.map((item) => item.product_id);
  pointsByUser.set(userId, points);
  redeemedProductsByUser.set(userId, new Set(redeemedProductIds));
  dispatchRewardsUpdated(userId);
  return { points, redeemedProductIds };
}

export function subscribeToRewardPoints(userId, callback) {
  const handleRewardsUpdated = (event) => {
    if (event.detail?.userId === userId) callback();
  };
  window.addEventListener('mysale:rewards-updated', handleRewardsUpdated);
  return () => window.removeEventListener('mysale:rewards-updated', handleRewardsUpdated);
}

export function getRedeemedProducts(userId) {
  return userId ? [...(redeemedProductsByUser.get(userId) ?? new Set())] : [];
}

export function isProductRedeemed(productId, userId) {
  return Boolean(userId && redeemedProductsByUser.get(userId)?.has(productId));
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

  const { data, error } = await supabase.rpc('redeem_product_for_points', {
    p_product_id: product.id,
  });
  if (error) throw error;

  const balance = Number(data);
  if (!Number.isInteger(balance) || balance < 0) {
    throw new Error('Supabase devolvió un saldo inválido después del canje.');
  }

  pointsByUser.set(userId, balance);
  const redeemedProducts = redeemedProductsByUser.get(userId) ?? new Set();
  redeemedProducts.add(product.id);
  redeemedProductsByUser.set(userId, redeemedProducts);
  dispatchRewardsUpdated(userId);
  return balance;
}

export function canRedeemProduct(product, userId) {
  const cost = getRewardCostForProduct(product);
  if (!product || cost <= 0 || !userId) return false;
  return getUserPoints(userId) >= cost && !isProductRedeemed(product.id, userId);
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
