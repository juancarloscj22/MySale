import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useCart } from '../context/useCart';
import { useStoreSettings } from '../context/useStoreSettings';

export default function VapeCard({ product }) {
  const { addItem } = useCart();
  const { productCardBackgroundImageUrl } = useStoreSettings();
  const availableFlavors = product.flavors.filter((flavor) => flavor.active);
  const [selectedFlavorId, setSelectedFlavorId] = useState(
    () => availableFlavors.find((flavor) => flavor.stock > 0)?.id ?? '',
  );
  const selectedFlavor = availableFlavors.find((flavor) => flavor.id === selectedFlavorId);
  const hasStock = availableFlavors.some((flavor) => flavor.stock > 0);

  return (
    <article
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
      style={productCardBackgroundImageUrl ? {
        backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.78)), url("${productCardBackgroundImageUrl}")`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      } : undefined}
    >
      <Link to={`/product/${product.id}`} className="block overflow-hidden">
        <div className="relative">
          <img
            src={selectedFlavor?.image_url || product.image}
            alt={selectedFlavor ? `${product.name} - ${selectedFlavor.flavor}` : product.name}
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
          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-slate-600">Elige un sabor</span>
            <select
              value={selectedFlavorId}
              onChange={(event) => setSelectedFlavorId(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500"
            >
              {!selectedFlavor && (
                <option value="" disabled>
                  {hasStock ? 'Selecciona un sabor' : 'Sin sabores disponibles'}
                </option>
              )}
              {availableFlavors.map((flavor) => (
                <option key={flavor.id} value={flavor.id} disabled={flavor.stock === 0}>
                  {flavor.flavor} · {flavor.stock > 0 ? `${flavor.stock} disponibles` : 'Agotado'}
                </option>
              ))}
            </select>
          </label>
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
