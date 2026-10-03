import { useState } from 'react';
import { useStoreSettings } from '../context/useStoreSettings';

export default function StoreBanner() {
  const { bannerUrl } = useStoreSettings();
  const [failedUrl, setFailedUrl] = useState('');

  if (!bannerUrl || failedUrl === bannerUrl) return null;

  return (
    <div className="w-full overflow-hidden">
      <img
        src={bannerUrl}
        alt=""
        onError={() => setFailedUrl(bannerUrl)}
        className="aspect-[6/1] w-full object-cover object-center"
      />
    </div>
  );
}
