import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authenticate, validateAuth, utf8Length, type AuthValues } from '../src/auth';

const valid: AuthValues = { username: '  Raul.Perez  ', first_name: 'Raúl', last_name: 'Pérez', phone: '+591 (7) 123-4567', password: 'SeguraClave1!', confirm: 'SeguraClave1!' };
const tokens = { access_token: 'access', refresh_token: 'refresh' };
function fixture(response: any = { data: { session: tokens }, error: null }, sessionError: any = null) {
    const calls: any[] = [];
    const client = {
        functions: { invoke: async (...args: any[]) => { calls.push(args); return response; } },
        auth: { setSession: async (session: any) => { calls.push(['session', session]); return { data: { session }, error: sessionError }; } },
    } as unknown as Parameters<typeof authenticate>[0];
    return { client, calls };
}

test('registration sends normalized profile data to the shared function and installs session tokens', async () => {
    const { client, calls } = fixture();
    await authenticate(client, { ...valid, role: 'admin', email: 'ignored@example.com' } as AuthValues, true);
    assert.deepEqual(calls, [
        ['username-auth', { body: { action: 'register', username: 'raul.perez', password: valid.password, first_name: 'Raúl', last_name: 'Pérez', phone: '+59171234567' } }],
        ['session', tokens],
    ]);
});

test('login omits registration metadata and permits existing passwords below the new signup minimum', async () => {
    const { client, calls } = fixture();
    await authenticate(client, { ...valid, password: 'legacy' }, false);
    assert.deepEqual(calls[0], ['username-auth', { body: { action: 'login', username: 'raul.perez', password: 'legacy' } }]);
});

test('invalid registration never calls Supabase; UTF-8 and phone rules match the web', async () => {
    const { client, calls } = fixture();
    for (const bad of [{ phone: '2236421' }, { phone: '51234567' }, { username: 'bad@email' }, { first_name: '123' }, { password: 'Short1!' }, { password: 'Aa1!' + 'é'.repeat(35) }, { confirm: 'different' }]) {
        await assert.rejects(authenticate(client, { ...valid, ...bad }, true));
    }
    assert.equal(calls.length, 0);
    for (const phone of ['71234567', '61234567', '22123456', '33456789', '44567890'])
        assert.deepEqual(validateAuth({ ...valid, phone }, true), {});
    for (const text of ['abc', 'á', '💎', '\ud800']) assert.equal(utf8Length(text), new TextEncoder().encode(text).length);
});

test('service messages survive HTTP failures; network and malformed responses do not create sessions', async () => {
    const limited = fixture({ error: { context: { json: async () => ({ error: 'Demasiados intentos. Espera unos minutos.' }) } } });
    await assert.rejects(authenticate(limited.client, valid, false), /Demasiados intentos/);
    assert.equal(limited.calls.length, 1);
    for (const result of [{ error: {} }, { error: { context: { json: async () => { throw new Error(); } } } }, { data: {} }, { data: { session: { access_token: 'incomplete' } } }]) {
        const broken = fixture(result);
        await assert.rejects(authenticate(broken.client, valid, false));
        assert.equal(broken.calls.length, 1);
    }
    const storageFailure = fixture(undefined, new Error('storage'));
    await assert.rejects(authenticate(storageFailure.client, valid, false), /guardar la sesión/);
});
