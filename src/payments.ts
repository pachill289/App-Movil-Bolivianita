export const PAYMENT_METHODS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'qr', label: 'QR' },
  { value: 'tarjeta_credito', label: 'Tarjeta de crédito' },
  { value: 'transferencia_bancaria', label: 'Transferencia bancaria' },
] as const;
export type PaymentMethod = typeof PAYMENT_METHODS[number]['value'];
export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return PAYMENT_METHODS.some(method => method.value === value);
}
export function paymentLabel(value: unknown): string {
  return PAYMENT_METHODS.find(method => method.value === value)?.label ?? 'Sin registrar (venta anterior)';
}