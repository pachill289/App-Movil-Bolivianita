import type { SupabaseClient } from '@supabase/supabase-js';
import type { CertificateRecord } from './certificateHtml';
export type QRGrant = { token: string; certificate_id: string; expires_at: string };
export class QRAccessError extends Error {
    constructor(message: string, public status?: number) { super(message); }
}
type Client = Pick<SupabaseClient, 'functions'>;
async function invoke(client: Client, body: object) {
    const { data, error } = await client.functions.invoke('qr-access', { body });
    if (error) {
        let detail; try { detail = await error.context?.json?.(); } catch {}
        throw new QRAccessError(detail?.error || 'No se pudo conectar con el acceso QR. Reintenta.', error.context?.status);
    }
    if (data?.error) throw new QRAccessError(data.error);
    return data;
}
export async function loginQR(client: Client, id: string, username: string, password: string): Promise<QRGrant> {
    const data = await invoke(client, { action: 'login', certificate_id: id, username: username.trim().toLowerCase(), password });
    if (data?.certificate_id !== id || !/^[a-f0-9]{64}$/.test(data?.token || '') || !(Date.parse(data?.expires_at) > Date.now()))
        throw new QRAccessError('El permiso de acceso no es válido. Vuelve a ingresar.');
    return data;
}
export async function readQR(client: Client, grant: QRGrant): Promise<{ certificate: CertificateRecord; image_url: string }> {
    if (!(Date.parse(grant.expires_at) > Date.now())) throw new QRAccessError('El acceso expiró. Inicia sesión nuevamente.', 401);
    const data = await invoke(client, { action: 'read', certificate_id: grant.certificate_id, token: grant.token });
    if (data?.certificate?.jewelry_id !== grant.certificate_id || typeof data?.image_url !== 'string') throw new QRAccessError('El certificado recibido no corresponde al QR.');
    return data;
}
export async function logoutQR(client: Client, grant: QRGrant) {
    await invoke(client, { action: 'logout', certificate_id: grant.certificate_id, token: grant.token });
}
