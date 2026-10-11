import { useEffect, useState } from 'react';
import VapeCard from '../../components/VapeCard';
import { getProducts } from '../../services/products';

export default function Home() {
  const [saleProducts, setSaleProducts] = useState([]);
  const [productsError, setProductsError] = useState('');

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
    <div className="pb-12 pt-6 sm:pb-20 sm:pt-10">
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {productsError && (
          <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
            No se pudieron cargar los productos destacados: {productsError}
          </p>
        )}
        {saleProducts.length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
            {saleProducts.map((product) => <VapeCard key={product.id} product={product} />)}
          </div>
        )}
      </section>
    </div>
  );
}
