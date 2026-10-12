import { useEffect, useState } from 'react';
import { getOrderAcceptance } from '../services/orderAcceptance';

export function useOrderAcceptance() {
  const [acceptingOrders, setAcceptingOrders] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    getOrderAcceptance()
      .then((isAccepting) => {
        if (active) setAcceptingOrders(isAccepting);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      });

    return () => {
      active = false;
    };
  }, []);

  return { acceptingOrders, error };
}
