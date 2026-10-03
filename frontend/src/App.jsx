import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import StoreAdLayout from './components/StoreAdLayout';
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

function Storefront() {
  const { backgroundImageUrl } = useStoreSettings();

  return (
    <div
      className="flex min-h-screen flex-col bg-slate-50 text-slate-900"
      style={backgroundImageUrl ? {
        backgroundImage: `linear-gradient(rgba(247, 250, 255, 0.84), rgba(247, 250, 255, 0.84)), url("${backgroundImageUrl}")`,
        backgroundAttachment: 'fixed',
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      } : undefined}
    >
      <Navbar />
      <StoreBanner />
      <StoreAdLayout>
        <Suspense
          fallback={
            <p role="status" className="px-4 py-16 text-center text-slate-600">
              Cargando página...
            </p>
          }
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/catalog" element={<Catalog />} />
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
      </StoreAdLayout>
      <Footer />
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
