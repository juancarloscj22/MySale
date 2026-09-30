import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCart } from '../../context/useCart';
import { getProductById } from '../../services/products';

export default function ProductDetail() {
  const { id } = useParams();
  const { addItem } = useCart();
  const [result, setResult] = useState({ id: null, product: null, error: '' });

  useEffect(() => {
    let active = true;

    getProductById(id)
      .then((result) => {
        if (active) setResult({ id, product: result, error: '' });
      })
      .catch((loadError) => {
        if (active) setResult({ id, product: null, error: loadError.message });
      });

    return () => {
      active = false;
    };
  }, [id]);

  const loading = result.id !== id;
  const { product, error } = result;

  if (loading) {
    return <p className="p-12 text-center text-slate-600">Cargando producto...</p>;
  }

  if (error) {
    return (
      <div role="alert" className="mx-auto max-w-4xl px-4 py-20 text-center text-red-700">
        No se pudo cargar el producto: {error}
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h1 className="text-3xl font-black text-slate-900">Producto no encontrado</h1>
        <Link to="/catalog" className="mt-6 inline-block text-emerald-600 hover:text-emerald-700">
          Volver al catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">{product.brand}</p>
            <h1 className="mt-3 text-4xl font-black text-slate-900">{product.name}</h1>
          </div>

          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span>{product.flavor}</span>
            <span>•</span>
            <span>{product.nicotine}</span>
            <span>•</span>
            <span>{product.puffs} puffs</span>
          </div>

          <div>
            {product.discount_percent > 0 && (
              <span className="inline-block rounded-full bg-pink-100 px-3 py-1 text-sm font-bold text-pink-700">
                Oferta -{product.discount_percent}%
              </span>
            )}
            {product.discount_percent > 0 && (
              <p className="mt-2 text-lg text-slate-500 line-through">${product.originalPrice.toFixed(2)}</p>
            )}
            <p className="text-3xl font-black text-slate-900">${product.price.toFixed(2)}</p>
          </div>
          <p className="text-base leading-7 text-slate-600">{product.description}</p>

          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() => addItem(product)}
              disabled={product.stock === 0}
              className="rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {product.stock === 0 ? 'Sin stock' : 'Agregar al carrito'}
            </button>
            <Link to="/catalog" className="rounded-full border border-slate-300 px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
              Volver
            </Link>
          </div>

          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <div className="flex justify-between"><span>Marca</span><strong>{product.brand}</strong></div>
            <div className="flex justify-between"><span>Stock</span><strong>{product.stock > 0 ? `${product.stock} unidades` : 'Agotado'}</strong></div>
            <div className="flex justify-between"><span>Disponibilidad</span><strong>{product.active ? 'Activo' : 'Inactivo'}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}
