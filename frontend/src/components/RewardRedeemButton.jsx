import { useEffect, useState } from 'react';
import { useAuth } from '../context/useAuth';
import { useCart } from '../context/useCart';
import {
  canRedeemProduct,
  getRewardCostForProduct,
  getUserPoints,
  loadUserRewards,
  redeemProductForPoints,
} from '../services/rewards';
import MayCoinAmount from './MayCoinAmount';

export default function RewardRedeemButton({ product, compact = false, storeOpen }) {
  const { user } = useAuth();
  const { addRedeemedItem, redemptionFeatureAvailable } = useCart();
  const userId = user?.id;
  const rewardCost = getRewardCostForProduct(product);
  const [points, setPoints] = useState(() => getUserPoints(userId));
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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
      }
    };
    void refreshRewards();
    const handleRewardsUpdated = (event) => {
      if (event.detail?.userId === userId) {
        setPoints(getUserPoints(userId));
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
  const disabled = !canRedeem || storeOpen !== true || redeeming || !redemptionFeatureAvailable;

  const handleRedeem = async () => {
    if (disabled) return;
    setError('');
    setSuccess(false);
    setRedeeming(true);
    try {
      const redemption = await redeemProductForPoints(product, userId);
      addRedeemedItem(product, redemption, userId);
      setPoints(redemption.points);
      setSuccess(true);
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
      {redeeming
        ? 'Canjeando...'
        : !redemptionFeatureAvailable
          ? 'Canje al carrito no disponible'
          : storeClosed
            ? 'Tienda cerrada'
            : storeOpen !== true
              ? 'Verificando tienda...'
              : (
                <span className="inline-flex flex-wrap items-center justify-center gap-1">
                  Canjear por{' '}
                  <MayCoinAmount
                    amount={rewardCost}
                    iconClassName={compact ? 'h-4 w-4' : 'h-6 w-6'}
                    iconFrameClassName={compact ? 'h-6 w-6' : 'h-9 w-9'}
                  />
                </span>
              )}
      {success && (
        <span role="status" className="mt-1 block text-xs font-semibold leading-tight">
          Agregado al carrito; se quitará al completar el pedido.
        </span>
      )}
      {!storeClosed && storeOpen === true && (!userId || points < rewardCost) && (
        <span className="mt-1 block text-xs font-semibold leading-tight">
          Saldo insuficiente
        </span>
      )}
      {error && <span role="alert" className="mt-1 block text-xs font-semibold text-red-700">{error}</span>}
    </button>
  );
}
