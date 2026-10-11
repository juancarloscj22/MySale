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
      className="storefront-product-card group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
      style={productCardBackgroundImageUrl ? {
        backgroundImage: `url("${productCardBackgroundImageUrl}")`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      } : undefined}
    >
      <Link to={`/product/${product.id}`} className="block overflow-hidden">
        <div className="relative">
          <img
            src={selectedFlavor?.image_url || product.image}
            alt={selectedFlavor ? `${product.name} - ${selectedFlavor.flavor}` : product.name}
            className="block h-[26rem] w-full max-w-full object-cover transition duration-300 group-hover:scale-105 sm:h-[32rem] lg:h-[36rem]"
          />
          {product.discount_percent > 0 && (
            <span className="product-discount-tag absolute left-2 top-2 rounded-full bg-pink-100 px-2 py-1 text-2xl font-black text-pink-700 shadow sm:left-3 sm:top-3 sm:px-3 sm:text-3xl">
              -{product.discount_percent}% OFF
            </span>
          )}
        </div>
      </Link>

      <div className="product-card-copy min-w-0 space-y-2 p-2 sm:space-y-4 sm:p-5">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <span className="product-tag rounded-full bg-emerald-100 px-1.5 py-1 text-[1.4rem] font-semibold leading-tight text-emerald-700 sm:px-2 sm:text-2xl">
            {product.category}
          </span>
          <span className="product-meta product-flavor-count text-2xl text-slate-500 sm:text-3xl">{hasStock ? `${availableFlavors.length} sabores` : 'Agotado'}</span>
          </div>

        <div className="min-w-0">
          <p className="product-brand text-6xl uppercase tracking-[0.12em] text-slate-400 sm:text-7xl sm:tracking-[0.2em]">{product.brand}</p>
          <h3 className="product-name mt-1 text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">{product.name}</h3>
        </div>

        <div className="flex min-w-0 items-center justify-between">
          <div className="min-w-0">
            <p className="product-meta text-[1.4rem] leading-tight text-slate-500 sm:text-3xl">{selectedFlavor ? `${selectedFlavor.flavor} · ${selectedFlavor.stock} disponibles` : 'Selecciona un sabor'}</p>
            {product.discount_percent > 0 ? (
              <>
                <p className="product-original-price text-2xl text-slate-500 line-through">${product.originalPrice.toFixed(2)}</p>
                <p className="product-price text-4xl font-black text-slate-900 sm:text-5xl">${product.price.toFixed(2)}</p>
              </>
            ) : (
              <p className="product-price text-4xl font-black text-slate-900 sm:text-5xl">${product.price.toFixed(2)}</p>
            )}
          </div>
        </div>
        {availableFlavors.length > 0 && (
          <label className="block">
            <span className="mb-1 block text-xl font-semibold text-slate-600 sm:mb-2 sm:text-2xl">Elige un sabor</span>
            <select
              value={selectedFlavorId}
              onChange={(event) => setSelectedFlavorId(event.target.value)}
              className="flavor-select w-full rounded-xl border border-slate-300 bg-white px-1.5 py-1.5 text-xl font-semibold text-slate-700 outline-none focus:border-emerald-500 sm:px-4 sm:py-3 sm:text-3xl"
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
          className="w-full max-w-full whitespace-normal break-words rounded-full bg-slate-900 px-2 py-2 text-2xl font-semibold leading-tight text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300 sm:px-4 sm:py-2 sm:text-3xl"
        >
          {hasStock ? 'Agregar al carrito' : 'Sin stock'}
        </button>
      </div>
    </article>
  );
}
