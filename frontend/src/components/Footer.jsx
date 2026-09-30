import { useStoreSettings } from '../context/useStoreSettings';

export default function Footer() {
  const { logoUrl, storeName } = useStoreSettings();

  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-slate-300">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          {logoUrl && (
            <img
              src={logoUrl}
              alt=""
              className="h-10 w-10 rounded-lg bg-white object-contain p-1"
            />
          )}
          <div>
            <p className="text-lg font-bold text-white">{storeName}</p>
            <p className="text-sm">WhatsApp Delivery · Vape Shop</p>
          </div>
        </div>
        <div className="flex gap-4 text-sm">
          <span>Terminos</span>
          <span>Privacidad</span>
          <span>Mayoría de edad</span>
          <span>Contacto</span>
        </div>
      </div>
    </footer>
  );
}
