import VapeCard from '../../components/VapeCard';
import { products } from '../../services/products';

export default function Catalog() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Catálogo</p>
          <h1 className="mt-2 text-4xl font-black text-slate-900">Encuentra tu próximo favorito</h1>
        </div>

        <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
          {products.length} productos disponibles
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <VapeCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
