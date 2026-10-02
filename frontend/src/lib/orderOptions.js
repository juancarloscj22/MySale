export const paymentMethods = [
  { value: 'cash', label: 'Efectivo al recibir' },
  { value: 'bank_transfer', label: 'Transferencia bancaria' },
  { value: 'card_on_delivery', label: 'Tarjeta al recibir' },
];

export const pendingDeliveryLocation = 'Pendiente de recibir por WhatsApp.';
export const deliveryLocationRequest =
  'Cuando realices el pago por WhatsApp, envía también tu ubicación para coordinar la entrega.';

export const getPaymentMethodLabel = (value) =>
  paymentMethods.find((method) => method.value === value)?.label ?? value;
