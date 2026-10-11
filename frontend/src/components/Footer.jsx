import { useEffect, useRef, useState } from 'react';
import { useStoreSettings } from '../context/useStoreSettings';

const policies = [
  {
    id: 'terms',
    label: 'Términos',
    title: 'Términos de compra',
    paragraphs: [
      'Los productos, precios, descuentos y existencias se muestran con fines informativos y se verifican al confirmar el pedido. El pedido se registra cuando la tienda lo confirma; elegir un método de pago en el checkout no procesa un pago en línea.',
      'El cliente debe proporcionar datos de contacto correctos y coordinar por WhatsApp el envío de su ubicación. La fecha y hora solicitadas son preferencias que deben confirmarse con la tienda.',
      'El costo de envío configurado se aplica cuando el cliente indica que vive en una zona aledaña; en caso contrario, el envío se muestra como gratuito. Los cupones y descuentos están sujetos a las condiciones indicadas al aplicarlos.',
      'La cancelación y cualquier ajuste del pedido dependen de su estado y de la normativa aplicable. Contacta a la tienda cuanto antes para solicitar ayuda; los pedidos en tránsito o completados no se pueden cancelar desde la tienda.',
    ],
  },
  {
    id: 'privacy',
    label: 'Privacidad',
    title: 'Aviso de privacidad',
    paragraphs: [
      'Para crear y proteger una cuenta y gestionar pedidos, la tienda procesa datos como nombre, correo electrónico, teléfono, historial y contenido de pedidos, preferencias de entrega y pago, y la información técnica necesaria para operar el sitio.',
      'Los datos se usan para autenticación, atención al cliente, coordinación y seguimiento de pedidos, seguridad y administración de la tienda. La información de cuenta y pedidos se almacena mediante Supabase. Al pulsar el enlace de WhatsApp, los datos del pedido incluidos en el mensaje se comparten con WhatsApp para que puedas coordinar la entrega.',
      'El sitio puede mostrar anuncios de Google AdSense. Google y sus socios pueden utilizar cookies o identificadores conforme a sus propias políticas y a la configuración disponible en tu región.',
      'Puedes solicitar acceso, corrección o eliminación de tus datos por el canal de contacto. Algunos registros de pedidos pueden conservarse cuando sea necesario para la operación o para cumplir obligaciones aplicables.',
    ],
  },
  {
    id: 'age',
    label: 'Mayoría de edad',
    title: 'Política de mayoría de edad',
    paragraphs: [
      'La compra de productos de vapeo está destinada exclusivamente a personas de 18 años o más. Al crear una cuenta o realizar un pedido, confirmas que cumples este requisito.',
      'No realices una compra si eres menor de edad ni facilites productos a menores. La tienda puede solicitar información razonable para verificar la edad y rechazar o cancelar una venta cuando no pueda confirmarla o cuando la ley lo requiera.',
      'El acceso al sitio no cambia las restricciones de edad establecidas por las leyes del lugar donde te encuentres; el cliente es responsable de cumplirlas.',
    ],
  },
  {
    id: 'contact',
    label: 'Contacto',
    title: 'Contacto y atención',
    paragraphs: [
      'Para dudas sobre productos, pedidos, entregas, privacidad o solicitudes de cancelación, comunícate con la tienda por WhatsApp.',
    ],
  },
];

export default function Footer() {
  const { logoUrl, storeName, whatsappNumber } = useStoreSettings();
  const [activePolicy, setActivePolicy] = useState(() => (
    sessionStorage.getItem('mysale-age-policy-shown')
      ? null
      : policies.find((policy) => policy.id === 'age')
  ));
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (activePolicy?.id === 'age') {
      sessionStorage.setItem('mysale-age-policy-shown', 'true');
    }
  }, [activePolicy]);

  useEffect(() => {
    if (!activePolicy) return undefined;

    const previousFocus = document.activeElement;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setActivePolicy(null);
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [activePolicy]);

  const phoneDigits = whatsappNumber.replace(/\D/g, '');
  const contactUrl = /^\d{8,15}$/.test(phoneDigits)
    ? `https://wa.me/${phoneDigits}`
    : '';

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
            <p className="store-name text-lg font-bold text-white">{storeName}</p>
            <p className="text-sm">WhatsApp Delivery · Vape Shop</p>
          </div>
        </div>
        <nav aria-label="Políticas de la tienda" className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {policies.map((policy) => (
            <button
              key={policy.id}
              type="button"
              onClick={() => setActivePolicy(policy)}
              className="footer-policy-button border-0 bg-slate-950 p-0 text-slate-300 underline-offset-4 hover:bg-slate-950 hover:text-white hover:underline"
            >
              {policy.label}
            </button>
          ))}
        </nav>
      </div>

      {activePolicy && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActivePolicy(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="policy-title"
            className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-300 bg-white p-6 text-slate-900 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id="policy-title" className="text-2xl font-bold">{activePolicy.title}</h2>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setActivePolicy(null)}
                aria-label="Cerrar mensaje"
                className="shrink-0 rounded-full border border-slate-400 px-3 py-1 font-bold text-slate-900 hover:bg-slate-100"
              >
                ×
              </button>
            </div>
            <div className="mt-5 space-y-4 text-sm leading-6">
              {activePolicy.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {activePolicy.id === 'contact' && (
                contactUrl ? (
                  <a
                    href={contactUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-full border border-slate-900 bg-[#39E639] px-5 py-2.5 font-semibold text-black hover:bg-[#2fcf2f]"
                  >
                    Abrir WhatsApp
                  </a>
                ) : (
                  <p role="status">El canal de WhatsApp todavía no está configurado.</p>
                )
              )}
            </div>
          </section>
        </div>
      )}
    </footer>
  );
}
