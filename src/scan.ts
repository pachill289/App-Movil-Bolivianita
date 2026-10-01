import { parseCertificateQR } from './qr';

export type ScanTarget = { kind: 'qr'; id: string; qrValue: string } | { kind: 'barcode'; barcode: string };
// Certificates use CODE128C with exactly 14 digits. Keep leading zeros.
export function parseScan(raw: string, type?: string): ScanTarget {
    const value = raw.trim();
    if (type === 'barcode' || type === 'code128' || (!type && /^\d{14}$/.test(value))) {
        if (!/^\d{14}$/.test(value)) throw new Error('El código de barras debe contener los 14 dígitos del certificado.');
        return { kind: 'barcode', barcode: value };
    }
    if (type && type !== 'qr') throw new Error('Tipo de código no compatible. Usa QR o CODE128.');
    return { kind: 'qr', id: parseCertificateQR(value), qrValue: value };
}
