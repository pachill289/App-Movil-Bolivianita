import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
const seller='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const product='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const request=(index:number)=>`dddddddd-dddd-4ddd-8ddd-${String(index).padStart(12,'0')}`;
const migration=()=>readFile(new URL('../supabase/migrations/202609180001_payment_sales.sql',import.meta.url),'utf8');
async function fixture(){
 const db=new PGlite();
 await db.exec(`create role anon; create role authenticated; create schema auth;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table public.jewelry_products(id uuid primary key,description text,price numeric,stock integer check(stock>=0),updated_at timestamptz);
 create table public.jewelry_certificates(jewelry_id uuid primary key references public.jewelry_products(id),barcode_value text,version integer);
 insert into auth.users values('${seller}'),('${other}');
 insert into public.jewelry_products values('${product}','Anillo de bolivianita',250,10,now());
 insert into public.jewelry_certificates values('${product}','10000000000000',1);`);
 return db;
}
function buy(db:PGlite,index:number,payment:string|null,price=250){
 return db.query<{request_id:string;payment_method:string|null;quantity:number;unit_price:string;total_amount:string;description:string;currency:string;created_at:Date;stock_after:number}>(
 'select * from public.register_certificate_sale($1::uuid,$2::uuid,$3::numeric,$4::integer,$5::text)',[request(index),product,price,1,payment]);
}
async function totals(db:PGlite){
 await db.exec('reset role');
 const result=(await db.query<{stock:number; sales:number}>('select stock,(select count(*)::int from public.jewelry_mobile_sales) as sales from public.jewelry_products')).rows[0];
 await db.exec('set role authenticated');return result;
}
test('fresh installation: four payment methods, mandatory selection, snapshots and retry safety',async()=>{
 const db=await fixture();try{
  await db.exec(await migration());await db.exec(await migration());
  await db.exec(`insert into public.mobile_sales_staff(user_id) values('${seller}'),('${other}'); set request.jwt.claim.sub='${seller}'; set role authenticated;`);
  for(const invalid of [null,'','bitcoin',"efectivo');drop table public.jewelry_products;--"]){await assert.rejects(buy(db,99,invalid),/tipo de pago/);}
  assert.deepEqual(await totals(db),{stock:10,sales:0});
  const methods=['efectivo','qr','tarjeta_credito','transferencia_bancaria'];
  for(const [i,method] of methods.entries()){
   const result=await buy(db,i,method);const row=result.rows[0];
   assert.equal(row.payment_method,method);assert.equal(row.quantity,1);
   assert.equal(Number(row.unit_price),250);assert.equal(Number(row.total_amount),250);
   assert.equal(row.description,'Anillo de bolivianita');assert.equal(row.currency,'BOB');
   assert.ok(Number.isFinite(new Date(row.created_at).getTime()));
   assert.equal(row.stock_after,9-i);
   assert.deepEqual((await buy(db,i,method)).rows,result.rows);
  }
  assert.deepEqual(await totals(db),{stock:6,sales:4});
  await assert.rejects(buy(db,0,'qr'),/tipo de pago distinto/);
  await assert.rejects(db.query('select * from public.register_certificate_sale($1::uuid,$2::uuid,250,1)',[request(99),product]),/Actualiza/);
  await db.exec(`reset role; update public.jewelry_products set description='Nombre editado',price=999; set role authenticated;`);
  const replay=(await buy(db,0,'efectivo')).rows[0];
  assert.equal(replay.description,'Anillo de bolivianita');assert.equal(Number(replay.unit_price),250);
  await assert.rejects(buy(db,99,'efectivo'),/cambió/);
  const exported=await db.query('select * from public.jewelry_sales_export');
  assert.equal(exported.rows.length,4);
  await db.exec(`set request.jwt.claim.sub='${other}'`);
  await assert.rejects(buy(db,0,'efectivo'),/otra compra/);
  assert.equal((await db.query('select * from public.jewelry_sales_export')).rows.length,0);
  await assert.rejects(db.exec('delete from public.jewelry_mobile_sales'),/permission denied/);
  await db.exec("set request.jwt.claim.sub=''");await assert.rejects(buy(db,99,'qr'),/permiso/);
  await db.exec('reset role; set role anon');await assert.rejects(buy(db,99,'qr'),/permission denied/);
 }finally{await db.close();}
});
test('upgrade preserves historical receipts and pending operation UUIDs',async()=>{
 const db=await fixture();try{
  await db.exec(await readFile(new URL('../supabase/migrations/202609170001_mobile_sales.sql',import.meta.url),'utf8'));
  await db.exec(`insert into public.mobile_sales_staff(user_id) values('${seller}');set request.jwt.claim.sub='${seller}';set role authenticated;`);
  await db.query('select * from public.register_certificate_sale($1::uuid,$2::uuid,250,1)',[request(0),product]);
  await db.exec('reset role');await db.exec(await migration());await db.exec('set role authenticated');
  const oldReceipt=(await buy(db,0,'transferencia_bancaria')).rows[0];
  assert.equal(oldReceipt.payment_method,null);assert.equal(Number(oldReceipt.total_amount),250);
  assert.deepEqual(await totals(db),{stock:9,sales:1});
  const next=(await buy(db,1,'tarjeta_credito')).rows[0];assert.equal(next.payment_method,'tarjeta_credito');
  assert.deepEqual(await totals(db),{stock:8,sales:2});
 }finally{await db.close();}
});
test('payment purchase rejects sold-out stock and rolls back if ledger insert fails',async()=>{
 const db=await fixture();try{
  await db.exec(await migration());
  await db.exec(`insert into public.mobile_sales_staff(user_id) values('${seller}');update public.jewelry_products set stock=1;set request.jwt.claim.sub='${seller}';set role authenticated;`);
  await buy(db,0,'qr');await assert.rejects(buy(db,1,'efectivo'),/agotado/);
  assert.deepEqual(await totals(db),{stock:0,sales:1});
  await db.exec(`reset role;update public.jewelry_products set stock=1;create function reject_test_sale() returns trigger language plpgsql as $$begin raise exception 'test ledger failure';end$$;create trigger reject_test_sale before insert on public.jewelry_mobile_sales for each row execute function reject_test_sale();set role authenticated;`);
  await assert.rejects(buy(db,1,'efectivo'),/test ledger failure/);
  assert.deepEqual(await totals(db),{stock:1,sales:1});
 }finally{await db.close();}
});