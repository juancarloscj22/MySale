import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useCart } from '../context/useCart';

export default function VapeCard({ product }) {
  const { addItem } = useCart();
  const availableFlavors = product.flavors.filter((flavor) => flavor.active);
  const [selectedFlavorId, setSelectedFlavorId] = useState(
    () => availableFlavors.find((flavor) => flavor.stock > 0)?.id ?? '',
  );
  const selectedFlavor = availableFlavors.find((flavor) => flavor.id === selectedFlavorId);
  const hasStock = availableFlavors.some((flavor) => flavor.stock > 0);

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <Link to={`/product/${product.id}`} className="block overflow-hidden">
        <div className="relative">
          <img
            src={product.image}
            alt={product.name}
            className="h-56 w-full object-cover transition duration-300 group-hover:scale-105"
          />
          {product.discount_percent > 0 && (
            <span className="absolute left-3 top-3 rounded-full bg-pink-100 px-3 py-1 text-sm font-black text-pink-700 shadow">
              -{product.discount_percent}% OFF
            </span>
          )}
        </div>
      </Link>

      <div className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
            {product.category}
          </span>
          <span className="text-xs text-slate-500">{hasStock ? `${availableFlavors.length} sabores` : 'Agotado'}</span>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{product.brand}</p>
          <h3 className="mt-1 text-xl font-bold text-slate-900">{product.name}</h3>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">{selectedFlavor ? `${selectedFlavor.flavor} · ${selectedFlavor.stock} disponibles` : 'Selecciona un sabor'}</p>
            {product.discount_percent > 0 ? (
              <>
                <p className="text-xs text-slate-500 line-through">${product.originalPrice.toFixed(2)}</p>
                <p className="text-2xl font-black text-slate-900">${product.price.toFixed(2)}</p>
              </>
            ) : (
              <p className="text-2xl font-black text-slate-900">${product.price.toFixed(2)}</p>
            )}
          </div>
        </div>
        {availableFlavors.length > 0 && (
          <fieldset>
            <legend className="mb-2 text-xs font-semibold text-slate-600">Elige un sabor</legend>
            <div className="flex flex-wrap gap-2">
              {availableFlavors.map((flavor) => (
                <button
                  key={flavor.id}
                  type="button"
                  disabled={flavor.stock === 0}
                  aria-pressed={selectedFlavorId === flavor.id}
                  onClick={() => setSelectedFlavorId(flavor.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
                    selectedFlavorId === flavor.id
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-slate-300 text-slate-700 hover:border-emerald-400'
                  }`}
                >
                  {flavor.flavor}
                </button>
              ))}
            </div>
          </fieldset>
        )}
        <button
          type="button"
          onClick={() => addItem(product, selectedFlavor)}
          disabled={!selectedFlavor || selectedFlavor.stock === 0}
          className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {hasStock ? 'Agregar al carrito' : 'Sin stock'}
        </button>
      </div>
    </article>
  );
}
