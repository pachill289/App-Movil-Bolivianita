import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseScan } from '../src/scan';
import { lookupTarget } from '../src/lookup';
const id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
test('camera and keyboard reader preserve barcode leading zeros and trim Enter', () => {
    for (const type of ['code128', 'barcode', undefined])
        assert.deepEqual(parseScan('00123456789012\r\n', type), { kind: 'barcode', barcode: '00123456789012' });
    for (const value of ['123', '123456789012345', '000123456789ab', `${id}`])
        assert.throws(() => parseScan(value, 'code128'));
    assert.throws(() => parseScan('00123456789012', 'ean13'));
    assert.throws(() => parseScan('00123456789012', 'qr'));
});
test('QR opens certificate mode; manual UUID remains supported', () => {
    const url = `https://inventario.example/certificado/${id}`;
    assert.deepEqual(parseScan(url, 'qr'), { kind: 'qr', id, qrValue: url });
    assert.equal(parseScan(id).kind, 'qr');
    assert.throws(() => parseScan(`https://inventario.example/certificado/${id}?stock=99`));
});
test('barcode lookup resolves certificate code before querying its product', async () => {
    const calls: unknown[] = [];
    const client = {
        from: (table: string) => ({ select: () => ({ eq: (field: string, value: string) => ({ single: async () => {
            calls.push([table, field, value]);
            return { data: table === 'jewelry_certificates'
                ? { jewelry_id: id, barcode_value: '00123456789012', version: 3, image_path: 'photo.webp' }
                : { id, description: 'Anillo', price: 200, stock: 4 }, error: null };
        } }) }) }),
        storage: { from: () => ({ createSignedUrl: async () => ({ data: { signedUrl: 'https://example.test/photo.webp' } }) }) },
    } as unknown as Parameters<typeof lookupTarget>[0];
    const result = await lookupTarget(client, parseScan('00123456789012'));
    assert.deepEqual(calls, [['jewelry_certificates', 'barcode_value', '00123456789012'], ['jewelry_products', 'id', id]]);
    assert.equal(result.price, 200); assert.equal(result.stock, 4); assert.equal(result.version, 3);
    assert.equal(result.qrValue, undefined);
});
