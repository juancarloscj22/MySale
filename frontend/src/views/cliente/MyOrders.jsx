export default function MyOrders() {
  const orders = [
    { id: 'MS-1001', status: 'Confirmado', total: 89.9, date: '2026-09-28' },
    { id: 'MS-1045', status: 'En tránsito', total: 62.4, date: '2026-09-24' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-black text-slate-900">Mis pedidos</h1>
      <div className="mt-8 space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">{order.id}</p>
              <p className="mt-2 text-xl font-bold text-slate-900">${order.total.toFixed(2)}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                {order.status}
              </span>
              <span className="text-sm text-slate-500">{order.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
