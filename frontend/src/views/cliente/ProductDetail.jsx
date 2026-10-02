import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCart } from '../../context/useCart';
import { getProductById } from '../../services/products';

export default function ProductDetail() {
  const { id } = useParams();
  const { addItem } = useCart();
  const [selectedFlavorId, setSelectedFlavorId] = useState('');
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
  const availableFlavors = product?.flavors.filter((flavor) => flavor.active) ?? [];
  const selectedFlavor = availableFlavors.find((flavor) => flavor.id === selectedFlavorId)
    ?? availableFlavors.find((flavor) => flavor.stock > 0);

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
          <img
            src={selectedFlavor?.image_url || product.image}
            alt={selectedFlavor ? `${product.name} - ${selectedFlavor.flavor}` : product.name}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">{product.brand}</p>
            <h1 className="mt-3 text-4xl font-black text-slate-900">{product.name}</h1>
          </div>

          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span>{product.nicotine || 'Nicotina no especificada'}</span>
            <span>•</span>
            <span>{product.puffs ? `${product.puffs} puffs` : 'Caladas no especificadas'}</span>
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

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Selecciona un sabor *</span>
            <select
              value={selectedFlavor?.id ?? ''}
              onChange={(event) => setSelectedFlavorId(event.target.value)}
              disabled={availableFlavors.length === 0}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              {availableFlavors.length === 0 && <option value="">Sin sabores disponibles</option>}
              {availableFlavors.length > 0 && !selectedFlavor && (
                <option value="" disabled>Sin sabores disponibles</option>
              )}
              {availableFlavors.map((flavor) => (
                <option key={flavor.id} value={flavor.id} disabled={flavor.stock === 0}>
                  {flavor.flavor} · {flavor.stock > 0 ? `${flavor.stock} disponibles` : 'Agotado'}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() => addItem(product, selectedFlavor)}
              disabled={!selectedFlavor}
              className="rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {selectedFlavor ? 'Agregar al carrito' : 'Sin sabores disponibles'}
            </button>
            <Link to="/catalog" className="rounded-full border border-slate-300 px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
              Volver
            </Link>
          </div>

          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <div className="flex justify-between"><span>Marca</span><strong>{product.brand}</strong></div>
            <div className="flex justify-between"><span>Stock total</span><strong>{product.stock > 0 ? `${product.stock} unidades` : 'Agotado'}</strong></div>
            <div className="flex justify-between"><span>Disponibilidad</span><strong>{product.active ? 'Activo' : 'Inactivo'}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}
