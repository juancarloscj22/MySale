import { useEffect, useState } from 'react';
import { useStoreSettings } from '../../context/useStoreSettings';
import { supabase } from '../../lib/supabaseClient';

const initialSettings = {
  whatsapp_number: '',
  store_name: '',
  logo_url: '',
  banner_url: '',
  background_image_url: '',
  product_card_background_image_url: '',
  navbar_background_image_url: '',
  whatsapp_message: '',
  currency_code: '',
  shipping_fee: '',
  adsense_publisher_id: '',
  adsense_left_slot: '',
  adsense_right_slot: '',
};

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500';

const isHttpUrl = (value) => {
  if (!value.trim()) return true;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

export default function ConfigSettings() {
  const { refreshStoreSettings } = useStoreSettings();
  const [settings, setSettings] = useState(initialSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [logoPreviewError, setLogoPreviewError] = useState(false);
  const [bannerPreviewError, setBannerPreviewError] = useState(false);
  const [backgroundPreviewError, setBackgroundPreviewError] = useState(false);
  const [cardBackgroundPreviewError, setCardBackgroundPreviewError] = useState(false);
  const [navbarBackgroundPreviewError, setNavbarBackgroundPreviewError] = useState(false);

  useEffect(() => {
    let active = true;

    supabase
      .from('site_settings')
      .select('whatsapp_number, store_name, logo_url, banner_url, background_image_url, product_card_background_image_url, navbar_background_image_url, whatsapp_message, currency_code, shipping_fee, adsense_publisher_id, adsense_left_slot, adsense_right_slot')
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
          banner_url: data.banner_url ?? '',
          background_image_url: data.background_image_url ?? '',
          product_card_background_image_url: data.product_card_background_image_url ?? '',
          navbar_background_image_url: data.navbar_background_image_url ?? '',
          whatsapp_message: data.whatsapp_message ?? '',
          currency_code: data.currency_code ?? 'MXN',
          shipping_fee: String(data.shipping_fee ?? 5),
          adsense_publisher_id: data.adsense_publisher_id ?? '',
          adsense_left_slot: data.adsense_left_slot ?? '',
          adsense_right_slot: data.adsense_right_slot ?? '',
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
    if (name === 'banner_url') setBannerPreviewError(false);
    if (name === 'background_image_url') setBackgroundPreviewError(false);
    if (name === 'product_card_background_image_url') setCardBackgroundPreviewError(false);
    if (name === 'navbar_background_image_url') setNavbarBackgroundPreviewError(false);
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
    const imageUrls = [
      settings.banner_url,
      settings.background_image_url,
      settings.product_card_background_image_url,
      settings.navbar_background_image_url,
    ];
    if (imageUrls.some((url) => !isHttpUrl(url))) {
      setSaving(false);
      setError('Las imágenes del banner y los fondos deben usar una URL pública HTTP o HTTPS válida.');
      return;
    }
    const publisherId = settings.adsense_publisher_id.trim();
    const leftSlot = settings.adsense_left_slot.trim();
    const rightSlot = settings.adsense_right_slot.trim();
    if (publisherId && !/^ca-pub-\d+$/.test(publisherId)) {
      setSaving(false);
      setError('El ID de editor de AdSense debe tener el formato ca-pub- seguido de números.');
      return;
    }
    if ([leftSlot, rightSlot].some((slot) => slot && !/^\d+$/.test(slot))) {
      setSaving(false);
      setError('Los IDs de las unidades de anuncio deben contener solo números.');
      return;
    }

    const { data, error: saveError } = await supabase
      .from('site_settings')
      .update({
        whatsapp_number: settings.whatsapp_number.trim() || null,
        store_name: settings.store_name.trim(),
        logo_url: settings.logo_url.trim() || null,
        banner_url: settings.banner_url.trim() || null,
        background_image_url: settings.background_image_url.trim() || null,
        product_card_background_image_url: settings.product_card_background_image_url.trim() || null,
        navbar_background_image_url: settings.navbar_background_image_url.trim() || null,
        whatsapp_message: settings.whatsapp_message.trim() || null,
        currency_code: settings.currency_code.trim().toUpperCase(),
        shipping_fee: shippingFee,
        adsense_publisher_id: publisherId || null,
        adsense_left_slot: leftSlot || null,
        adsense_right_slot: rightSlot || null,
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
            <span className="mb-2 block text-sm font-semibold text-slate-700">URL del banner horizontal</span>
            <input
              name="banner_url"
              type="url"
              maxLength={2048}
              value={settings.banner_url}
              onChange={updateSetting}
              className={inputClass}
              placeholder="https://"
            />
            <span className="mt-1 block text-xs text-slate-500">Se muestra debajo de la barra de navegación y se adapta al ancho de pantalla.</span>
            {settings.banner_url && (
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {bannerPreviewError ? (
                  <p role="alert" className="p-3 text-sm text-red-700">No se pudo cargar la imagen del banner.</p>
                ) : (
                  <img
                    src={settings.banner_url}
                    alt="Vista previa del banner"
                    onError={() => setBannerPreviewError(true)}
                    className="aspect-[6/1] w-full object-cover"
                  />
                )}
              </div>
            )}
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">URL de imagen de fondo</span>
            <input
              name="background_image_url"
              type="url"
              maxLength={2048}
              value={settings.background_image_url}
              onChange={updateSetting}
              className={inputClass}
              placeholder="https://"
            />
            <span className="mt-1 block text-xs text-slate-500">Se muestra detrás del contenido con una capa clara para conservar la legibilidad.</span>
            {settings.background_image_url && (
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {backgroundPreviewError ? (
                  <p role="alert" className="p-3 text-sm text-red-700">No se pudo cargar la imagen de fondo.</p>
                ) : (
                  <img
                    src={settings.background_image_url}
                    alt="Vista previa del fondo"
                    onError={() => setBackgroundPreviewError(true)}
                    className="h-28 w-full object-cover"
                  />
                )}
              </div>
            )}
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">URL del fondo de productos</span>
            <input
              name="product_card_background_image_url"
              type="url"
              maxLength={2048}
              value={settings.product_card_background_image_url}
              onChange={updateSetting}
              className={inputClass}
              placeholder="https://"
            />
            <span className="mt-1 block text-xs text-slate-500">Se aplica detrás de las tarjetas de producto en Inicio y Catálogo.</span>
            {settings.product_card_background_image_url && (
              <div className="mt-3 h-28 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {cardBackgroundPreviewError ? (
                  <p role="alert" className="p-3 text-sm text-red-700">No se pudo cargar la imagen de fondo de los productos.</p>
                ) : (
                  <img
                    src={settings.product_card_background_image_url}
                    alt="Vista previa del fondo de productos"
                    onError={() => setCardBackgroundPreviewError(true)}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
            )}
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">URL del fondo de la barra de inicio</span>
            <input
              name="navbar_background_image_url"
              type="url"
              maxLength={2048}
              value={settings.navbar_background_image_url}
              onChange={updateSetting}
              className={inputClass}
              placeholder="https://"
            />
            <span className="mt-1 block text-xs text-slate-500">Se muestra como imagen de fondo de la barra superior.</span>
            {settings.navbar_background_image_url && (
              <div className="mt-3 h-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {navbarBackgroundPreviewError ? (
                  <p role="alert" className="p-3 text-sm text-red-700">No se pudo cargar la imagen de fondo de la barra.</p>
                ) : (
                  <img
                    src={settings.navbar_background_image_url}
                    alt="Vista previa del fondo de la barra"
                    onError={() => setNavbarBackgroundPreviewError(true)}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
            )}
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
          <fieldset className="space-y-4 rounded-xl border border-slate-200 p-4 md:col-span-2">
            <legend className="px-2 text-sm font-bold text-slate-800">Anuncios Google AdSense</legend>
            <p className="text-sm text-slate-600">
              Al aprobar tu cuenta, agrega el ID de editor y los IDs de las dos unidades. Los anuncios laterales se colocan debajo del contenido en móvil; mientras no haya IDs, se muestran espacios reservados.
            </p>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">ID de editor</span>
              <input
                name="adsense_publisher_id"
                value={settings.adsense_publisher_id}
                onChange={updateSetting}
                className={inputClass}
                placeholder="ca-pub-0000000000000000"
                maxLength={40}
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">ID de unidad izquierda</span>
                <input
                  name="adsense_left_slot"
                  inputMode="numeric"
                  value={settings.adsense_left_slot}
                  onChange={updateSetting}
                  className={inputClass}
                  placeholder="0000000000"
                  maxLength={32}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">ID de unidad derecha</span>
                <input
                  name="adsense_right_slot"
                  inputMode="numeric"
                  value={settings.adsense_right_slot}
                  onChange={updateSetting}
                  className={inputClass}
                  placeholder="0000000000"
                  maxLength={32}
                />
              </label>
            </div>
          </fieldset>
        </div>

        <button type="submit" disabled={saving} className="rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white disabled:opacity-60">
          {saving ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </form>
    </div>
  );
}
