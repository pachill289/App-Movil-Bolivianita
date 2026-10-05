import { lookupTarget } from './lookup';
import type { ScanTarget } from './scan';
import Constants from 'expo-constants';
import { createClient, processLock } from '@supabase/supabase-js';
import { secureStorage } from './secureStorage';
import { isPaymentMethod, type PaymentMethod } from './payments';
const extra = Constants.expoConfig?.extra;
const timedFetch: typeof fetch = async (input, init) => {
    const controller = new AbortController();
    const abort = () => controller.abort();
    init?.signal?.addEventListener('abort', abort);
    if (init?.signal?.aborted)
        controller.abort();
    const timer = setTimeout(abort, 25000);
    try {
        return await fetch(input, { ...init, signal: controller.signal });
    }
    finally {
        clearTimeout(timer);
        init?.signal?.removeEventListener('abort', abort);
    }
};
export const supabase = createClient(extra!.supabaseUrl, extra!.supabaseAnonKey, {
    global: { fetch: timedFetch },
    auth: { storage: secureStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, lock: processLock },
});
export type Product = {
    id: string;
    description: string;
    price: number | null;
    stock: number;
    has_certificate?: boolean;
};
export type Candidate = Product & {
    price: number;
    barcode: string;
    image: string;
    version: number;
    qrValue?: string;
};
export type PendingSale = {
    requestId: string;
    product: Candidate;
    // Optional only for pending operations saved by the previous app version.
    paymentMethod?: PaymentMethod;
};
export type Receipt = {
    request_id: string;
    jewelry_id: string;
    stock_after: number;
    unit_price: number;
    gross_unit_price?: number | null;
    card_fee_amount?: number;
    created_at: string;
    description: string;
    quantity: number;
    payment_method: PaymentMethod | null;
    currency: string;
    total_amount: number;
};
export async function inventory(): Promise<Product[]> {
    const rows: Product[] = [];
    for (let offset = 0;; offset += 500) {
        const { data, error } = await supabase.rpc('list_jewelry_inventory', { p_offset: offset, p_limit: 500 });
        if (error)
            throw error;
        rows.push(...data);
        if (data.length < 500)
            return rows;
    }
}
export async function lookup(target: ScanTarget): Promise<Candidate> {
    return lookupTarget(supabase, target);
}
export async function sell(sale: PendingSale): Promise<Receipt> {
    if (!isPaymentMethod(sale.paymentMethod)) throw new Error('Selecciona un tipo de pago válido.');
    const { data, error } = await supabase.rpc('register_certificate_sale', {
        p_request_id: sale.requestId, p_jewelry_id: sale.product.id,
        p_expected_price: sale.product.price, p_certificate_version: sale.product.version,
        p_payment_method: sale.paymentMethod,
    }).single<Receipt>();
    if (error)
        throw error;
    if (!data)
        throw new Error('No se recibió el comprobante. Reintenta la misma operación.');
    return data;
}
export const money = (value: number) => new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(Number(value));
