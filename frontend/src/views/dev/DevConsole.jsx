export default function DevConsole() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-black text-slate-900">Dev Console</h1>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Estado</p>
          <p className="mt-4 text-3xl font-black text-slate-900">Sistema operativo</p>
          <p className="mt-2 text-slate-600">Vite + React + Supabase + Tailwind</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">RLS</p>
          <p className="mt-4 text-3xl font-black text-slate-900">Listo</p>
          <p className="mt-2 text-slate-600">Políticas pendientes por conectar con Supabase.</p>
        </div>
      </div>
    </div>
  );
}
