export const paymentMethods = [
  { value: 'cash', label: 'Efectivo al recibir' },
  { value: 'bank_transfer', label: 'Transferencia bancaria' },
  { value: 'card_on_delivery', label: 'Tarjeta al recibir' },
];

export const getPaymentMethodLabel = (value) =>
  paymentMethods.find((method) => method.value === value)?.label ?? value;
