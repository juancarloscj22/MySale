import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const initialSettings = {
  whatsapp_number: '',
  store_name: '',
  logo_url: '',
  whatsapp_message: '',
  currency_code: '',
};

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500';

export default function ConfigSettings() {
  const [settings, setSettings] = useState(initialSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;

    supabase
      .from('site_settings')
      .select('whatsapp_number, store_name, logo_url, whatsapp_message, currency_code')
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
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    const { data, error: saveError } = await supabase
      .from('site_settings')
      .update({
        whatsapp_number: settings.whatsapp_number.trim() || null,
        store_name: settings.store_name.trim(),
        logo_url: settings.logo_url.trim() || null,
        whatsapp_message: settings.whatsapp_message.trim() || null,
        currency_code: settings.currency_code.trim().toUpperCase(),
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
            <span className="mb-2 block text-sm font-semibold text-slate-700">URL del logotipo</span>
            <input name="logo_url" type="url" value={settings.logo_url} onChange={updateSetting} className={inputClass} placeholder="https://" />
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
