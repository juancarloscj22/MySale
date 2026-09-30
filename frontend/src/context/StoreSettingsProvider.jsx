import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { StoreSettingsContext } from './storeSettingsContext.js';

const defaults = { storeName: 'MySale Shop', logoUrl: '' };

export function StoreSettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaults);

  const refreshStoreSettings = useCallback(async () => {
    const { data, error } = await supabase
      .from('site_settings')
      .select('store_name, logo_url')
      .eq('id', true)
      .single();

    if (error) throw error;

    setSettings({
      storeName: data.store_name?.trim() || defaults.storeName,
      logoUrl: data.logo_url?.trim() || '',
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshStoreSettings().catch((error) => {
        console.error('No se pudo cargar la identidad de la tienda:', error.message);
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [refreshStoreSettings]);

  return (
    <StoreSettingsContext.Provider value={{ ...settings, refreshStoreSettings }}>
      {children}
    </StoreSettingsContext.Provider>
  );
}
