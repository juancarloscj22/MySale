import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminDashboardMetrics } from '../../services/dashboard';

const formatNumber = (value) => new Intl.NumberFormat('es-MX').format(value);

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    getAdminDashboardMetrics()
      .then((result) => {
        if (active) setMetrics(result);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const cards = metrics
    ? [
        {
          label: 'Pedidos de hoy',
          value: formatNumber(metrics.ordersToday),
          tone: 'bg-emerald-100 text-emerald-700',
        },
        {
          label: 'Productos con stock bajo',
          value: formatNumber(metrics.lowStockProducts),
          tone: 'bg-amber-100 text-amber-700',
        },
        {
          label: 'Usuarios registrados',
          value: formatNumber(metrics.users),
          tone: 'bg-cyan-500 text-slate-900',
        },
        {
          label: 'Ventas estimadas de hoy',
          value: new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: metrics.currencyCode,
          }).format(metrics.salesToday),
          tone: 'bg-violet-100 text-violet-700',
        },
      ]
    : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-black text-slate-900">Dashboard</h1>
      {loading && <p className="mt-8 text-slate-600">Cargando métricas...</p>}
      {error && (
        <p role="alert" className="mt-8 rounded-xl bg-red-50 p-4 text-red-700">
          No se pudieron cargar las métricas del dashboard: {error}
        </p>
      )}
      {metrics && (
        <>
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${item.tone}`}>{item.label}</div>
                <p className="mt-4 text-3xl font-black text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Stock bajo: 5 unidades o menos. Ventas estimadas: pedidos de hoy excepto los cancelados.
          </p>
        </>
      )}

      <section className="mt-10">
        <h2 className="text-2xl font-bold text-slate-900">Administración de la tienda</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              to: '/admin/inventory',
              title: 'Inventario',
              description: 'Agregar productos, actualizar precios y stock, y controlar su publicación.',
              action: 'Administrar inventario',
            },
            {
              to: '/admin/orders',
              title: 'Pedidos',
              description: 'Consultar y gestionar los pedidos de la tienda.',
              action: 'Ver pedidos',
            },
            {
              to: '/admin/users',
              title: 'Usuarios',
              description: 'Consultar las cuentas registradas en la tienda.',
              action: 'Ver usuarios',
            },
            {
              to: '/admin/coupons',
              title: 'Cupones',
              description: 'Crear códigos promocionales porcentuales y administrar su vigencia.',
              action: 'Administrar cupones',
            },
          ].map((section) => (
            <Link
              key={section.to}
              to={section.to}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
            >
              <h3 className="text-xl font-bold text-slate-900">{section.title}</h3>
              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{section.description}</p>
              <span className="mt-5 inline-flex text-sm font-semibold text-emerald-700 group-hover:text-emerald-800">
                {section.action} <span aria-hidden="true" className="ml-2">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
