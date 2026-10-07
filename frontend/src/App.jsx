import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import StoreBanner from './components/StoreBanner';
import { CartProvider } from './context/CartContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { StoreSettingsProvider } from './context/StoreSettingsProvider.jsx';
import { useStoreSettings } from './context/useStoreSettings';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminRoute from './routes/AdminRoute';
import DeveloperRoute from './routes/DeveloperRoute';

const Home = lazy(() => import('./views/cliente/Home'));
const Catalog = lazy(() => import('./views/cliente/Catalog'));
const ProductDetail = lazy(() => import('./views/cliente/ProductDetail'));
const Checkout = lazy(() => import('./views/cliente/Checkout'));
const MyOrders = lazy(() => import('./views/cliente/MyOrders'));
const MyAccount = lazy(() => import('./views/cliente/MyAccount'));
const Auth = lazy(() => import('./views/auth/Auth'));
const Dashboard = lazy(() => import('./views/admin/Dashboard'));
const Inventory = lazy(() => import('./views/admin/Inventory'));
const Orders = lazy(() => import('./views/admin/Orders'));
const UserManager = lazy(() => import('./views/admin/UserManager'));
const Coupons = lazy(() => import('./views/admin/Coupons'));
const DevConsole = lazy(() => import('./views/dev/DevConsole'));
const ConfigSettings = lazy(() => import('./views/dev/ConfigSettings'));

function StorefrontColorTheme({ children }) {
  return <div className="storefront-color-theme">{children}</div>;
}

function Storefront() {
  const { backgroundImageUrl, buttonBackgroundImageUrl } = useStoreSettings();
  const { pathname } = useLocation();
  const whiteOutsidePanels =
    pathname === '/mi-cuenta' ||
    pathname === '/mis-pedidos' ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/dev');

  useEffect(() => {
    if (!import.meta.env.PROD) return;

    const accountMeta = document.querySelector('meta[name="google-adsense-account"]');
    const publisherId = accountMeta?.getAttribute('content')?.trim();
    if (!publisherId || !/^ca-pub-\d+$/.test(publisherId)) {
      console.error('No se pudo cargar AdSense Auto ads: falta un ID de editor válido.');
      return;
    }

    if (document.querySelector('script[data-google-adsense-auto]')) return;

    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.dataset.googleAdsenseAuto = 'true';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
    script.onerror = () => {
      console.error('No se pudo cargar el script de Google AdSense Auto ads.');
      script.remove();
    };
    document.head.appendChild(script);
  }, []);

  return (
    <div
      className="relative isolate min-h-screen bg-slate-50 text-slate-900"
      data-store-button-background={buttonBackgroundImageUrl ? 'enabled' : undefined}
      style={{
        ...(backgroundImageUrl ? {
          backgroundImage: `url("${backgroundImageUrl}")`,
          backgroundAttachment: 'fixed',
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        } : {}),
        ...(buttonBackgroundImageUrl ? {
          '--store-button-background-image': `url("${buttonBackgroundImageUrl}")`,
        } : {}),
      }}
    >
      <div className="halloween-glow-layer" aria-hidden="true" />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar />
        <StoreBanner />
        <main className={`flex-1${whiteOutsidePanels ? ' white-outside-panels' : ''}`}>
          <Suspense
            fallback={
              <p role="status" className="px-4 py-16 text-center text-slate-600">
                Cargando página...
              </p>
            }
          >
            <Routes>
            <Route path="/" element={<StorefrontColorTheme><Home /></StorefrontColorTheme>} />
            <Route path="/catalog" element={<StorefrontColorTheme><Catalog /></StorefrontColorTheme>} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <Checkout />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mis-pedidos"
              element={
                <ProtectedRoute>
                  <MyOrders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mi-cuenta"
              element={
                <ProtectedRoute>
                  <MyAccount />
                </ProtectedRoute>
              }
            />
            <Route path="/auth" element={<Auth />} />

            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <Dashboard />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/inventory"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <Inventory />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/orders"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <Orders />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <UserManager />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/coupons"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <Coupons />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/dev"
              element={
                <ProtectedRoute>
                  <DeveloperRoute>
                    <DevConsole />
                  </DeveloperRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dev/settings"
              element={
                <ProtectedRoute>
                  <DeveloperRoute>
                    <ConfigSettings />
                  </DeveloperRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dev/coupons"
              element={
                <ProtectedRoute>
                  <DeveloperRoute>
                    <Coupons />
                  </DeveloperRoute>
                </ProtectedRoute>
              }
            />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <StoreSettingsProvider>
        <CartProvider>
          <BrowserRouter>
            <Storefront />
          </BrowserRouter>
        </CartProvider>
      </StoreSettingsProvider>
    </AuthProvider>
  );
}

export default App;
