import { useEffect, useMemo, useState } from 'react';
import { CartContext } from './cartContext.js';

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    const savedCart = localStorage.getItem('vape-cart');

    if (!savedCart) {
      return [];
    }

    try {
      return JSON.parse(savedCart);
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('vape-cart', JSON.stringify(items));
  }, [items]);

  const addItem = (product, flavor) => {
    if (!flavor?.id) return;
    const cartKey = `${product.id}:${flavor.id}`;

    setItems((current) => {
      const existing = current.find((item) => item.cartKey === cartKey);

      if (existing) {
        return current.map((item) =>
          item.cartKey === cartKey ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [...current, {
        ...product,
        cartKey,
        flavor_id: flavor.id,
        flavor: flavor.flavor,
        flavor_stock: flavor.stock,
        quantity: 1,
      }];
    });
  };

  const removeItem = (cartKey) => {
    setItems((current) => current.filter((item) => (item.cartKey ?? item.id) !== cartKey));
  };

  const updateQuantity = (cartKey, quantity) => {
    setItems((current) =>
      current
        .map((item) =>
          (item.cartKey ?? item.id) === cartKey ? { ...item, quantity: Math.max(0, quantity) } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const clearCart = () => setItems([]);

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, subtotal }}
    >
      {children}
    </CartContext.Provider>
  );
}
