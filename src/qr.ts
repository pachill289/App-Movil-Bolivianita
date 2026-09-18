export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parseCertificateQR(raw: string): string {
    const text = raw.trim();
    if (text.length > 2048)
        throw new Error('El QR es demasiado largo.');
    if (UUID.test(text))
        return text.toLowerCase();
    try {
        const url = new URL(text);
        if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash)
            throw 0;
        const match = url.pathname.match(/^\/certificado\/([0-9a-f-]{36})\/?$/i);
        if (match && UUID.test(match[1]))
            return match[1].toLowerCase();
    }
    catch { }
    throw new Error('Escanea el QR de un certificado de Bolivianita válido.');
}
