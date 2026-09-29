import { NavLink } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const navItems = [
  { to: '/', label: 'Inicio' },
  { to: '/catalog', label: 'Catálogo' },
  { to: '/mis-pedidos', label: 'Mis pedidos' },
  { to: '/admin', label: 'Admin' },
  { to: '/dev', label: 'Dev' },
  { to: '/auth', label: 'Acceso' },
];

export default function Navbar() {
  const { totalItems } = useCart();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <NavLink to="/" className="flex items-center gap-3 text-lg font-black text-slate-900">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">
            MS
          </span>
          MySale Shop
        </NavLink>

        <nav className="hidden items-center gap-6 md:flex">
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
        </nav>

        <NavLink
          to="/checkout"
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
        >
          Carrito
          <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs text-white">
            {totalItems}
          </span>
        </NavLink>
      </div>
    </header>
  );
}
