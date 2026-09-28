import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transactionLabels } from '../src/transactionLabels';
test('QR action and confirmation use the persisted role', () => {
    const admin = transactionLabels('admin'), client = transactionLabels('collaborator');
    assert.equal(admin.action, 'Vender joya');
    assert.equal(client.action, 'Comprar joya');
    assert.match(admin.success, /^Venta/);
    assert.match(client.success, /^Compra/);
});
