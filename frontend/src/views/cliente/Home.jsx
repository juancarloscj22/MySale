import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import VapeCard from '../../components/VapeCard';
import { useAuth } from '../../context/useAuth';
import { getProducts } from '../../services/products';

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [saleProducts, setSaleProducts] = useState([]);
  const [productsError, setProductsError] = useState('');
  const carouselRef = useRef(null);

  useEffect(() => {
    let active = true;

    getProducts({ limit: 12, onSaleOnly: true })
      .then((products) => {
        if (active) setSaleProducts(products);
      })
      .catch((error) => {
        if (active) setProductsError(error.message);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-12 pb-20">
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 rounded-3xl bg-gradient-to-r from-blue-200 via-violet-200 to-pink-100 p-8 sm:p-10">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-purple-700">Ofertas especiales</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900 sm:text-5xl">Productos en descuento</h1>
            <p className="mt-3 max-w-xl text-slate-700">
              Aprovecha los precios especiales por tiempo limitado.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/catalog"
              className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-900 transition hover:bg-emerald-600"
            >
              Ver catálogo
            </Link>
            {!authLoading && (
              <Link
                to={user ? '/mis-pedidos' : '/auth'}
                className="rounded-full border border-slate-400 bg-white/60 px-6 py-3 text-sm font-bold text-slate-900 transition hover:bg-white"
              >
                {user ? 'Ver mis pedidos' : 'Iniciar sesión'}
              </Link>
            )}
          </div>
        </div>

        {productsError && (
          <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
            No se pudieron cargar los productos destacados: {productsError}
          </p>
        )}
        {!productsError && saleProducts.length === 0 && (
          <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
            Aún no hay productos en descuento. Vuelve pronto para descubrir nuestras ofertas.
          </p>
        )}
        {saleProducts.length > 0 && (
          <div className="relative">
            <div
              ref={carouselRef}
              className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-5"
            >
              {saleProducts.map((product) => (
                <div key={product.id} className="w-[min(82vw,20rem)] shrink-0 snap-start">
                  <VapeCard product={product} />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                aria-label="Ver ofertas anteriores"
                onClick={() => carouselRef.current?.scrollBy({ left: -340, behavior: 'smooth' })}
                className="rounded-full border border-blue-300 bg-blue-100 px-4 py-2 font-bold text-blue-800 hover:bg-blue-200"
              >
                ←
              </button>
              <button
                type="button"
                aria-label="Ver más ofertas"
                onClick={() => carouselRef.current?.scrollBy({ left: 340, behavior: 'smooth' })}
                className="rounded-full border border-blue-300 bg-blue-100 px-4 py-2 font-bold text-blue-800 hover:bg-blue-200"
              >
                →
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-cyan-300 bg-cyan-100 p-8 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-800">MySale Shop</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">¿Buscas algo más?</h2>
            <p className="mt-2 text-slate-700">Explora todos los productos disponibles en la tienda.</p>
          </div>
          <Link
            to="/catalog"
            className="mt-5 inline-flex rounded-full bg-blue-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-600 sm:mt-0"
          >
            Explorar catálogo
          </Link>
        </div>
      </section>
    </div>
  );
}
