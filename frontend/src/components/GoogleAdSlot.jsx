import { useEffect, useRef, useState } from 'react';

let adsenseLoadState = null;

function loadAdSenseScript(publisherId) {
  if (adsenseLoadState) {
    if (adsenseLoadState.publisherId !== publisherId) {
      return Promise.reject(new Error('Ya se cargó una configuración de AdSense diferente.'));
    }
    return adsenseLoadState.promise;
  }

  const promise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.dataset.mysaleAdsense = 'true';
    script.dataset.publisher = publisherId;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    }, { once: true });
    script.addEventListener('error', () => {
      script.remove();
      reject(new Error('Google AdSense no pudo cargarse.'));
    }, { once: true });
    document.head.appendChild(script);
  });
  adsenseLoadState = { publisherId, promise };
  promise.catch(() => {
    adsenseLoadState = null;
  });
  return promise;
}

export default function GoogleAdSlot({ publisherId, slotId, label }) {
  const adRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    if (!publisherId || !slotId) return () => { active = false; };

    loadAdSenseScript(publisherId)
      .then(() => {
        if (!active || !adRef.current || adRef.current.dataset.initialized === 'true') return;
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
        adRef.current.dataset.initialized = 'true';
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      });

    return () => {
      active = false;
    };
  }, [publisherId, slotId]);

  return (
    <div className="min-h-[250px] w-full overflow-hidden rounded-xl border border-slate-200 bg-white/80 p-2 text-center">
      {publisherId && slotId ? (
        <>
          {error ? (
            <p role="status" className="p-4 text-xs text-slate-500">{error}</p>
          ) : (
            <ins
              ref={adRef}
              className="adsbygoogle block min-h-[250px] w-full"
              style={{ display: 'block' }}
              data-ad-client={publisherId}
              data-ad-slot={slotId}
              data-ad-format="auto"
              data-full-width-responsive="true"
              aria-label={label}
            />
          )}
        </>
      ) : (
        <p className="flex min-h-[234px] items-center justify-center text-xs text-slate-500">
          {label} · Espacio reservado
        </p>
      )}
    </div>
  );
}
