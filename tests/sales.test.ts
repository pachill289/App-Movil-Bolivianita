import { URL } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const seller = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', other = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', product = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const request = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', second = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
test('sale RPC: authorization, idempotency, stock, stale price and rollback', async () => {
    const db = new PGlite();
    try {
        await db.exec(`create role anon; create role authenticated; create schema auth;
   create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create table public.jewelry_products(id uuid primary key,description text,price numeric,stock integer check(stock>=0),updated_at timestamptz);
   create table public.jewelry_certificates(jewelry_id uuid primary key references public.jewelry_products(id),barcode_value text,version integer);
   insert into auth.users values('${seller}'),('${other}');
   insert into public.jewelry_products values('${product}','Anillo de prueba',250,2,now());
   insert into public.jewelry_certificates values('${product}','10000000000000',1);`);
        await db.exec(await readFile(new URL('../supabase/migrations/202609170001_mobile_sales.sql', import.meta.url), 'utf8'));
        const sale = (key = request, price = 250, version = 1) => db.query('select * from public.register_certificate_sale($1::uuid,$2::uuid,$3::numeric,$4::integer)', [key, product, price, version]);
        await db.exec(`set request.jwt.claim.sub='${seller}'; set role authenticated;`);
        await assert.rejects(sale(), /permiso/);
        await db.exec(`reset role; insert into public.mobile_sales_staff values('${seller}',now()); set role authenticated;`);
        await assert.rejects(sale(request, 200), /cambió/);
        await assert.rejects(sale(request, 250, 2), /cambió/);
        const first = await sale();
        assert.equal((first.rows[0] as {
            stock_after: number;
        }).stock_after, 1);
        const retry = await sale();
        assert.deepEqual(retry.rows, first.rows);
        await db.exec(`reset role; set request.jwt.claim.sub='${other}'; insert into public.mobile_sales_staff values('${other}',now()); set role authenticated;`);
        await assert.rejects(sale(), /otra venta/);
        assert.equal((await db.query('select * from public.jewelry_mobile_sales')).rows.length, 0);
        await assert.rejects(db.exec('delete from public.jewelry_mobile_sales'), /permission denied/);
        await db.exec(`reset role; set request.jwt.claim.sub='${seller}'; set role authenticated;`);
        await sale(second);
        await assert.rejects(sale('ffffffff-ffff-4fff-8fff-ffffffffffff'), /agotado/);
        await db.exec('reset role');
        assert.equal((await db.query<{
            stock: number;
        }>('select stock from public.jewelry_products')).rows[0].stock, 0);
        assert.equal((await db.query('select * from public.jewelry_mobile_sales')).rows.length, 2);
        // If the ledger insert fails, the stock update must roll back with it.
        await db.exec(`update public.jewelry_products set stock=1; create function reject_test_sale() returns trigger language plpgsql as $$begin raise exception 'test ledger failure'; end$$; create trigger reject_test_sale before insert on public.jewelry_mobile_sales for each row execute function reject_test_sale(); set role authenticated;`);
        await assert.rejects(sale('ffffffff-ffff-4fff-8fff-ffffffffffff'), /test ledger failure/);
        await db.exec('reset role');
        assert.equal((await db.query<{
            stock: number;
        }>('select stock from public.jewelry_products')).rows[0].stock, 1);
        await db.exec('set role anon');
        await assert.rejects(sale(), /permission denied/);
    }
    finally {
        await db.close();
    }
});
