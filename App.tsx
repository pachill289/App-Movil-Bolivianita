import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Image, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFonts } from 'expo-font';

import * as Crypto from 'expo-crypto';
import type { Session } from '@supabase/supabase-js';
import { supabase, inventory, lookup, sell, money, type Product, type Candidate, type PendingSale, type Receipt } from './src/api';
import { secureStorage } from './src/secureStorage';
import { parseCertificateQR } from './src/qr';
import { Action, Brand, Notice, colors, s } from './src/ui';
import { PaymentModal } from './src/PaymentModal';
import { isPaymentMethod, paymentLabel, type PaymentMethod } from './src/payments';
function Login() {
    const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [show, setShow] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const guard = useRef(false);
    async function login() {
        if (guard.current)
            return;
        if (!email.trim() || !password) {
            setError('Completa tu correo y contraseña.');
            return;
        }
        guard.current = true;
        setBusy(true);
        setError('');
        try {
            const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
            if (error)
                throw error;
            setPassword('');
            setShow(false);
        }
        catch {
            setError('No pudimos iniciar sesión. Revisa tus credenciales y tu conexión.');
        }
        finally {
            guard.current = false;
            setBusy(false);
        }
    }
    return <LinearGradient colors={['#f6dce9', '#f7f2f5', '#eee7eb']} style={{ flex: 1 }}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}><View style={[s.card, { width: '100%', maxWidth: 450, alignSelf: 'center' }]}><Brand /><Text style={s.eyebrow}>ACCESO PRIVADO</Text><Text style={s.title}>Iniciar sesión</Text><Text style={s.text}>Tu inventario, contigo. Ingresa para consultar tus joyas y registrar ventas.</Text><View><Text style={s.label}>Usuario</Text><TextInput accessibilityLabel="Correo electrónico" style={s.input} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="username" textContentType="username" placeholder="usuario@empresa.com" value={email} onChangeText={setEmail} editable={!busy}/></View><View><Text style={s.label}>Contraseña</Text><View style={{ flexDirection: 'row', alignItems: 'center' }}><TextInput accessibilityLabel="Contraseña" style={[s.input, { flex: 1, paddingRight: 88 }]} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} autoComplete="current-password" textContentType="password" value={password} onChangeText={setPassword} placeholder="Tu contraseña" editable={!busy} onSubmitEditing={login}/><Pressable accessibilityRole="button" accessibilityLabel={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} onPress={() => setShow(!show)} style={{ position: 'absolute', right: 6, padding: 14 }}><Text style={{ color: colors.deep, fontWeight: '700' }}>{show ? 'Ocultar' : 'Mostrar'}</Text></Pressable></View></View><Notice text={error}/><Action title={busy ? 'Ingresando…' : 'Ingresar'} busy={busy} onPress={login}/><Text style={[s.text, { fontSize: 11, textAlign: 'center' }]}>GEMAS MEYER · INVENTARIO MÓVIL</Text></View></ScrollView></KeyboardAvoidingView></LinearGradient>;
}
function Workspace({ session, active }: {
    session: Session;
    active: boolean;
}) {
    const [tab, setTab] = useState<'inventory' | 'sale'>('inventory');
    const [products, setProducts] = useState<Product[]>([]), [loading, setLoading] = useState(false), [error, setError] = useState(''), [search, setSearch] = useState('');
    const [permission, requestPermission] = useCameraPermissions();
    const [scanning, setScanning] = useState(false), [candidate, setCandidate] = useState<Candidate | null>(null), [busy, setBusy] = useState(false), [saleError, setSaleError] = useState('');
    const [pending, setPending] = useState<PendingSale | null>(null), [receipt, setReceipt] = useState<Receipt | null>(null), [restored, setRestored] = useState(false), [manual, setManual] = useState(''), [logoutBusy, setLogoutBusy] = useState(false);
    const [paymentVisible, setPaymentVisible] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
    const scanGuard = useRef(false), saleGuard = useRef(false), loadGuard = useRef(false), mounted = useRef(true);
    const pendingKey = `bolivianita.pending.${session.user.id}`;
    const { width } = useWindowDimensions();
    const columns = width >= 700 ? 2 : 1;
    useEffect(() => () => { mounted.current = false; }, []);
    const refresh = useCallback(async () => { if (loadGuard.current)
        return; loadGuard.current = true; setLoading(true); setError(''); try {
        const rows = await inventory();
        if (mounted.current)
            setProducts(rows);
    }
    catch {
        if (mounted.current)
            setError('No se pudo actualizar el inventario. Revisa tu conexión y vuelve a intentarlo.');
    }
    finally {
        loadGuard.current = false;
        if (mounted.current)
            setLoading(false);
    } }, []);
    useEffect(() => { void refresh(); }, [refresh]);
    async function restore() { setSaleError(''); try {
        const raw = await secureStorage.getItem(pendingKey);
        if (raw) {
            const saved = JSON.parse(raw) as PendingSale;
            setPending(saved);
            setCandidate(saved.product);
            setTab('sale');
        }
        setRestored(true);
    }
    catch {
        setSaleError('No se pudo recuperar la operación pendiente. Reintenta antes de comprar.');
    } }
    useEffect(() => { void restore(); }, []);
    useEffect(() => { if (active)
        void refresh();
    else
        setScanning(false); }, [active, refresh]);
    async function scan(raw: string) { if (scanGuard.current || pending)
        return; scanGuard.current = true; setScanning(false); setBusy(true); setSaleError(''); setReceipt(null); setCandidate(null); try {
        const product = await lookup(parseCertificateQR(raw));
        if (mounted.current)
            setCandidate(product);
    }
    catch (err) {
        if (mounted.current)
            setSaleError(err instanceof Error ? err.message : 'No pudimos leer este certificado.');
    }
    finally {
        scanGuard.current = false;
        if (mounted.current)
            setBusy(false);
    } }
    async function startScan() { setSaleError(''); setReceipt(null); try {
        const result = permission?.granted ? permission : await requestPermission();
        if (result.granted) {
            setCandidate(null);
            setScanning(true);
        }
        else {
            setSaleError('La cámara está deshabilitada. Puedes habilitarla en Ajustes o pegar el enlace del certificado.');
        }
    }
    catch {
        setSaleError('No se pudo abrir la cámara.');
    } }
    function openPurchase() {
        if (busy || !candidate || !restored) return;
        setSaleError('');
        if (pending && isPaymentMethod(pending.paymentMethod)) {
            void confirmSale(pending.paymentMethod);
            return;
        }
        setSelectedPayment(null);
        setPaymentVisible(true);
    }
    async function confirmSale(selected: PaymentMethod | null) {
        if (saleGuard.current || !candidate || !restored) return;
        const method = pending && isPaymentMethod(pending.paymentMethod) ? pending.paymentMethod : selected;
        if (!isPaymentMethod(method)) {
            setSaleError('Selecciona un tipo de pago antes de comprar.');
            return;
        }
        saleGuard.current = true;
        setBusy(true);
        setSaleError('');
        let operation = pending;
        try {
            if (!operation || !isPaymentMethod(operation.paymentMethod)) {
                operation = { requestId: operation?.requestId ?? Crypto.randomUUID(), product: operation?.product ?? candidate, paymentMethod: method };
                // Keep the same id when upgrading a legacy pending operation.
                // The server returns an existing receipt without a second stock decrement.
                await secureStorage.setItem(pendingKey, JSON.stringify(operation));
                setPending(operation);
            }
            const result = await sell(operation);
            await secureStorage.removeItem(pendingKey);
            if (mounted.current) {
                setReceipt(result);
                setPending(null);
                setCandidate(null);
                void refresh();
            }
        } catch (err) {
            const failure = err as { code?: string; message?: string };
            if (['42501', '22023', 'P0001', 'PGRST202'].includes(failure.code ?? '')) {
                try {
                    await secureStorage.removeItem(pendingKey);
                    setPending(null);
                    setCandidate(null);
                } catch {}
                setSaleError(failure.code === 'PGRST202'
                    ? 'Las compras todavía no están habilitadas en el servidor. Contacta al administrador.'
                    : failure.message ?? 'No se pudo registrar la compra.');
            } else {
                setSaleError('No se pudo confirmar el resultado. Reintenta esta misma compra para comprobarla sin descontar dos veces.');
            }
        } finally {
            saleGuard.current = false;
            if (mounted.current) {
                setPaymentVisible(false);
                setBusy(false);
            }
        }
    }
    async function logout() { if (busy || logoutBusy)
        return; setLogoutBusy(true); setError(''); setScanning(false); try {
        const { error } = await supabase.auth.signOut({ scope: 'local' });
        if (error)
            throw error;
    }
    catch {
        setError('No se pudo cerrar la sesión de forma segura. Revisa tu conexión y reintenta.');
    }
    finally {
        setLogoutBusy(false);
    } }
    const list = products.filter(p => `${p.description} ${p.id}`.toLowerCase().includes(search.trim().toLowerCase()));
    const header = <View style={{ gap: 18 }}><Brand /><View style={s.row}><Text numberOfLines={1} style={[s.text, { flex: 1 }]}>{session.user.email}</Text><Action title="Cerrar sesión" secondary busy={logoutBusy} disabled={busy} onPress={logout}/></View><View style={s.row}><View style={s.tab}><Action title="Inventario" secondary={tab !== 'inventory'} disabled={busy} onPress={() => { setTab('inventory'); setScanning(false); }}/></View><View style={s.tab}><Action title="Compra por QR" secondary={tab !== 'sale'} disabled={busy} onPress={() => setTab('sale')}/></View></View><Notice text={error}/></View>;
    return <View style={{ flex: 1 }}>{tab === 'inventory' ? <FlatList key={columns} data={list} numColumns={columns} keyExtractor={p => p.id} contentContainerStyle={s.content} columnWrapperStyle={columns === 2 ? { gap: 14 } : undefined} refreshing={loading} onRefresh={refresh} ListHeaderComponent={<View style={{ gap: 18, marginBottom: 4 }}>{header}<Text style={s.eyebrow}>COLECCIÓN · SOLO LECTURA</Text><Text style={s.title}>Productos de joyería</Text><View style={s.row}>{[['Productos', products.length], ['Unidades', products.reduce((sum, p) => sum + p.stock, 0)], ['Agotados', products.filter(p => p.stock === 0).length]].map(([label, value]) => <View key={label} style={[s.product, { minWidth: 85, padding: 12 }]}><Text style={s.text}>{label}</Text><Text style={s.price}>{value}</Text></View>)}</View><TextInput style={s.input} accessibilityLabel="Buscar productos" placeholder="Buscar descripción o UID…" value={search} onChangeText={setSearch}/><Action title={loading ? 'Actualizando…' : 'Actualizar inventario'} secondary busy={loading} onPress={refresh}/></View>} ListEmptyComponent={<Text style={[s.text, { textAlign: 'center', padding: 28 }]}>{loading ? 'Cargando productos…' : error ? 'Inventario no disponible.' : 'No hay productos para mostrar.'}</Text>} renderItem={({ item }) => <View style={[s.product, { marginVertical: 6 }]}><Text style={s.productName}>{item.description}</Text><Text selectable style={s.uid}>UID · {item.id}</Text><View style={[s.row, { justifyContent: 'space-between' }]}><Text style={s.price}>{money(item.price)}</Text><Text style={[s.badge, item.stock === 0 && { color: colors.red, backgroundColor: '#fff0f2' }]}>{item.stock === 0 ? 'Agotado' : `${item.stock} en stock`}</Text></View></View>}/> : <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>{header}<Text style={s.eyebrow}>CERTIFICADOS · VENTAS</Text><Text style={s.title}>Escanear y comprar</Text><Text style={s.text}>Escanea el QR del certificado. Revisa la joya y selecciona el tipo de pago para comprar una unidad.</Text><Notice text={saleError}/>{!restored ? <Action title="Recuperar operación pendiente" onPress={restore}/> : null}{busy ? <ActivityIndicator color={colors.pink}/> : null}{scanning && active ? <View style={{ gap: 14 }}><View style={{ height: 320, borderRadius: 22, overflow: 'hidden' }}><CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={({ data }) => void scan(data)} onMountError={() => { setScanning(false); setSaleError('No se pudo iniciar la cámara. Intenta nuevamente.'); }}/><View pointerEvents="none" style={{ position: 'absolute', top: 50, left: '15%', width: '70%', height: 220, borderWidth: 3, borderColor: '#fff', borderRadius: 18 }}/></View><Action title="Cancelar escaneo" secondary onPress={() => setScanning(false)}/></View> : null}{receipt ? <View style={s.card}><Notice success text="Compra registrada correctamente"/><Text style={s.productName}>{receipt.description}</Text><Text style={s.price}>{money(receipt.total_amount ?? receipt.unit_price)}</Text><Text style={s.text}>Tipo de pago: {paymentLabel(receipt.payment_method)}</Text><Text style={s.text}>Una unidad comprada · Stock después de esta compra: {receipt.stock_after}</Text><Text selectable style={s.uid}>Comprobante · {receipt.request_id}</Text><Text style={s.text}>Fecha (Bolivia): {new Date(receipt.created_at).toLocaleString('es-BO', { timeZone: 'America/La_Paz' })}</Text><Action title="Nueva compra" onPress={() => { setReceipt(null); setManual(''); }}/></View> : candidate ? <View style={s.card}><Image source={{ uri: candidate.image }} accessibilityLabel={candidate.description} style={{ width: '100%', height: 200, borderRadius: 14 }} resizeMode="contain"/><Text style={s.productName}>{candidate.description}</Text><Text style={s.uid}>Certificado · {candidate.barcode}</Text><Text style={s.price}>{money(candidate.price)}</Text><Text style={s.text}>Cantidad: 1 · Stock consultado: {candidate.stock}</Text>{pending?.paymentMethod ? <Text style={s.text}>Tipo de pago: {paymentLabel(pending.paymentMethod)}</Text> : null}{pending ? <Notice text="Existe una operación pendiente. Comprueba el resultado usando el mismo comprobante antes de iniciar otra compra."/> : null}<Action title={pending ? 'Comprobar compra' : 'Comprar'} busy={busy} disabled={!pending && candidate.stock < 1} onPress={openPurchase}/>{!pending ? <Action title="Cancelar" secondary disabled={busy} onPress={() => setCandidate(null)}/> : null}</View> : !scanning && restored ? <View style={s.card}><Action title="Escanear QR del certificado" busy={busy} onPress={startScan}/>{permission && !permission.granted && !permission.canAskAgain ? <Action title="Abrir ajustes de cámara" secondary onPress={() => void Linking.openSettings()}/> : null}<Text style={s.label}>O pega el enlace del certificado</Text><TextInput accessibilityLabel="Enlace o UUID del certificado" style={s.input} value={manual} onChangeText={setManual} autoCapitalize="none" autoCorrect={false} placeholder="https://…/certificado/…"/><Action title="Consultar certificado" secondary disabled={!manual.trim() || busy} onPress={() => void scan(manual)}/></View> : null}</ScrollView>}<PaymentModal visible={paymentVisible && active} product={candidate} selected={selectedPayment} busy={busy} legacyPending={!!pending && !pending.paymentMethod} onSelect={setSelectedPayment} onClose={() => setPaymentVisible(false)} onConfirm={() => void confirmSale(selectedPayment)} /></View>;
}
export default function App() {
    const [fontsLoaded, fontError] = useFonts({ Cinzel_700Bold: require('@expo-google-fonts/cinzel/700Bold/Cinzel_700Bold.ttf'), RobotoMono_500Medium: require('@expo-google-fonts/roboto-mono/500Medium/RobotoMono_500Medium.ttf') });
    const [session, setSession] = useState<Session | null>(null), [ready, setReady] = useState(false), [bootError, setBootError] = useState(''), [active, setActive] = useState(AppState.currentState === 'active');
    const boot = useCallback(async () => { setBootError(''); setReady(false); try {
        const { data, error } = await supabase.auth.getSession();
        if (error)
            throw error;
        if (data.session) {
            const check = await supabase.auth.getUser();
            if (check.error)
                throw check.error;
        }
        setSession(data.session);
        setReady(true);
    }
    catch (error) {
        const status = (error as {
            status?: number;
        }).status;
        if (status === 401 || status === 403) {
            const result = await supabase.auth.signOut({ scope: 'local' });
            if (!result.error) {
                setSession(null);
                setReady(true);
                return;
            }
        }
        setBootError('No se pudo verificar la sesión. Revisa tu conexión y reintenta.');
    } }, []);
    useEffect(() => { void boot(); const { data } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); }); const state = AppState.addEventListener('change', next => { setActive(next === 'active'); if (next === 'active')
        supabase.auth.startAutoRefresh();
    else
        supabase.auth.stopAutoRefresh(); }); if (AppState.currentState === 'active')
        supabase.auth.startAutoRefresh(); return () => { data.subscription.unsubscribe(); state.remove(); supabase.auth.stopAutoRefresh(); }; }, [boot]);
    return <SafeAreaProvider><SafeAreaView style={s.screen}><StatusBar style="dark"/>{bootError ? <View style={s.content}><Brand /><Notice text={bootError}/><Action title="Reintentar" onPress={boot}/></View> : !ready || (!fontsLoaded && !fontError) ? <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color={colors.pink}/></View> : session ? <Workspace key={session.user.id} session={session} active={active}/> : <Login />}{!active ? <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' }}><Text style={s.title}>GEMAS MEYER</Text></View> : null}</SafeAreaView></SafeAreaProvider>;
}
