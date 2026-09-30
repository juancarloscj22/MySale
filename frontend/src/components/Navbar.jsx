import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useStoreSettings } from '../context/useStoreSettings';
import { useCart } from '../context/useCart';

const baseNavItems = [
  { to: '/', label: 'Inicio' },
  { to: '/catalog', label: 'Catálogo' },
  { to: '/mis-pedidos', label: 'Mis pedidos' },
  { to: '/mi-cuenta', label: 'Mi cuenta' },
];

export default function Navbar() {
  const { totalItems } = useCart();
  const { user, profile, signOut } = useAuth();
  const { logoUrl, storeName } = useStoreSettings();
  const navigate = useNavigate();
  const [signOutError, setSignOutError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navItems = [
    ...baseNavItems,
    ...(profile?.role === 'admin' || profile?.role === 'developer'
      ? [{ to: '/admin', label: 'Admin' }]
      : []),
    ...(profile?.role === 'developer' ? [{ to: '/dev', label: 'Dev' }] : []),
  ];

  const handleSignOut = async () => {
    setSignOutError('');
    try {
      await signOut();
      setMobileMenuOpen(false);
      navigate('/');
    } catch (error) {
      setSignOutError(error.message);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <NavLink to="/" className="flex min-w-0 items-center gap-2 text-base font-black text-slate-900 sm:gap-3 sm:text-lg">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt=""
              className="h-10 w-10 rounded-full border border-slate-200 bg-white object-contain p-1"
            />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-slate-900">
              MS
            </span>
          )}
          <span className="truncate">{storeName}</span>
        </NavLink>

        <nav aria-label="Navegación principal" className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `text-sm font-medium transition ${
                  isActive ? 'text-emerald-600' : 'text-slate-600 hover:text-slate-900'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          {user ? (
            <button type="button" onClick={handleSignOut} className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Cerrar sesión
            </button>
          ) : (
            <NavLink to="/auth" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Acceso
            </NavLink>
          )}
        </nav>

        <NavLink
          to="/checkout"
          onClick={() => setMobileMenuOpen(false)}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 sm:px-4"
        >
          Carrito
          <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-semibold text-slate-900">
            {totalItems}
          </span>
        </NavLink>

        <button
          type="button"
          aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMobileMenuOpen((open) => !open)}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 md:hidden"
        >
          <span aria-hidden="true" className="text-xl leading-none">{mobileMenuOpen ? '×' : '☰'}</span>
        </button>
      </div>
      {mobileMenuOpen && (
        <nav id="mobile-navigation" aria-label="Navegación móvil" className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    isActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700 hover:bg-slate-50'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            {user ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cerrar sesión
              </button>
            ) : (
              <NavLink
                to="/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Acceso
              </NavLink>
            )}
          </div>
        </nav>
      )}
      {signOutError && <p role="alert" className="px-4 pb-2 text-center text-sm text-red-700">{signOutError}</p>}
    </header>
  );
}
