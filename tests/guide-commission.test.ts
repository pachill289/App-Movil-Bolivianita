import {test} from 'node:test';
import assert from 'node:assert/strict';
import {guideAmounts,guidePercent} from '../src/guideCommission';
test('guide commission uses post-card cents and validates input',()=>{
 for(const role of ['admin','seller']){
  const result=guideAmounts(250,'tarjeta_credito',role,10)!;
  assert.equal(result.fee,3.75);assert.equal(result.commission,24.63);assert.equal(result.net,221.62);
  assert.equal(guideAmounts(250,'efectivo',role,10)?.net,225);
  assert.equal(guideAmounts(250,'qr',role,0)?.net,250);
  assert.equal(guideAmounts(250,'qr',role,100)?.net,0);
 }
 assert.equal(guidePercent('12,50'),12.5);
 for(const value of ['', '-1','101','1.001','Infinity'])assert.equal(guidePercent(value),null);
 assert.equal(guideAmounts(250,'qr','collaborator',10),null);
});
