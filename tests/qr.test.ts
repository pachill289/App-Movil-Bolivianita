import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCertificateQR } from '../src/qr';
const id = '2c425c39-d7ad-4440-b06b-e51f4b1a12f8';
test('accepts current web certificate QR and normalizes UUID', () => {
    assert.equal(parseCertificateQR(`https://inventario.example/certificado/${id}`), id);
    assert.equal(parseCertificateQR(`http://localhost:5173/certificado/${id}/`), id);
    assert.equal(parseCertificateQR(` ${id.toUpperCase()} `), id);
});
test('rejects arbitrary paths, executable URLs, SQL fragments and oversized input', () => {
    for (const value of ['javascript:alert(1)', `https://example.com/producto/${id}`, `https://example.com/certificado/${id}?stock=0`, `https://user:pass@example.com/certificado/${id}`, `${id}' OR 1=1 --`, 'x'.repeat(3000), '', `https://example.com/certificado/${id}/otro`])
        assert.throws(() => parseCertificateQR(value));
});
