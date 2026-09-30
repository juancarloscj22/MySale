import { Link } from 'react-router-dom';
import { useCart } from '../context/useCart';

export default function VapeCard({ product }) {
  const { addItem } = useCart();

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
          <span className="text-xs text-slate-500">{product.stock > 0 ? `${product.stock} disponibles` : 'Agotado'}</span>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{product.brand}</p>
          <h3 className="mt-1 text-xl font-bold text-slate-900">{product.name}</h3>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">{product.flavor}</p>
            {product.discount_percent > 0 ? (
              <>
                <p className="text-xs text-slate-500 line-through">${product.originalPrice.toFixed(2)}</p>
                <p className="text-2xl font-black text-slate-900">${product.price.toFixed(2)}</p>
              </>
            ) : (
              <p className="text-2xl font-black text-slate-900">${product.price.toFixed(2)}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => addItem(product)}
            disabled={product.stock === 0}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {product.stock === 0 ? 'Sin stock' : 'Agregar'}
          </button>
        </div>
      </div>
    </article>
  );
}
