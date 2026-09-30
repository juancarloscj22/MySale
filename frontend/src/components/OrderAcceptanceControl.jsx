import { useEffect, useState } from 'react';
import { getOrderAcceptance, setOrderAcceptance } from '../services/orderAcceptance';

export default function OrderAcceptanceControl() {
  const [acceptingOrders, setAcceptingOrders] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;

    getOrderAcceptance()
      .then((isAccepting) => {
        if (active) setAcceptingOrders(isAccepting);
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

  const toggleAcceptance = async () => {
    const nextValue = !acceptingOrders;
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const savedValue = await setOrderAcceptance(nextValue);
      setAcceptingOrders(savedValue);
      setMessage(savedValue ? 'La tienda volvió a aceptar pedidos.' : 'La tienda dejó de aceptar pedidos.');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Recepción de pedidos</h2>
          <p className="mt-1 text-sm text-slate-600">
            {loading
              ? 'Consultando estado de la tienda...'
              : acceptingOrders === null
                ? 'No se pudo consultar el estado de la tienda.'
                : acceptingOrders
                  ? 'La tienda está abierta para pedidos nuevos.'
                  : 'La tienda está cerrada y no recibe pedidos nuevos.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void toggleAcceptance()}
          disabled={loading || saving || acceptingOrders === null}
          className={`rounded-full px-5 py-3 text-sm font-bold disabled:cursor-wait disabled:opacity-60 ${
            acceptingOrders
              ? 'bg-red-100 text-red-800 hover:bg-red-200'
              : 'bg-emerald-500 text-slate-900 hover:bg-emerald-600'
          }`}
        >
          {loading
            ? 'Cargando...'
            : saving
              ? 'Actualizando...'
              : acceptingOrders
                ? 'Cerrar pedidos'
                : 'Abrir pedidos'}
        </button>
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">No se pudo cambiar el estado: {error}</p>}
      {message && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    </section>
  );
}
