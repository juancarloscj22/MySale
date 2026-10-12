import { useEffect, useMemo, useState } from 'react';
import { CartContext } from './cartContext.js';
import { useAuth } from './useAuth';
import {
  getPendingProductRedemptions,
  isMissingRewardCheckoutFunction,
} from '../services/rewards';

export function CartProvider({ children }) {
  const { user } = useAuth();
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
  const [cartError, setCartError] = useState('');
  const [redemptionSetupError, setRedemptionSetupError] = useState('');
  const [redemptionFeatureAvailable, setRedemptionFeatureAvailable] = useState(true);
  const [redemptionsLoadedForUserId, setRedemptionsLoadedForUserId] = useState('');
  const loadingRedemptions = Boolean(user?.id && redemptionsLoadedForUserId !== user.id);

  useEffect(() => {
    localStorage.setItem('vape-cart', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (!user?.id) return undefined;
    let active = true;

    getPendingProductRedemptions(user.id)
      .then((redemptions) => {
        if (!active) return;
        setCartError('');
        setItems((current) => {
          const userItems = current.filter(
            (item) => !item.reward_user_id || item.reward_user_id === user.id,
          );
          const existingIds = new Set(
            userItems.map((item) => item.reward_redemption_id).filter(Boolean),
          );
          const pendingItems = redemptions
            .filter((redemption) => !existingIds.has(redemption.id))
            .map((redemption) => ({
              id: redemption.product_id,
              product_id: redemption.product_id,
              name: redemption.product_name,
              image: redemption.image_url ?? '',
              flavor_id: redemption.flavor_id,
              flavor: redemption.flavor_name ?? '',
              flavor_image_url: redemption.image_url ?? '',
              price: 0,
              originalPrice: 0,
              discount_percent: 0,
              reward_points_spent: redemption.points_spent,
              quantity: 1,
              cartKey: `redemption:${redemption.id}`,
              reward_redemption_id: redemption.id,
              reward_user_id: user.id,
            }));
          return [...userItems, ...pendingItems];
        });
      })
      .catch((error) => {
        if (!active) return;
        if (isMissingRewardCheckoutFunction(error)) {
          setRedemptionFeatureAvailable(false);
          setRedemptionSetupError(
            'La base de datos aún no tiene activa la integración de canjes con el carrito.',
          );
        } else {
          setCartError(error.message);
        }
      })
      .finally(() => {
        if (active) setRedemptionsLoadedForUserId(user.id);
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  const visibleItems = useMemo(
    () => items.filter(
      (item) => !item.reward_user_id || item.reward_user_id === user?.id,
    ),
    [items, user?.id],
  );

  const addItem = (product, flavor, quantity = 1) => {
    if (!flavor?.id || !Number.isInteger(quantity) || quantity < 1) return;
    const cartKey = `${product.id}:${flavor.id}`;

    setItems((current) => {
      const existing = current.find((item) => item.cartKey === cartKey);

      if (existing) {
        return current.map((item) =>
          item.cartKey === cartKey ? { ...item, quantity: item.quantity + quantity } : item,
        );
      }

      return [...current, {
        ...product,
        cartKey,
        flavor_id: flavor.id,
        flavor: flavor.flavor,
        flavor_image_url: flavor.image_url ?? '',
        flavor_stock: flavor.stock,
        quantity,
      }];
    });
  };

  const addRedeemedItem = (product, redemption, userId) => {
    if (!product?.id || !redemption?.redemption_id || !redemption?.flavor_id) return;
    const cartKey = `redemption:${redemption.redemption_id}`;

    setItems((current) => {
      if (current.some((item) => item.reward_redemption_id === redemption.redemption_id)) {
        return current;
      }

      return [...current, {
        ...product,
        cartKey,
        flavor_id: redemption.flavor_id,
        flavor: redemption.flavor,
        flavor_image_url: redemption.image_url ?? '',
        quantity: 1,
        price: 0,
        originalPrice: 0,
        discount_percent: 0,
        reward_points_spent: redemption.points_spent,
        reward_redemption_id: redemption.redemption_id,
        reward_user_id: userId,
      }];
    });
  };

  const removeItem = (cartKey) => {
    setItems((current) => current.filter((item) => (
      item.reward_redemption_id || (item.cartKey ?? item.id) !== cartKey
    )));
  };

  const updateQuantity = (cartKey, quantity) => {
    setItems((current) =>
      current
        .map((item) =>
          !item.reward_redemption_id && (item.cartKey ?? item.id) === cartKey
            ? { ...item, quantity: Math.max(0, quantity) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const clearCart = ({ includeRedeemed = false } = {}) => setItems((current) => (
    includeRedeemed ? [] : current.filter((item) => item.reward_redemption_id)
  ));

  const totalItems = useMemo(
    () => visibleItems.reduce((sum, item) => sum + item.quantity, 0),
    [visibleItems],
  );

  const subtotal = useMemo(
    () => visibleItems.reduce(
      (sum, item) => sum + (item.reward_redemption_id ? 0 : item.price * item.quantity),
      0,
    ),
    [visibleItems],
  );

  return (
    <CartContext.Provider
      value={{
        items: visibleItems,
        addItem,
        addRedeemedItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
        loadingRedemptions,
        cartError,
        redemptionSetupError,
        redemptionFeatureAvailable,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
