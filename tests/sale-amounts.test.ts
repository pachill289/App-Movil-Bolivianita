import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saleAmounts } from '../src/saleAmounts';
test('credit card preview deducts 1.5 percent only for staff with cent rounding', () => {
 for (const role of ['seller','admin']) {
  assert.deepEqual(saleAmounts(100,'tarjeta_credito',role),{gross:100,net:98.5,fee:1.5,applies:true});
  assert.equal(saleAmounts(199.99,'tarjeta_credito',role)?.net,196.99);
  assert.equal(saleAmounts(1,'tarjeta_credito',role)?.net,.99);
  assert.equal(saleAmounts(.01,'tarjeta_credito',role)?.net,.01);
 }
 for (const method of ['efectivo','qr','transferencia_bancaria']) assert.equal(saleAmounts(100,method,'seller')?.net,100);
 assert.equal(saleAmounts(100,'tarjeta_credito','collaborator')?.net,100);
 assert.equal(saleAmounts(NaN,'tarjeta_credito','seller'),null);
});
