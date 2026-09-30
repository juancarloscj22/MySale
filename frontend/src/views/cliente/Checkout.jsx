import { Link } from 'react-router-dom';
import { useCart } from '../../context/useCart';
import { buildOrderMessage, buildWhatsAppUrl } from '../../lib/whatsapp';

export default function Checkout() {
  const { items, subtotal, removeItem, updateQuantity, clearCart } = useCart();

  const total = subtotal + 5;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h1 className="text-4xl font-black text-slate-900">Tu carrito está vacío</h1>
        <p className="mt-4 text-slate-600">Agrega algunos productos para continuar con tu pedido.</p>
        <Link to="/catalog" className="mt-6 inline-block rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white">
          Explorar catálogo
        </Link>
      </div>
    );
  }

  const order = {
    id: 'MS-1001',
    total,
    items: items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    })),
  };

  const message = buildOrderMessage(order);
  const whatsappUrl = buildWhatsAppUrl('+523338001122', message);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-black text-slate-900">Checkout</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_0.9fr]">
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <img src={item.image} alt={item.name} className="h-24 w-24 rounded-xl object-cover" />
              <div className="flex-1">
                <h2 className="text-lg font-bold text-slate-900">{item.name}</h2>
                <p className="text-sm text-slate-500">{item.flavor}</p>
                <p className="mt-2 text-lg font-black text-slate-900">${(item.price * item.quantity).toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="h-8 w-8 rounded-full border border-slate-300 text-lg">
                  −
                </button>
                <span className="w-8 text-center font-semibold">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="h-8 w-8 rounded-full border border-slate-300 text-lg">
                  +
                </button>
              </div>
              <button onClick={() => removeItem(item.id)} className="ml-2 text-sm font-semibold text-red-500">
                Eliminar
              </button>
            </div>
          ))}
        </div>

        <aside className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-900">Resumen</h2>
          <div className="mt-6 space-y-4 text-sm text-slate-600">
            <div className="flex justify-between"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Envío</span><span>$5.00</span></div>
            <div className="flex justify-between text-lg font-black text-slate-900">
              <span>Total</span><span>${total.toFixed(2)}</span>
            </div>
          </div>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-600"
          >
            Confirmar pedido por WhatsApp
          </a>

          <button onClick={clearCart} className="mt-3 w-full rounded-full border border-slate-300 px-6 py-3 text-sm font-bold text-slate-700">
            Vaciar carrito
          </button>
        </aside>
      </div>
    </div>
  );
}
