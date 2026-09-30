import { useEffect, useState } from 'react';
import VapeCard from '../../components/VapeCard';
import { getProducts } from '../../services/products';

export default function Catalog() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    getProducts()
      .then((result) => {
        if (active) setProducts(result);
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Catálogo</p>
          <h1 className="mt-2 text-4xl font-black text-slate-900">Encuentra tu próximo favorito</h1>
        </div>

        {!loading && !error && (
          <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
            {products.length} productos disponibles
          </div>
        )}
      </div>

      {loading && <p className="py-12 text-center text-slate-600">Cargando productos...</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">No se pudo cargar el catálogo: {error}</p>}
      {!loading && !error && products.length === 0 && (
        <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          Aún no hay productos disponibles.
        </p>
      )}

      {!loading && !error && products.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <VapeCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
