import { useEffect, useState } from 'react';
import { useStoreSettings } from '../../context/useStoreSettings';
import { supabase } from '../../lib/supabaseClient';

const initialSettings = {
  whatsapp_number: '',
  store_name: '',
  logo_url: '',
  whatsapp_message: '',
  currency_code: '',
  shipping_fee: '',
};

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500';

export default function ConfigSettings() {
  const { refreshStoreSettings } = useStoreSettings();
  const [settings, setSettings] = useState(initialSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [logoPreviewError, setLogoPreviewError] = useState(false);

  useEffect(() => {
    let active = true;

    supabase
      .from('site_settings')
      .select('whatsapp_number, store_name, logo_url, whatsapp_message, currency_code, shipping_fee')
      .eq('id', true)
      .single()
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) {
          setError(loadError.message);
          return;
        }
        setSettings({
          whatsapp_number: data.whatsapp_number ?? '',
          store_name: data.store_name ?? '',
          logo_url: data.logo_url ?? '',
          whatsapp_message: data.whatsapp_message ?? '',
          currency_code: data.currency_code ?? 'MXN',
          shipping_fee: String(data.shipping_fee ?? 5),
        });
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

  const updateSetting = (event) => {
    const { name, value } = event.target;
    setSettings((current) => ({ ...current, [name]: value }));
    if (name === 'logo_url') setLogoPreviewError(false);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    const shippingFee = Number(settings.shipping_fee);
    if (!Number.isFinite(shippingFee) || shippingFee < 0) {
      setSaving(false);
      setError('El costo de envío debe ser un número válido mayor o igual a cero.');
      return;
    }

    const { data, error: saveError } = await supabase
      .from('site_settings')
      .update({
        whatsapp_number: settings.whatsapp_number.trim() || null,
        store_name: settings.store_name.trim(),
        logo_url: settings.logo_url.trim() || null,
        whatsapp_message: settings.whatsapp_message.trim() || null,
        currency_code: settings.currency_code.trim().toUpperCase(),
        shipping_fee: shippingFee,
      })
      .eq('id', true)
      .select('id')
      .single();

    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    if (!data) {
      setError('No se actualizó la configuración. Verifica que tu rol tenga permiso para modificarla.');
      return;
    }
    try {
      await refreshStoreSettings();
    } catch (refreshError) {
      setError(`La configuración se guardó, pero no se actualizó en la tienda: ${refreshError.message}`);
      return;
    }
    setMessage('Configuración guardada.');
  };

  if (loading) {
    return <p className="p-12 text-center text-slate-600">Cargando configuración...</p>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Desarrollador</p>
      <h1 className="mt-2 text-4xl font-black text-slate-900">Configuración de tienda</h1>
      <p className="mt-3 text-slate-600">Estos datos son públicos y se usan en la experiencia de la tienda.</p>

      {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">No se pudo completar la operación: {error}</p>}
      {message && <p role="status" className="mt-6 rounded-xl bg-emerald-50 p-4 text-emerald-800">{message}</p>}

      <form onSubmit={handleSave} className="mt-8 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Nombre de la tienda *</span>
            <input name="store_name" required value={settings.store_name} onChange={updateSetting} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Moneda (código ISO) *</span>
            <input
              name="currency_code"
              required
              minLength={3}
              maxLength={3}
              pattern="[A-Za-z]{3}"
              value={settings.currency_code}
              onChange={updateSetting}
              className={inputClass}
              placeholder="MXN"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">WhatsApp de pedidos</span>
            <input name="whatsapp_number" type="tel" value={settings.whatsapp_number} onChange={updateSetting} className={inputClass} placeholder="+52..." />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Costo de envío *</span>
            <input
              name="shipping_fee"
              type="number"
              min="0"
              step="0.01"
              required
              value={settings.shipping_fee}
              onChange={updateSetting}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">URL del logotipo</span>
            <input name="logo_url" type="url" value={settings.logo_url} onChange={updateSetting} className={inputClass} placeholder="https://" />
            {settings.logo_url && (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                {logoPreviewError ? (
                  <p role="alert" className="text-sm text-red-700">
                    No se pudo cargar la imagen. Usa una URL pública que apunte directamente a un archivo de imagen.
                  </p>
                ) : (
                  <img
                    src={settings.logo_url}
                    alt="Vista previa del logotipo"
                    onError={() => setLogoPreviewError(true)}
                    className="h-14 w-14 rounded-lg bg-white object-contain p-1"
                  />
                )}
                {!logoPreviewError && <span className="text-sm text-slate-600">Vista previa del logotipo</span>}
              </div>
            )}
          </label>
          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Mensaje inicial de WhatsApp</span>
            <textarea name="whatsapp_message" rows="4" value={settings.whatsapp_message} onChange={updateSetting} className={inputClass} />
          </label>
        </div>

        <button type="submit" disabled={saving} className="rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white disabled:opacity-60">
          {saving ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </form>
    </div>
  );
}
