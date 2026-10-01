import type { SupabaseClient } from '@supabase/supabase-js';

export type AuthValues = { role?: 'collaborator' | 'seller'; username: string; password: string; confirm: string; first_name: string; last_name: string; phone: string };
export type AuthErrors = Partial<Record<keyof AuthValues, string>>;
export const emptyAuthValues: AuthValues = { role: 'collaborator', username: '', password: '', confirm: '', first_name: '', last_name: '', phone: '' };
export const normalizePhone = (value: string) => value.replace(/[\s()-]/g, '').replace(/^\+591/, '');
// Count UTF-8 bytes without depending on TextEncoder in native runtimes.
export const utf8Length = (value: string) => Array.from(value).reduce((length, char) => {
    const code = char.codePointAt(0)!;
    return length + (code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4);
}, 0);

export function validateAuth(values: AuthValues, register: boolean): AuthErrors {
    const errors: AuthErrors = {};
    if (!/^[a-z0-9][a-z0-9_.-]{2,39}$/.test(values.username.trim().toLowerCase()))
        errors.username = 'Usa de 3 a 40 caracteres: letras sin tildes, números, punto, guion o guion bajo.';
    if (!values.password || utf8Length(values.password) > 72)
        errors.password = 'Ingresa tu contraseña (máximo 72 bytes UTF-8).';
    if (!register) return errors;
    for (const key of ['first_name', 'last_name'] as const) {
        const name = values[key].trim();
        if (name.length < 2 || name.length > 60 || !/^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u.test(name))
            errors[key] = 'Escribe entre 2 y 60 caracteres: letras, espacios, apóstrofos o guiones.';
    }
    if (!/^[23467]\d{7}$/.test(normalizePhone(values.phone)))
        errors.phone = 'Ingresa 8 dígitos: celular con 6 o 7, o fijo con 2, 3 o 4. Puedes incluir +591.';
    if (values.password.length < 12 || utf8Length(values.password) > 72 || !/[a-z]/.test(values.password) || !/[A-Z]/.test(values.password) || !/\d/.test(values.password) || !/[^A-Za-z0-9\s]/.test(values.password) || /\s/.test(values.password))
        errors.password = 'Usa al menos 12 caracteres y máximo 72 bytes UTF-8, con mayúscula, minúscula, número y símbolo, sin espacios.';
    if (!values.confirm || values.confirm !== values.password)
        errors.confirm = 'La confirmación debe coincidir con la contraseña.';
    return errors;
}

export async function authenticate(client: Pick<SupabaseClient, 'functions' | 'auth'>, values: AuthValues, register: boolean) {
    const errors = validateAuth(values, register);
    if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
    const { data, error } = await client.functions.invoke('username-auth', {
        body: {
            action: register ? 'register' : 'login', username: values.username.trim().toLowerCase(), password: values.password,
            ...(register ? { first_name: values.first_name.trim(), last_name: values.last_name.trim(), phone: `+591${normalizePhone(values.phone)}` } : {}),
        },
    });
    if (error) {
        let detail;
        try { detail = await error.context?.json?.(); } catch { /* Network/gateway error without JSON. */ }
        throw new Error(typeof detail?.error === 'string' ? detail.error : 'No se pudo conectar con el servicio de acceso. Revisa tu conexión y reintenta.');
    }
    if (data?.error) throw new Error(data.error);
    if (typeof data?.session?.access_token !== 'string' || typeof data?.session?.refresh_token !== 'string')
        throw new Error('No se pudo iniciar sesión. Inténtalo nuevamente.');
    const result = await client.auth.setSession(data.session);
    if (result.error) throw new Error('No se pudo guardar la sesión. Intenta ingresar nuevamente con tu usuario y contraseña.');
    return result.data;
}
