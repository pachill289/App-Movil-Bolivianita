import type { SupabaseClient } from '@supabase/supabase-js';
import type { Candidate } from './api';
import type { ScanTarget } from './scan';

export async function lookupTarget(client: Pick<SupabaseClient, 'from' | 'storage'>, target: ScanTarget): Promise<Candidate> {
    const { data: certificate, error } = await client.from('jewelry_certificates')
        .select('jewelry_id,barcode_value,image_path,version')
        .eq(target.kind === 'qr' ? 'jewelry_id' : 'barcode_value', target.kind === 'qr' ? target.id : target.barcode).single();
    if (error || !certificate) throw new Error('No se encontró el certificado. Revisa el código y tu conexión.');
    const { data: product, error: productError } = await client.from('jewelry_products')
        .select('id,description,price,stock').eq('id', certificate.jewelry_id).single();
    if (productError || !product || product.price === null) throw new Error('No se pudo consultar el producto y su precio. Revisa tu conexión y permisos.');
    const image = await client.storage.from('certificate-images').createSignedUrl(certificate.image_path, 900);
    if (image.error || !image.data) throw new Error('No se pudo cargar la fotografía del certificado.');
    return { ...product, barcode: certificate.barcode_value, version: certificate.version,
        image: image.data.signedUrl,
        ...(target.kind === 'qr' ? { qrValue: target.qrValue } : {}),
    };
}
