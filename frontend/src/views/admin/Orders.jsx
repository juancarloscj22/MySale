export default function Orders() {
  const orders = [
    { id: 'MS-1001', customer: 'Ana R.', status: 'Pagado', total: 89.9 },
    { id: 'MS-1045', customer: 'Luis T.', status: 'Preparando', total: 62.4 },
    { id: 'MS-1062', customer: 'Marta P.', status: 'Listo', total: 113.2 },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-black text-slate-900">Pedidos</h1>
      <div className="mt-8 space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">{order.id}</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{order.customer}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">{order.status}</span>
              <span className="text-lg font-black text-slate-900">${order.total.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
