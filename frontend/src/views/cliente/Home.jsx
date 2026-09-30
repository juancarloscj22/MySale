import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import VapeCard from '../../components/VapeCard';
import { getProducts } from '../../services/products';

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [productsError, setProductsError] = useState('');

  useEffect(() => {
    let active = true;

    getProducts({ limit: 3 })
      .then((products) => {
        if (active) setFeatured(products);
      })
      .catch((error) => {
        if (active) setProductsError(error.message);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-16 pb-20">
      <section className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-slate-900 text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
              Delivery en WhatsApp
            </span>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
              Descubre los mejores sabores del momento.
            </h1>
            <p className="max-w-xl text-base text-emerald-50">
              Catálogo de vaporizadores premium, disposables y accesorios con una experiencia de compra rápida y segura.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/catalog"
                className="rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-100"
              >
                Ver catálogo
              </Link>
              <Link
                to="/auth"
                className="rounded-full border border-white/40 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Iniciar sesión
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/20 bg-white/10 p-4 shadow-2xl backdrop-blur-sm">
            <img
              src="https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=1200&q=80"
              alt="Productos de vape"
              className="h-[440px] w-full rounded-[1.5rem] object-cover"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { label: 'Pedidos del día', value: '128' },
            { label: 'Usuarios activos', value: '2.4k' },
            { label: 'Valor promedio', value: '$84.50' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p className="mt-3 text-3xl font-black text-slate-900">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Trending</p>
            <h2 className="mt-2 text-3xl font-black text-slate-900">Productos destacados</h2>
          </div>
          <Link to="/catalog" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">
            Ver todo
          </Link>
        </div>

        {productsError && (
          <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
            No se pudieron cargar los productos destacados: {productsError}
          </p>
        )}
        {!productsError && featured.length === 0 && (
          <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
            Aún no hay productos destacados.
          </p>
        )}
        {featured.length > 0 && (
          <div className="grid gap-6 md:grid-cols-3">
            {featured.map((product) => (
              <VapeCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
