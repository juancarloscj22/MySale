export const buildOrderMessage = (order) => {
  const lines = [
    'Hola, quiero confirmar mi pedido.',
    `Pedido: ${order.id}`,
    `Total: $${order.total.toFixed(2)}`,
    'Productos:',
    ...order.items.map(
      (item) => `- ${item.name} x${item.quantity} ($${(item.price * item.quantity).toFixed(2)})`,
    ),
  ];

  return lines.join('\n');
};

export const buildWhatsAppUrl = (phone, message) => {
  const cleanPhone = String(phone).replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message);

  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
};
