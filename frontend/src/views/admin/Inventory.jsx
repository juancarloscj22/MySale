import { useEffect, useState } from 'react';
import { getProducts } from '../../services/products';

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    getProducts({ includeInactive: true })
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
      <h1 className="text-4xl font-black text-slate-900">Inventario</h1>
      {loading && <p className="py-8 text-slate-600">Cargando inventario...</p>}
      {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">No se pudo cargar el inventario: {error}</p>}
      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="p-4">Producto</th>
              <th className="p-4">Stock</th>
              <th className="p-4">Precio</th>
              <th className="p-4">Estado</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-t border-slate-200">
                <td className="p-4 font-semibold text-slate-900">{product.name}</td>
                <td className="p-4">{product.stock}</td>
                <td className="p-4">${product.price.toFixed(2)}</td>
                <td className="p-4">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${product.stock > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {product.stock > 0 ? 'Disponible' : 'Agotado'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
