import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/useAuth';
import { useStoreSettings } from '../../context/useStoreSettings';
import { createCoupon, deleteCoupon, getCoupons, setCouponActive } from '../../services/coupons';

const emptyForm = {
  code: '',
  discountType: 'percent',
  discountValue: '',
  maxUses: '',
  expiresAt: '',
  onlyUndiscountedProducts: false,
};
const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500';
const today = new Date().toLocaleDateString('en-CA');

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(value))
    : 'Sin vencimiento';

export default function Coupons() {
  const { profile } = useAuth();
  const { currencyCode } = useStoreSettings();
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyCoupon, setBusyCoupon] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadCoupons = useCallback(async () => {
    try {
      setCoupons(await getCoupons());
      setError('');
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getCoupons()
      .then((result) => {
        if (active) setCoupons(result);
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

  const handleCreate = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);

    try {
      await createCoupon(form);
      setForm(emptyForm);
      setMessage('Cupón creado.');
      await loadCoupons();
    } catch (createError) {
      setError(createError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (coupon) => {
    setError('');
    setMessage('');
    setBusyCoupon(coupon.id);

    try {
      await setCouponActive(coupon.id, !coupon.active);
      setMessage(coupon.active ? 'Cupón desactivado.' : 'Cupón activado.');
      await loadCoupons();
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setBusyCoupon('');
    }
  };

  const handleDelete = async (coupon) => {
    if (!window.confirm(`¿Eliminar el cupón ${coupon.code}? Los pedidos anteriores conservarán su registro.`)) {
      return;
    }

    setError('');
    setMessage('');
    setBusyCoupon(coupon.id);

    try {
      await deleteCoupon(coupon.id);
      setMessage(`Cupón ${coupon.code} eliminado.`);
      await loadCoupons();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setBusyCoupon('');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Promociones</p>
      <h1 className="mt-2 text-4xl font-black text-slate-900">Cupones de descuento</h1>
      <p className="mt-3 text-slate-600">Crea códigos con descuento, vencimiento y límite opcional de usos.</p>

      {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
      {message && <p role="status" className="mt-6 rounded-xl bg-emerald-100 p-4 text-emerald-800">{message}</p>}

      <form onSubmit={handleCreate} className="mt-8 grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Código del cupón *</span>
          <input
            required
            minLength={3}
            maxLength={32}
            pattern="[A-Za-z0-9_-]+"
            value={form.code}
            onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
            className={inputClass}
            placeholder="MYSale10"
          />
          <span className="mt-1 block text-xs text-slate-500">3-32 letras, números, guion o guion bajo.</span>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Tipo de descuento *</span>
          <select
            value={form.discountType}
            onChange={(event) => setForm((current) => ({
              ...current,
              discountType: event.target.value,
              discountValue: '',
            }))}
            className={inputClass}
          >
            <option value="percent">Porcentaje</option>
            <option value="amount">Monto fijo</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            {form.discountType === 'percent' ? 'Descuento (%) *' : `Monto fijo (${currencyCode}) *`}
          </span>
          <input
            required
            type="number"
            min="0.01"
            max={form.discountType === 'percent' ? '100' : undefined}
            step="0.01"
            value={form.discountValue}
            onChange={(event) => setForm((current) => ({ ...current, discountValue: event.target.value }))}
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-slate-500">
            {form.discountType === 'percent'
              ? 'Porcentaje que se descuenta del subtotal de productos.'
              : 'Monto que se resta del subtotal de productos, sin incluir el envío y limitado al subtotal.'}
          </span>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Cantidad máxima de usos</span>
          <input
            type="number"
            min="1"
            step="1"
            value={form.maxUses}
            onChange={(event) => setForm((current) => ({ ...current, maxUses: event.target.value }))}
            className={inputClass}
            placeholder="Sin límite"
          />
          <span className="mt-1 block text-xs text-slate-500">Déjalo vacío para permitir usos ilimitados.</span>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Válido hasta (opcional)</span>
          <input
            type="date"
            min={today}
            value={form.expiresAt}
            onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))}
            className={inputClass}
          />
        </label>
        <div className="flex flex-wrap items-center gap-5 md:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full border-2 border-emerald-700 bg-white px-6 py-3 text-sm font-extrabold text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-60"
          >
            {saving ? 'Creando...' : 'Crear cupón'}
          </button>
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={form.onlyUndiscountedProducts}
              onChange={(event) => setForm((current) => ({
                ...current,
                onlyUndiscountedProducts: event.target.checked,
              }))}
              className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
            />
            Aplicar solo a productos sin descuento
          </label>
        </div>
      </form>

      <div className="mt-10 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Cupones creados</h2>
        <button
          type="button"
          onClick={() => void loadCoupons()}
          disabled={loading}
          className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-60"
        >
          Actualizar
        </button>
      </div>
      {loading && <p className="py-8 text-slate-600">Cargando cupones...</p>}
      {!loading && !error && coupons.length === 0 && (
        <p className="mt-5 rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          Todavía no hay cupones.
        </p>
      )}
      {!loading && coupons.length > 0 && (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th scope="col" className="p-4">Código</th>
                <th scope="col" className="p-4">Descuento</th>
                <th scope="col" className="p-4">Aplicación</th>
                <th scope="col" className="p-4">Usos</th>
                <th scope="col" className="p-4">Vencimiento</th>
                <th scope="col" className="p-4">Estado</th>
                <th scope="col" className="p-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="border-t border-slate-200">
                  <td className="p-4 font-mono font-bold text-slate-900">{coupon.code}</td>
                  <td className="p-4">
                    {coupon.discount_type === 'amount'
                      ? `${currencyCode} ${Number(coupon.discount_value).toFixed(2)}`
                      : `${Number(coupon.discount_value)}%`}
                  </td>
                  <td className="p-4">
                    {coupon.only_undiscounted_products ? 'Solo sin descuento' : 'Todos los productos'}
                  </td>
                  <td className="p-4">
                    {coupon.max_uses === null
                      ? `${coupon.used_count} / Sin límite`
                      : `${coupon.used_count} / ${coupon.max_uses}`}
                  </td>
                  <td className="p-4">{formatDate(coupon.expires_at)}</td>
                  <td className="p-4">{coupon.active ? 'Activo' : 'Inactivo'}</td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleToggle(coupon)}
                      disabled={busyCoupon === coupon.id}
                      className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
                    >
                      {busyCoupon === coupon.id ? 'Guardando...' : coupon.active ? 'Desactivar' : 'Activar'}
                    </button>
                    {profile?.role === 'developer' && (
                      <button
                        type="button"
                        onClick={() => void handleDelete(coupon)}
                        disabled={busyCoupon === coupon.id}
                        className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50"
                      >
                        {busyCoupon === coupon.id ? 'Procesando...' : 'Eliminar'}
                      </button>
                    )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
