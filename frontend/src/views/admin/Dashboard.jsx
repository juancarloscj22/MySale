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
    </div>
  );
}
