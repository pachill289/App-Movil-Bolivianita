import React, { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from './api';
import { parseCertificateQR } from './qr';
import { loginQR, logoutQR, type QRGrant } from './qrAccess';
import { CertificateModal } from './CertificateModal';
import { Action, Brand, Notice, s } from './ui';

export function QRAccessScreen({ active, onBack }: { active: boolean; onBack: () => void }) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanning, setScanning] = useState(false), [manual, setManual] = useState('');
    const [id, setId] = useState(''), [qr, setQR] = useState('');
    const [username, setUsername] = useState(''), [password, setPassword] = useState('');
    const [grant, setGrant] = useState<QRGrant | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
    const scanGuard = useRef(false), loginGuard = useRef(false), mounted = useRef(true);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    useEffect(() => { if (!active) setScanning(false); }, [active]);
    function select(raw: string) {
        if (scanGuard.current) return;
        scanGuard.current = true; setScanning(false); setError('');
        try { setId(parseCertificateQR(raw)); setQR(raw.trim()); setPassword(''); }
        catch (failure) { scanGuard.current = false; setError((failure as Error).message); }
    }
    async function start() {
        scanGuard.current = false;
        setError('');
        try {
            const result = permission?.granted ? permission : await requestPermission();
            if (!mounted.current) return;
            if (result.granted) setScanning(true);
            else setError('Permite usar la cámara o pega el enlace del certificado.');
        } catch { if (mounted.current) setError('No se pudo abrir la cámara. Puedes pegar el enlace del certificado.'); }
    }
    async function login() {
        if (loginGuard.current || !username.trim() || !password) return;
        loginGuard.current = true; setBusy(true); setError('');
        try {
            const access = await loginQR(supabase, id, username, password);
            if (mounted.current) { setGrant(access); setPassword(''); }
            else void logoutQR(supabase, access).catch(() => {});
        } catch (failure) { if (mounted.current) setError((failure as Error).message); }
        finally { loginGuard.current = false; if (mounted.current) setBusy(false); }
    }
    const expired = useCallback(() => { setGrant(null); setPassword(''); setError('El acceso expiró o fue revocado. Ingresa nuevamente con Visor QR.'); }, []);
    function closeCertificate() {
        const previous = grant;
        setGrant(null); setId(''); setPassword(''); setError('');
        scanGuard.current = false;
        if (previous) void logoutQR(supabase, previous).catch(() => { if (mounted.current) setError('Se cerró el acceso en este dispositivo. Sin conexión, el permiso del servidor vencerá automáticamente.'); });
    }
    return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
            <Brand /><Text style={s.title}>{id ? 'Iniciar sesión · Visor QR' : 'Escanear Joya por QR'}</Text>
            <Action title="Volver al login" secondary disabled={busy} onPress={onBack} />
            {id ? <View style={s.card}>
                <Text style={s.text}>Introduce el usuario y la contraseña de Visor QR para ver únicamente el certificado escaneado.</Text>
                <Text style={s.label}>Usuario Visor QR</Text><TextInput accessibilityLabel="Usuario Visor QR" style={s.input} value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} autoComplete="username" editable={!busy} />
                <Text style={s.label}>Contraseña</Text><TextInput accessibilityLabel="Contraseña Visor QR" style={s.input} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="current-password" editable={!busy} onSubmitEditing={() => void login()} />
                <Action title="Ver certificado" busy={busy} disabled={!username.trim() || !password} onPress={() => void login()} />
                <Action title="Escanear otra joya" secondary disabled={busy} onPress={() => { scanGuard.current = false; setId(''); setPassword(''); setError(''); }} />
            </View> : <View style={s.card}>
                {scanning && active ? <><CameraView style={{ height: 300, borderRadius: 16 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={({ data }) => select(data)} /><Action title="Cancelar escaneo" secondary onPress={() => setScanning(false)} /></> : <Action title="Abrir cámara y escanear QR" onPress={() => void start()} />}
                {permission && !permission.granted && !permission.canAskAgain ? <Action title="Abrir ajustes de cámara" secondary onPress={() => void Linking.openSettings()} /> : null}
                <Text style={s.label}>Enlace del certificado</Text><TextInput accessibilityLabel="Enlace del certificado" style={s.input} value={manual} onChangeText={setManual} autoCapitalize="none" autoCorrect={false} placeholder="https://bolivianita.org/certificado/…" onSubmitEditing={() => select(manual)} />
                <Action title="Continuar" secondary disabled={!manual.trim()} onPress={() => select(manual)} />
            </View>}
            <Notice text={error} />
        </ScrollView>
        {grant ? <CertificateModal id={grant.certificate_id} active={active} qrValue={qr} viewerGrant={grant} onAccessExpired={expired} closeLabel="Cerrar acceso al certificado" onClose={closeCertificate} /> : null}
    </KeyboardAvoidingView>;
}
