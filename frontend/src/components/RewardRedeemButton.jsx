import { useEffect, useState } from 'react';
import { useAuth } from '../context/useAuth';
import {
  canRedeemProduct,
  getRedeemedProducts,
  getRewardCostForProduct,
  getUserPoints,
  loadUserRewards,
  redeemProductForPoints,
} from '../services/rewards';
import MayCoinAmount from './MayCoinAmount';

export default function RewardRedeemButton({ product, compact = false, storeOpen }) {
  const { user } = useAuth();
  const userId = user?.id;
  const rewardCost = getRewardCostForProduct(product);
  const [points, setPoints] = useState(() => getUserPoints(userId));
  const [redeemed, setRedeemed] = useState(() => getRedeemedProducts(userId).includes(product?.id));
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const refreshRewards = async () => {
      if (userId) {
        try {
          await loadUserRewards(userId);
        } catch (loadError) {
          if (active) setError(loadError.message);
        }
      }
      if (active) {
        setPoints(getUserPoints(userId));
        setRedeemed(getRedeemedProducts(userId).includes(product?.id));
      }
    };
    void refreshRewards();
    const handleRewardsUpdated = (event) => {
      if (event.detail?.userId === userId) {
        setPoints(getUserPoints(userId));
        setRedeemed(getRedeemedProducts(userId).includes(product?.id));
      }
    };
    window.addEventListener('mysale:rewards-updated', handleRewardsUpdated);
    return () => {
      active = false;
      window.removeEventListener('mysale:rewards-updated', handleRewardsUpdated);
    };
  }, [product?.id, userId]);

  if (!product || rewardCost <= 0) {
    return null;
  }

  const canRedeem = canRedeemProduct(product, userId);
  const storeClosed = storeOpen === false;
  const disabled = !canRedeem || storeOpen !== true || redeeming;

  const handleRedeem = async () => {
    if (disabled) return;
    setError('');
    setRedeeming(true);
    try {
      const balance = await redeemProductForPoints(product, userId);
      setPoints(balance);
      setRedeemed(true);
    } catch (redeemError) {
      setError(redeemError.message);
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleRedeem()}
      disabled={disabled}
      className={compact
        ? 'flex w-full flex-col items-center justify-center rounded-full border border-amber-300 bg-amber-100 px-3 py-2 text-sm font-bold text-amber-900 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-500'
        : 'flex w-full flex-col items-center justify-center rounded-full border border-amber-300 bg-amber-100 px-4 py-3 text-xl font-bold text-amber-900 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-500 sm:text-2xl'}
    >
      {redeeming ? 'Canjeando...' : storeClosed ? 'Tienda cerrada' : storeOpen !== true ? 'Verificando tienda...' : redeemed ? 'Canjeado' : (
        <span className="inline-flex flex-wrap items-center justify-center gap-1">
          Canjear por{' '}
          <MayCoinAmount
            amount={rewardCost}
            iconClassName={compact ? 'h-4 w-4' : 'h-6 w-6'}
            iconFrameClassName={compact ? 'h-6 w-6' : 'h-9 w-9'}
          />
        </span>
      )}
      {!storeClosed && storeOpen === true && !redeemed && (!userId || points < rewardCost) && (
        <span className="mt-1 block text-xs font-semibold leading-tight">
          Saldo insuficiente
        </span>
      )}
      {error && <span role="alert" className="mt-1 block text-xs font-semibold text-red-700">{error}</span>}
    </button>
  );
}
