import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { supabase } from './api';
import { certificateHtml, type CertificateRecord } from './certificateHtml';
import { Action, Notice, colors, s } from './ui';
import { readQR, QRAccessError, type QRGrant } from './qrAccess';

export function CertificateModal({ id, active, onClose, qrValue, closeLabel = 'Volver al inventario', viewerGrant, onAccessExpired }: {
    id: string; active: boolean; onClose: () => void; qrValue?: string; closeLabel?: string;
    viewerGrant?: QRGrant; onAccessExpired?: () => void;
}) {
    const [record, setRecord] = useState<CertificateRecord | null>(null);
    const [photo, setPhoto] = useState('');
    const [loading, setLoading] = useState(true), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
    useEffect(() => {
        let mounted = true;
        setLoading(true); setError(''); setRecord(null);
        if (!active) return;
        let reading = false;
        const read = async () => {
            if (reading) return;
            reading = true;
            try {
                if (viewerGrant) {
                    if (viewerGrant.certificate_id !== id) throw new QRAccessError('El permiso no corresponde al certificado.', 401);
                    const data = await readQR(supabase, viewerGrant);
                    if (mounted) { setPhoto(data.image_url); setRecord(data.certificate); }
                    return;
                }
                const { data, error } = await supabase.rpc('get_jewelry_certificate', { p_jewelry_id: id }).maybeSingle<CertificateRecord>();
                if (error) throw new Error('No se pudo consultar el certificado. Revisa tu conexión.');
                if (!data) throw new Error('Esta joya todavía no tiene un certificado publicado.');
                const image = await supabase.storage.from('certificate-images').createSignedUrl(data.image_path, 900);
                if (image.error || !image.data) throw new Error('No se pudo cargar la fotografía del certificado.');
                if (mounted) { setPhoto(image.data.signedUrl); setRecord(data); }
            } catch (failure) {
                if (mounted) {
                    setRecord(null); setError(failure instanceof Error ? failure.message : 'No se pudo consultar el certificado.'); setLoading(false);
                    if (failure instanceof QRAccessError && failure.status === 401) onAccessExpired?.();
                }
            } finally {
                reading = false;
            }
        };
        void read();
        const timer = viewerGrant ? setInterval(() => void read(), 45000) : undefined;
        const expiration = viewerGrant ? setTimeout(() => { if (mounted) { setRecord(null); onAccessExpired?.(); } }, Math.max(0, Date.parse(viewerGrant.expires_at) - Date.now())) : undefined;
        return () => { mounted = false; clearInterval(timer); clearTimeout(expiration); };
    }, [id, attempt, active, viewerGrant, onAccessExpired]);
    // Scanned URLs are encoded into the QR, never loaded as executable pages.
    const source = useMemo(() => {
        if (!record) return undefined;
        const base = Constants.expoConfig?.extra?.certificateBaseUrl as string | undefined;
        const value = qrValue || (base ? `${base.replace(/\/$/, '')}/certificado/${id}` : id);
        return { html: certificateHtml(record, photo, value) };
    }, [record, id, qrValue, photo]);
    useEffect(() => {
        if (!loading || !record) return;
        const timer = setTimeout(() => { setLoading(false); setError('El certificado tardó demasiado en cargar. Revisa tu conexión y reintenta.'); }, 25000);
        return () => clearTimeout(timer);
    }, [loading, record]);
    return <Modal visible={active} animationType="slide" onRequestClose={onClose}>
        <SafeAreaView style={s.screen}>
            <View style={{ padding: 16, gap: 10 }}>
                <Text style={s.title}>Certificado de autenticidad</Text>
                <Text style={s.text}>Amplía con dos dedos o gira el teléfono para ver los detalles.</Text>
                <Action title={closeLabel} secondary onPress={onClose} />
                {loading ? <ActivityIndicator accessibilityLabel="Cargando certificado" color={colors.pink} /> : null}
                {error ? <><Notice text={error} /><Action title="Reintentar certificado" onPress={() => setAttempt(value => value + 1)} /></> : null}
            </View>
            {source ? <WebView key={`${id}:${attempt}`} source={source} style={{ flex: 1, backgroundColor: colors.cream }}
                originWhitelist={['*']} javaScriptEnabled domStorageEnabled={false} sharedCookiesEnabled={false}
                allowFileAccess={false} mixedContentMode="never" setSupportMultipleWindows={false}
                onShouldStartLoadWithRequest={request => request.url === 'about:blank' || request.url.startsWith('about:blank#')}
                onMessage={({ nativeEvent }) => {
                    if (nativeEvent.data === 'ready') { setLoading(false); setError(''); }
                    if (nativeEvent.data === 'error') { setLoading(false); setError('No se pudo dibujar el certificado completo. Reintenta.'); }
                }}
                onError={() => { setLoading(false); setError('No se pudo abrir el certificado. Reintenta.'); }}
            /> : null}
        </SafeAreaView>
    </Modal>;
}
