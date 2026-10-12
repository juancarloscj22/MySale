import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useAuth } from '../../context/useAuth';
import { useStoreSettings } from '../../context/useStoreSettings';
import {
  claimDailyLoginReward,
  getRewardMissions,
  getRewardMissionTargetLabel,
  getUserPoints,
  getClaimedDailyRewardMissionIds,
  loadUserRewards,
  setUserPoints,
  subscribeToRewardPoints,
} from '../../services/rewards';
import {
  claimPurchaseMissionReward,
  getPurchaseMissionRewards,
} from '../../services/messages';
import MayCoinAmount from '../../components/MayCoinAmount';

export default function Rewards() {
  const { user } = useAuth();
  const { navbarBackgroundImageUrl, rewardsBalanceImageUrl } = useStoreSettings();
  const subscribe = useCallback((callback) => subscribeToRewardPoints(user?.id, callback), [user?.id]);
  const getSnapshot = useCallback(() => getUserPoints(user?.id), [user?.id]);
  const points = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [missions, setMissions] = useState([]);
  const [claimedDailyMissionIds, setClaimedDailyMissionIds] = useState([]);
  const [loadingMissions, setLoadingMissions] = useState(false);
  const [purchaseRewards, setPurchaseRewards] = useState([]);
  const [loadingPurchaseRewards, setLoadingPurchaseRewards] = useState(false);
  const [claimingPurchaseMissionId, setClaimingPurchaseMissionId] = useState('');
  const [claimingMissionId, setClaimingMissionId] = useState('');
  const [claimError, setClaimError] = useState('');
  const cardBackgroundStyle = navbarBackgroundImageUrl
    ? {
        backgroundImage: `url("${navbarBackgroundImageUrl}")`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }
    : undefined;

  useEffect(() => {
    if (!user?.id) return undefined;
    let active = true;
    setLoadingPurchaseRewards(true);
    setLoadingMissions(true);
    Promise.all([
      getPurchaseMissionRewards(user.id),
      getRewardMissions(),
      getClaimedDailyRewardMissionIds(),
      loadUserRewards(user.id),
    ])
      .then(([purchaseMissionRewards, rewardMissions, dailyClaims]) => {
        if (!active) return;
        setPurchaseRewards(purchaseMissionRewards);
        setMissions(rewardMissions);
        setClaimedDailyMissionIds(dailyClaims);
      })
      .catch((error) => {
        if (active) setClaimError(error.message);
      })
      .finally(() => {
        if (active) {
          setLoadingPurchaseRewards(false);
          setLoadingMissions(false);
        }
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  const handleDailyClaim = async (mission) => {
    setClaimError('');
    setClaimingMissionId(mission.id);
    try {
      const balance = await claimDailyLoginReward(mission);
      setUserPoints(balance, user.id);
      setClaimedDailyMissionIds((current) => [...new Set([...current, mission.id])]);
    } catch (error) {
      setClaimError(error.message);
    } finally {
      setClaimingMissionId('');
    }
  };

  const handlePurchaseMissionClaim = async (missionId) => {
    setClaimError('');
    setClaimingPurchaseMissionId(missionId);
    try {
      const balance = await claimPurchaseMissionReward(missionId);
      setUserPoints(balance, user.id);
      setPurchaseRewards((current) => current.map((reward) => (
        reward.mission_id === missionId
          ? { ...reward, claimed_at: new Date().toISOString() }
          : reward
      )));
    } catch (error) {
      setClaimError(error.message);
    } finally {
      setClaimingPurchaseMissionId('');
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h1 className="text-4xl font-black text-slate-900">Recompensas MySale</h1>
        <p className="mt-4 text-slate-600">Inicia sesión para ver tus MayCoins y tus misiones disponibles.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div
        className="mb-8 flex flex-col gap-4 overflow-hidden rounded-3xl border border-amber-200 p-2 shadow-sm md:flex-row md:items-center md:justify-between"
        style={cardBackgroundStyle}
      >
        <div className="flex flex-1 items-center justify-between gap-3 rounded-2xl bg-white/35 p-3 sm:gap-5 sm:p-6">
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 sm:text-sm">Recompensas</p>
              <h1 className="mt-2 text-2xl font-black leading-tight text-slate-900 sm:text-4xl">Tu saldo de MayCoins</h1>
            </div>
            <div className="w-fit shrink-0 rounded-full bg-slate-900 px-4 py-2 text-xl font-black text-amber-300 sm:px-5 sm:py-3 sm:text-2xl">
              <MayCoinAmount amount={points} iconClassName="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
          </div>
          {rewardsBalanceImageUrl && (
            <div className="rewards-balance-image-frame flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white sm:h-36 sm:w-36">
              <img
                src={rewardsBalanceImageUrl}
                alt="Imagen de recompensas MayCoins"
                className="h-3/4 w-3/4 rounded-full object-contain"
              />
            </div>
          )}
        </div>
      </div>

      {claimError && (
        <p role="alert" className="mb-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
          {claimError}
        </p>
      )}

      {(loadingPurchaseRewards || purchaseRewards.length > 0) && (
        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-black text-slate-900">Misiones de compra completadas</h2>
          {loadingPurchaseRewards && (
            <p role="status" className="text-sm text-slate-600">Cargando recompensas de compra...</p>
          )}
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {purchaseRewards.map((reward) => (
              <article
                key={reward.mission_id}
                className="overflow-hidden rounded-3xl border border-slate-200 p-2 shadow-sm"
                style={cardBackgroundStyle}
              >
                <div className="h-full rounded-2xl bg-white/35 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Compra completada</p>
                  <h3 className="mt-2 text-2xl font-black text-slate-900">{reward.mission_title}</h3>
                  <p className="mt-3 text-base leading-6 text-slate-700">
                    ¡Has completado una misión! Reclama aquí tus MayCoins.
                  </p>
                  <div className="mt-4 inline-flex rounded-full bg-amber-100 px-4 py-2 text-lg font-bold text-amber-800">
                    <MayCoinAmount
                      amount={reward.points_awarded}
                      iconClassName="h-6 w-6"
                      iconFrameClassName="h-9 w-9"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void handlePurchaseMissionClaim(reward.mission_id)}
                    disabled={Boolean(reward.claimed_at) || claimingPurchaseMissionId !== ''}
                    className="rewards-daily-claim-button mt-5 w-full rounded-full bg-fuchsia-300 px-5 py-2.5 text-xl font-bold text-black transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                  >
                    {claimingPurchaseMissionId === reward.mission_id
                      ? 'Canjeando...'
                      : reward.claimed_at
                        ? 'Recompensa recibida'
                        : <span className="text-xl">Canjear recompensa</span>}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {loadingMissions && <p role="status" className="text-sm text-slate-600">Cargando misiones...</p>}
        {!loadingMissions && missions.length === 0 && (
          <p className="text-sm text-slate-600">No hay misiones disponibles ahora.</p>
        )}
        {missions
          .filter((mission) => mission.active)
          .map((mission) => (
            <article
              key={mission.id}
              className="overflow-hidden rounded-3xl border border-slate-200 p-2 shadow-sm"
              style={cardBackgroundStyle}
            >
              <div className="h-full rounded-2xl bg-white/35 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      {mission.type === 'daily_login' ? 'Diario' : 'Compra'}
                    </p>
                    <h3 className="mt-2 text-2xl font-black text-slate-900">{mission.title}</h3>
                  </div>
                  <span className="rounded-full bg-amber-100 px-4 py-2 text-lg font-bold text-amber-800">
                    <MayCoinAmount
                      amount={mission.rewardPoints}
                      iconClassName="h-6 w-6"
                      iconFrameClassName="h-9 w-9"
                    />
                  </span>
                </div>
                <p className="mt-3 text-lg leading-7 text-slate-700">{mission.description}</p>
                <div className="mt-4 text-sm text-slate-600">
                  {getRewardMissionTargetLabel(mission)}
                </div>
                {mission.type === 'daily_login' && (
                  <button
                    type="button"
                    onClick={() => void handleDailyClaim(mission)}
                    disabled={claimedDailyMissionIds.includes(mission.id) || claimingMissionId !== ''}
                    className="rewards-daily-claim-button mt-5 w-full rounded-full bg-fuchsia-300 px-5 py-2.5 text-xl font-bold text-black transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                  >
                    {claimingMissionId === mission.id
                      ? 'Canjeando...'
                      : !claimedDailyMissionIds.includes(mission.id)
                        ? <span className="text-xl">Canjear recompensa</span>
                        : 'Recompensa recibida hoy'}
                  </button>
                )}
              </div>
            </article>
          ))}
      </div>
    </div>
  );
}
