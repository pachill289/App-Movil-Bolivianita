import { test } from 'node:test';
import assert from 'node:assert/strict';
import { certificateHtml, type CertificateRecord } from '../src/certificateHtml';
const record: CertificateRecord = { jewelry_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', description: '</script><script>alert(1)</script>', gemstone: 'Bolivianita', metal: 'Oro', cut: 'Oval', image_path: 'photo.webp', barcode_value: '00123456789012' };
test('certificate content cannot escape the script into executable HTML', () => {
    const html = certificateHtml(record, 'https://example.test/photo.webp');
    assert.ok(!html.includes(record.description));
    assert.ok(html.includes('\\u003c/script>'));
    assert.ok(html.includes('.textContent=payload.record[field]'));
    assert.ok(html.includes("connect-src 'none'"));
});
test('both original templates are available; QR must match the current certificate', () => {
    const first = certificateHtml(record, 'https://example.test/photo.webp');
    const second = certificateHtml({ ...record, template: 'certificado-oficial-2' }, 'https://example.test/photo.webp');
    assert.notEqual(first, second);
    assert.equal(first, certificateHtml({ ...record, template: 'unknown' }, 'https://example.test/photo.webp'));
    assert.throws(() => certificateHtml(record, 'https://example.test/photo.webp', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'));
});
