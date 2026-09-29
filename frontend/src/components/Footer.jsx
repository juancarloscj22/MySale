export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-slate-300">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <p className="text-lg font-bold text-white">MySale Shop</p>
          <p className="text-sm">WhatsApp Delivery · Vape Shop</p>
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
