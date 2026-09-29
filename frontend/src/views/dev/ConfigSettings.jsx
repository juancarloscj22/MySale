export default function ConfigSettings() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-black text-slate-900">Configuración</h1>
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">WhatsApp</span>
            <input className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500" defaultValue="+52 333 800 1122" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Nombre de la tienda</span>
            <input className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500" defaultValue="MySale Shop" />
          </label>
        </div>
      </div>
    </div>
  );
}
