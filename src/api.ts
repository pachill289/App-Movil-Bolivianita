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
    price: number;
    stock: number;
};
export type Candidate = Product & {
    barcode: string;
    image: string;
    version: number;
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
        const { data, error } = await supabase.from('jewelry_products').select('id,description,price,stock').order('id').range(offset, offset + 499);
        if (error)
            throw error;
        rows.push(...data);
        if (data.length < 500)
            return rows;
    }
}
export async function lookup(id: string): Promise<Candidate> {
    const { data: certificate, error } = await supabase.from('jewelry_certificates').select('jewelry_id,barcode_value,image_path,version').eq('jewelry_id', id).single();
    if (error || !certificate)
        throw new Error('No se encontró un certificado accesible para esta joya.');
    const { data: product, error: productError } = await supabase.from('jewelry_products').select('id,description,price,stock').eq('id', id).single();
    if (productError || !product)
        throw new Error('No se pudo consultar el producto. Revisa tu conexión y tus permisos.');
    return { ...product, barcode: certificate.barcode_value, version: certificate.version, image: supabase.storage.from('certificate-images').getPublicUrl(certificate.image_path).data.publicUrl };
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
