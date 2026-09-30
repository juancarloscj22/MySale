import { Link } from 'react-router-dom';

export default function Dashboard() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-black text-slate-900">Dashboard</h1>
      <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Pedidos del día', value: '128', tone: 'bg-emerald-100 text-emerald-700' },
          { label: 'Stock bajo', value: '14', tone: 'bg-amber-100 text-amber-700' },
          { label: 'Usuarios', value: '2,340', tone: 'bg-cyan-100 text-cyan-700' },
          { label: 'Ventas', value: '$12.4k', tone: 'bg-violet-100 text-violet-700' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${item.tone}`}>{item.label}</div>
            <p className="mt-4 text-3xl font-black text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>

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
