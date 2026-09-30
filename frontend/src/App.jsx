import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { CartProvider } from './context/CartContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminRoute from './routes/AdminRoute';
import DeveloperRoute from './routes/DeveloperRoute';
import Home from './views/cliente/Home';
import Catalog from './views/cliente/Catalog';
import ProductDetail from './views/cliente/ProductDetail';
import Checkout from './views/cliente/Checkout';
import MyOrders from './views/cliente/MyOrders';
import MyAccount from './views/cliente/MyAccount';
import Auth from './views/auth/Auth';
import Dashboard from './views/admin/Dashboard';
import Inventory from './views/admin/Inventory';
import Orders from './views/admin/Orders';
import UserManager from './views/admin/UserManager';
import DevConsole from './views/dev/DevConsole';
import ConfigSettings from './views/dev/ConfigSettings';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-slate-50 text-slate-900">
            <Navbar />
            <main>
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
              </Routes>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
