import { useState } from 'react';
import { useStoreSettings } from '../context/useStoreSettings';

export default function MayCoinAmount({
  amount,
  iconClassName = 'h-5 w-5',
  iconFrameClassName = 'h-7 w-7',
}) {
  const { rewardsBalanceImageUrl } = useStoreSettings();
  const [failedImageUrl, setFailedImageUrl] = useState('');
  const imageFailed = failedImageUrl === rewardsBalanceImageUrl;

  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <span>{amount}</span>
      {rewardsBalanceImageUrl && !imageFailed ? (
        <span className={`maycoin-icon-frame ${iconFrameClassName} inline-flex shrink-0 items-center justify-center rounded-full bg-white p-0.5`}>
          <img
            src={rewardsBalanceImageUrl}
            alt="MayCoins"
            title="MayCoins"
            onError={() => setFailedImageUrl(rewardsBalanceImageUrl)}
            className={`${iconClassName} rounded-full object-contain shadow-none drop-shadow-none`}
          />
        </span>
      ) : (
        <span aria-label="MayCoins">MC</span>
      )}
    </span>
  );
}
