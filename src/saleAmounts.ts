// Integer cents keep the preview aligned with PostgreSQL round(gross * .985, 2).
export function saleAmounts(amount: number, method: string | null, role: string) {
  const cents = Math.round(Number(amount) * 100);
  if (!Number.isSafeInteger(cents) || cents < 0 || cents > 999999999999) return null;
  const applies = method === 'tarjeta_credito' && ['admin', 'seller'].includes(role);
  const net = applies ? Math.floor((cents * 985 + 500) / 1000) : cents;
  return { gross: cents / 100, net: net / 100, fee: (cents - net) / 100, applies };
}
