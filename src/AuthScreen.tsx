import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, type TextInputProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from './api';
import { authenticate, emptyAuthValues, validateAuth, type AuthValues } from './auth';
import { Action, Brand, Notice, colors, s } from './ui';

export function AuthScreen({ onScanQR }: { onScanQR: () => void }) {
    const [register, setRegister] = useState(false);
    const [values, setValues] = useState({ ...emptyAuthValues });
    const [touched, setTouched] = useState<Partial<Record<keyof AuthValues, boolean>>>({});
    const [show, setShow] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const guard = useRef(false);
    const errors = validateAuth(values, register);
    async function submit() {
        if (guard.current) return;
        setError('');
        setTouched(Object.fromEntries(Object.keys(values).map(key => [key, true])));
        if (Object.keys(errors).length) return;
        guard.current = true;
        setBusy(true);
        try {
            await authenticate(supabase, values, register);
            setValues({ ...emptyAuthValues });
            setShow(false);
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'No se pudo ingresar. Revisa tu conexión.');
        } finally {
            guard.current = false;
            setBusy(false);
        }
    }
    const field = (name: keyof AuthValues, label: string, props: TextInputProps = {}, hint?: string) => <View key={name}>
        <Text style={s.label}>{label}</Text>
        <TextInput accessibilityLabel={label} style={s.input} value={values[name]} editable={!busy}
            autoCorrect={false} onChangeText={value => setValues(current => ({ ...current, [name]: value }))}
            onBlur={() => setTouched(current => ({ ...current, [name]: true }))} {...props} />
        {hint ? <Text style={[s.text, { fontSize: 11 }]}>{hint}</Text> : null}
        {touched[name] && errors[name] ? <Notice text={errors[name]!} /> : null}
    </View>;
    return <LinearGradient colors={['#f6dce9', '#f7f2f5', '#eee7eb']} style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
                <View style={[s.card, { width: '100%', maxWidth: 450, alignSelf: 'center' }]}>
                    <Brand /><Text style={s.eyebrow}>INVENTARIO MÓVIL</Text>
                    <Text style={s.title}>{register ? 'Crear usuario' : 'Iniciar sesión'}</Text>
                    <Text style={s.text}>{register ? 'Crea tu cuenta para consultar el inventario.' : 'Ingresa con el mismo usuario y contraseña del sistema web.'}</Text>
                    {register ? <>
                        <View><Text style={s.label}>Tipo de usuario</Text><Text style={s.text}>Colaborador / Cliente</Text></View>
                        {field('first_name', 'Nombre', { autoCapitalize: 'words', autoComplete: 'given-name', textContentType: 'givenName' })}
                        {field('last_name', 'Apellido', { autoCapitalize: 'words', autoComplete: 'family-name', textContentType: 'familyName' })}
                        {field('phone', 'Teléfono de Bolivia', { keyboardType: 'phone-pad', autoComplete: 'tel', textContentType: 'telephoneNumber' }, 'Ejemplo: +591 71234567')}
                    </> : null}
                    {field('username', 'Nombre de usuario', { autoCapitalize: 'none', autoComplete: 'username', textContentType: 'username', placeholder: 'nombre.apellido' }, register ? 'De 3 a 40 caracteres: letras sin tildes, números, punto, guion o guion bajo.' : undefined)}
                    {field('password', 'Contraseña', { secureTextEntry: !show, autoCapitalize: 'none', autoComplete: register ? 'new-password' : 'current-password', textContentType: register ? 'newPassword' : 'password', onSubmitEditing: register ? undefined : submit }, register ? 'Mínimo 12 caracteres: mayúscula, minúscula, número y símbolo.' : undefined)}
                    {register ? field('confirm', 'Confirmar contraseña', { secureTextEntry: !show, autoCapitalize: 'none', autoComplete: 'new-password', textContentType: 'newPassword', onSubmitEditing: submit }) : null}
                    <Pressable accessibilityRole="button" accessibilityLabel={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} disabled={busy} onPress={() => setShow(!show)} style={{ minHeight: 44, justifyContent: 'center' }}>
                        <Text style={{ color: colors.deep, fontWeight: '700' }}>{show ? 'Ocultar contraseña' : 'Mostrar contraseña'}</Text>
                    </Pressable>
                    <Notice text={error} />
                    <Action title={busy ? 'Procesando…' : register ? 'Crear cuenta' : 'Ingresar'} busy={busy} onPress={submit} />
                    <Action title={register ? 'Volver a ingresar' : 'Crear usuario'} secondary disabled={busy} onPress={() => {
                        setRegister(!register); setValues({ ...emptyAuthValues, username: values.username }); setTouched({}); setError(''); setShow(false);
                    }} />
                    <Action title="Escanear Joya por QR" secondary disabled={busy} onPress={onScanQR} />
                    <Text style={[s.text, { fontSize: 11, textAlign: 'center' }]}>GEMAS MEYER · INVENTARIO MÓVIL</Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    </LinearGradient>;
}
