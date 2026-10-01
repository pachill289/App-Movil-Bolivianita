import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './api';
import { Action, Brand, Notice, colors, s } from './ui';

export type Profile = { username: string; role: 'admin' | 'collaborator' | 'seller' };
export function ProfileGate({ session, children }: { session: Session; children: (profile: Profile) => React.ReactNode }) {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [error, setError] = useState(''), [attempt, setAttempt] = useState(0), [busy, setBusy] = useState(false);
    useEffect(() => {
        let mounted = true;
        setError('');
        void (async () => {
            try {
                const { data, error } = await supabase.from('jewelry_profiles').select('username,role').eq('id', session.user.id).single();
                if (error || !data || !data.username || !['admin', 'collaborator', 'seller'].includes(data.role)) throw new Error();
                if (mounted) setProfile(data as Profile);
            } catch {
                if (mounted) setError('No se pudo cargar tu perfil. Revisa tu conexión o contacta al administrador.');
            }
        })();
        return () => { mounted = false; };
    }, [session.user.id, attempt]);
    async function logout() {
        setBusy(true);
        try {
            const { error } = await supabase.auth.signOut({ scope: 'local' });
            if (error) throw error;
        } catch { setError('No se pudo cerrar sesión. Inténtalo nuevamente.'); }
        finally { setBusy(false); }
    }
    if (profile) return <>{children(profile)}</>;
    return <View style={s.content}><Brand />{error ? <>
        <Notice text={error} /><Action title="Reintentar" disabled={busy} onPress={() => setAttempt(value => value + 1)} />
        <Action title="Cerrar sesión" secondary busy={busy} onPress={logout} />
    </> : <ActivityIndicator color={colors.pink} />}</View>;
}
