import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import OrderAcceptanceControl from '../../components/OrderAcceptanceControl';
import { useAuth } from '../../context/useAuth';
import { supabase } from '../../lib/supabaseClient';

const tools = [
  {
    to: '/admin',
    title: 'Dashboard administrativo',
    description: 'Métricas reales de la tienda, calendario de entregas y accesos administrativos.',
    status: 'Disponible',
  },
  {
    to: '/admin/inventory',
    title: 'Inventario',
    description: 'Crear productos, modificar su información y administrar stock.',
    status: 'Disponible',
  },
  {
    to: '/dev/settings',
    title: 'Configuración de tienda',
    description: 'Nombre comercial, WhatsApp, moneda y mensaje predeterminado.',
    status: 'Disponible',
  },
  {
    to: '/admin/orders',
    title: 'Pedidos',
    description: 'Consultar pedidos guardados y actualizar su estado desde el panel administrativo.',
    status: 'Disponible',
  },
  {
    to: '/admin/users',
    title: 'Usuarios',
    description: 'Consultar cuentas y bloquear, desbloquear o eliminar usuarios no desarrolladores.',
    status: 'Disponible',
  },
  {
    to: '/dev/coupons',
    title: 'Cupones',
    description: 'Crear y activar cupones porcentuales con vencimiento opcional.',
    status: 'Disponible',
  },
];

function DiagnosticCard({ title, status, detail, loading }) {
  const statusStyle = loading
    ? 'bg-slate-100 text-slate-600'
    : status === 'Conectado'
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-red-100 text-red-700';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold text-slate-900">{title}</h3>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle}`}>
          {loading ? 'Comprobando...' : status}
        </span>
      </div>
      <p className="mt-3 break-words text-sm text-slate-600">{detail}</p>
    </div>
  );
}

export default function DevConsole() {
  const { user, profile } = useAuth();
  const [diagnostics, setDiagnostics] = useState({ loading: true, database: null, policies: null });

  const runDiagnostics = useCallback(async () => {
    const [settingsResult, productsResult] = await Promise.all([
      supabase.from('site_settings').select('id').eq('id', true).single(),
      supabase.from('products').select('id', { count: 'exact', head: true }),
    ]);

    setDiagnostics({
      loading: false,
      database: settingsResult.error
        ? { status: 'Error', detail: settingsResult.error.message }
        : { status: 'Conectado', detail: 'La configuración principal de la tienda responde correctamente.' },
      policies: productsResult.error
        ? { status: 'Error', detail: productsResult.error.message }
        : {
            status: 'Conectado',
            detail: `${productsResult.count ?? 0} productos visibles según las políticas RLS de esta sesión.`,
          },
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void runDiagnostics(), 0);
    return () => clearTimeout(timer);
  }, [runDiagnostics]);

  const refreshDiagnostics = () => {
    setDiagnostics({ loading: true, database: null, policies: null });
    void runDiagnostics();
  };

  const projectHost = new URL(import.meta.env.VITE_SUPABASE_URL).host;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Herramientas técnicas</p>
          <h1 className="mt-2 text-4xl font-black text-slate-900">Consola de desarrollador</h1>
          <p className="mt-3 text-slate-600">
            Sesión: {user?.email ?? 'Sin correo'} · Rol: {profile?.role ?? 'Sin perfil'}
          </p>
        </div>
        <button
          type="button"
          onClick={refreshDiagnostics}
          disabled={diagnostics.loading}
          className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Actualizar diagnóstico
        </button>
      </div>

      <OrderAcceptanceControl />

      <section className="mt-8">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-slate-900">Diagnóstico</h2>
          <p className="mt-1 text-sm text-slate-500">Proyecto conectado: {projectHost}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <DiagnosticCard
            title="Base de datos"
            status={diagnostics.database?.status}
            detail={diagnostics.database?.detail ?? 'Comprobando acceso a la configuración de tienda.'}
            loading={diagnostics.loading}
          />
          <DiagnosticCard
            title="Acceso y RLS"
            status={diagnostics.policies?.status}
            detail={diagnostics.policies?.detail ?? 'Comprobando lectura del catálogo con el rol actual.'}
            loading={diagnostics.loading}
          />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold text-slate-900">Herramientas</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tools.map((tool) => (
            <Link
              key={tool.to}
              to={tool.to}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-bold text-slate-900">{tool.title}</h3>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${tool.status === 'Disponible' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {tool.status}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{tool.description}</p>
              <span className="mt-5 inline-flex text-sm font-semibold text-emerald-700">
                Abrir herramienta <span aria-hidden="true" className="ml-2">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
