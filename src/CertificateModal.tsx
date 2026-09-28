import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from './api';
import { Action, Brand, Notice, colors, s } from './ui';

type Certificate = { description: string; gemstone: string; metal: string; cut: string; barcode_value: string; image_path: string };
export function CertificateModal({ id, active, onClose }: { id: string; active: boolean; onClose: () => void }) {
    const [record, setRecord] = useState<Certificate | null>(null);
    const [loading, setLoading] = useState(true), [error, setError] = useState(''), [attempt, setAttempt] = useState(0), [imageError, setImageError] = useState(false);
    useEffect(() => {
        let mounted = true;
        setLoading(true); setError(''); setRecord(null); setImageError(false);
        void (async () => {
            try {
                const { data, error } = await supabase.rpc('get_jewelry_certificate', { p_jewelry_id: id }).maybeSingle<Certificate>();
                if (error) throw new Error('No se pudo consultar el certificado. Revisa tu conexión y reintenta.');
                if (!data) throw new Error('Esta joya todavía no tiene un certificado publicado.');
                if (mounted) setRecord(data);
            } catch (failure) {
                if (mounted) setError(failure instanceof Error ? failure.message : 'No se pudo consultar el certificado.');
            } finally { if (mounted) setLoading(false); }
        })();
        return () => { mounted = false; };
    }, [id, attempt]);
    return <Modal visible={active} animationType="slide" onRequestClose={onClose}>
        <SafeAreaView style={s.screen}>
            <ScrollView contentContainerStyle={s.content}>
                <Brand /><Action title="Volver al inventario" secondary onPress={onClose} />
                <Text style={s.title}>{record?.description}</Text>
                {loading ? <ActivityIndicator accessibilityLabel="Cargando certificado" color={colors.pink} /> : null}
                {error ? <><Notice text={error} /><Action title="Reintentar" onPress={() => setAttempt(value => value + 1)} /></> : null}
                {record ? <View style={s.card}>
                    <Image key={attempt} source={{ uri: supabase.storage.from('certificate-images').getPublicUrl(record.image_path).data.publicUrl }}
                        accessibilityLabel={`Fotografía de ${record.description}`} resizeMode="contain" style={{ width: '100%', height: 240, borderRadius: 14 }} onError={() => setImageError(true)} />
                    {imageError ? <><Notice text="No se pudo cargar la fotografía." /><Action title="Reintentar fotografía" secondary onPress={() => setAttempt(value => value + 1)} /></> : null}
                    {([['Descripción / Item', record.description], ['Gema / Gemstone', record.gemstone], ['Metal', record.metal], ['Corte / Cut', record.cut], ['Código del certificado', record.barcode_value]] as const).map(([label, value]) =>
                        <View key={label}><Text style={s.label}>{label}</Text><Text selectable style={s.text}>{value}</Text></View>)}
                    <Text selectable style={s.uid}>UID · {id}</Text>
                </View> : null}
            </ScrollView>
        </SafeAreaView>
    </Modal>;
}
