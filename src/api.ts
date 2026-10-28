import { selectedBranch } from './branches';
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
        const headers = new Headers(init?.headers);
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if(url.startsWith(extra!.supabaseUrl+'/rest/v1/') || url.startsWith(extra!.supabaseUrl+'/storage/v1/')) headers.set('x-jewelry-branch',selectedBranch());
        return await fetch(input, { ...init, headers, signal: controller.signal });
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
    image_path?: string | null;
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
    guidePercent?: number;
    saleAmount?: number;
};
export type Receipt = {
    request_id: string;
    jewelry_id: string;
    stock_after: number;
    unit_price: number;
    gross_unit_price?: number | null;
    card_fee_amount?: number;
    guide_commission_percent?: number;
    guide_commission_amount?: number;
    created_at: string;
    description: string;
    quantity: number;
    payment_method: PaymentMethod | null;
    currency: string;
    total_amount: number;
};
export type InventoryPage = { rows: Product[]; count: number; products: number; units: number; empty: number; prices: number[] };
export async function inventory(page=0,search='',price:number|null=null): Promise<InventoryPage> {
 const {data,error}=await supabase.rpc('jewelry_mobile_inventory_filtered',{p_price:price,p_search:search,p_stock:'all',p_offset:page*15,p_limit:15});
 if(error)throw error;return data;
}
export async function lookup(target: ScanTarget): Promise<Candidate> {
    return lookupTarget(supabase, target);
}
export async function sell(sale: PendingSale): Promise<Receipt> {
    if (!isPaymentMethod(sale.paymentMethod)) throw new Error('Selecciona un tipo de pago válido.');
    const { data, error } = await supabase.rpc(sale.saleAmount !== undefined ? 'register_certificate_sale_adjusted' : sale.guidePercent === undefined ? 'register_certificate_sale' : 'register_certificate_sale_guided', {
        ...(sale.saleAmount === undefined ? {} : {p_sale_amount:sale.saleAmount}),
        ...(sale.guidePercent === undefined ? {} : {p_guide_percent:sale.guidePercent}),
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
