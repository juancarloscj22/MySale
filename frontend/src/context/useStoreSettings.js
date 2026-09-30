import { useContext } from 'react';
import { StoreSettingsContext } from './storeSettingsContext.js';

export function useStoreSettings() {
  const context = useContext(StoreSettingsContext);

  if (!context) {
    throw new Error('useStoreSettings must be used inside StoreSettingsProvider');
  }

  return context;
}
