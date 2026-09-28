// Opt-in integration check. Creates only a temporary account and removes it in finally.
// Provide SUPABASE_TEST_SERVICE_ROLE_KEY through the environment, never a source file.
import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { authenticate } from '../src/auth';

async function main() {
assert.ok(process.env.SUPABASE_TEST_SERVICE_ROLE_KEY, 'Missing cleanup credential');
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const client = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!, options);
const admin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_TEST_SERVICE_ROLE_KEY, options);
const password = `${randomUUID()}Aa1!`;
const values = { username: `qa_${randomUUID().replaceAll('-', '')}`, password, confirm: password, first_name: 'Raúl', last_name: 'Pérez', phone: '+591 71234567' };
let userId: string | undefined;
try {
    const result = await authenticate(client, values, true);
    userId = result.user?.id;
    assert.ok(userId);
    const profile = await client.from('jewelry_profiles').select('username,role').eq('id', userId).single();
    assert.ifError(profile.error);
    assert.equal(profile.data.role, 'collaborator');
    assert.equal(profile.data.username, values.username);
    console.log('PASS: mobile registration creates collaborator with active session');
    const inventory = await client.rpc('list_jewelry_inventory', { p_offset: 0, p_limit: 500 });
    assert.ifError(inventory.error);
    assert.ok(Array.isArray(inventory.data));
    assert.ok(inventory.data.every((row: { price: number | null }) => row.price !== null && Number.isFinite(Number(row.price))));
    console.log('PASS: collaborator can consult inventory with prices');
    const certified = inventory.data.find((row: { has_certificate: boolean }) => row.has_certificate);
    if (certified) {
        const certificate = await client.rpc('get_jewelry_certificate', { p_jewelry_id: certified.id }).single<Record<string, unknown>>();
        assert.ifError(certificate.error);
        assert.ok(certificate.data);
        assert.equal(certificate.data.jewelry_id, certified.id);
        for (const field of ['description', 'gemstone', 'metal', 'cut', 'barcode_value', 'image_path']) assert.ok(certificate.data[field]);
        assert.equal(certificate.data.price, undefined);
        console.log('PASS: collaborator can read a published certificate, including photo and attributes, without prices');
    } else console.log('SKIP: no published certificates in the first inventory page');
    await client.auth.signOut();
    const login = await authenticate(client, { ...values, username: ` ${values.username.toUpperCase()} ` }, false);
    assert.equal(login.user?.id, userId);
    const refreshed = await client.auth.refreshSession();
    assert.ifError(refreshed.error);
    assert.ok(refreshed.data.session);
    await client.auth.signOut();
    console.log('PASS: mobile username login, token refresh and logout');
} finally {
    if (!userId) {
        const profile = await admin.from('jewelry_profiles').select('id').eq('username', values.username).maybeSingle();
        assert.ifError(profile.error);
        userId = profile.data?.id;
    }
    if (userId) {
        const deleted = await admin.auth.admin.deleteUser(userId);
        assert.ifError(deleted.error);
        console.log('PASS: temporary account removed');
    }
}
}
void main().catch(error => { console.error(error instanceof Error ? error.message : 'Integration check failed'); process.exitCode = 1; });
