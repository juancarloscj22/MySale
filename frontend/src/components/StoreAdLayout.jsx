import { useLocation } from 'react-router-dom';
import { useStoreSettings } from '../context/useStoreSettings';
import GoogleAdSlot from './GoogleAdSlot';

const hiddenAdPaths = ['/checkout', '/auth', '/dev', '/admin'];

export default function StoreAdLayout({ children }) {
  const { pathname } = useLocation();
  const {
    adsensePublisherId,
    adsenseLeftSlot,
    adsenseRightSlot,
  } = useStoreSettings();

  const showAds = !hiddenAdPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  if (!showAds) {
    return (
      <div className="flex-1">
        <main>{children}</main>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-[1600px] flex-1 grid-cols-1 gap-4 px-2 md:px-4 lg:grid-cols-[160px_minmax(0,1fr)_160px] lg:gap-6">
      <main className="order-1 min-w-0 lg:col-start-2 lg:row-start-1">
        {children}
      </main>
      <aside aria-label="Anuncio lateral izquierdo" className="order-2 mx-auto w-full max-w-[336px] lg:col-start-1 lg:row-start-1 lg:mx-0 lg:w-[160px]">
        <GoogleAdSlot
          publisherId={adsensePublisherId}
          slotId={adsenseLeftSlot}
          label="Anuncio izquierdo"
        />
      </aside>
      <aside aria-label="Anuncio lateral derecho" className="order-3 mx-auto w-full max-w-[336px] lg:col-start-3 lg:row-start-1 lg:mx-0 lg:w-[160px]">
        <GoogleAdSlot
          publisherId={adsensePublisherId}
          slotId={adsenseRightSlot}
          label="Anuncio derecho"
        />
      </aside>
    </div>
  );
}
