import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loginQR, readQR, logoutQR, QRAccessError } from '../src/qrAccess';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const grant={ certificate_id:id, token:'a'.repeat(64), expires_at:'2099-01-01T00:00:00Z' };
test('QR login uses certificate-only service without creating an Auth session', async () => {
 const calls: any[]=[];
 const client:any={functions:{invoke:async (...args:any[])=>{calls.push(args);return {data:grant};}},auth:{setSession:()=>{throw Error('must not create inventory session');}}};
 assert.deepEqual(await loginQR(client,id,' Visor.QR ','secret'),grant);
 assert.deepEqual(calls[0],['qr-access',{body:{action:'login',certificate_id:id,username:'visor.qr',password:'secret'}}]);
 await logoutQR(client,grant);
 assert.deepEqual(calls[1][1].body,{action:'logout',certificate_id:id,token:grant.token});
});
test('QR rejects expired grants locally and revoked grants from server', async () => {
 let calls=0;
 const client:any={functions:{invoke:async()=>{calls++;return {error:{context:{status:401,json:async()=>({error:'Acceso revocado'})}}};}}};
 await assert.rejects(readQR(client,{...grant,expires_at:'2000-01-01'}),QRAccessError);
 assert.equal(calls,0);
 await assert.rejects(readQR(client,grant),(err:any)=>err.status===401 && err.message==='Acceso revocado');
});
test('QR cannot accept login or certificate data for a different jewel', async () => {
 const wrong='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 const client:any={functions:{invoke:async()=>({data:{...grant,certificate_id:wrong}})}};
 await assert.rejects(loginQR(client,id,'visor.qr','secret'),/permiso/);
 client.functions.invoke=async()=>({data:{certificate:{jewelry_id:wrong},image_url:'https://example.test/photo'}});
 await assert.rejects(readQR(client,grant),/no corresponde/);
 client.functions.invoke=async()=>({data:{certificate:{jewelry_id:id},image_url:'https://example.test/photo'}});
 assert.equal((await readQR(client,grant)).certificate.jewelry_id,id);
});
