import React from 'react';
import { Pressable, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
export const colors = { ink: '#2d1e2f', muted: '#766b78', line: '#e8dfe8', pink: '#a21c6b', deep: '#571450', cream: '#fbf8fa', green: '#287457', red: '#b2374e' };
export function Brand() { return <View style={s.brand}><LinearGradient colors={['#f5d47d', '#bf4c82', '#5d2057']} style={s.mark}><Text style={{ color: '#fff3b4', fontSize: 28 }}>◆</Text></LinearGradient><View style={{ flex: 1 }}><Text style={s.eyebrow}>AMANECER DE LAS GEMAS</Text><Text style={s.brandName}>GEMAS MEYER</Text></View></View>; }
export function Action({ title, onPress, disabled = false, secondary = false, busy = false }: {
    title: string;
    onPress: () => void;
    disabled?: boolean;
    secondary?: boolean;
    busy?: boolean;
}) { return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy }} disabled={disabled || busy} onPress={onPress} style={({ pressed }) => [{ opacity: disabled || busy ? 0.5 : pressed ? 0.75 : 1 }]}><LinearGradient colors={secondary ? ['#f8edf5', '#f8edf5'] : ['#591551', '#a21c6b', '#db8050']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.button}>{busy ? <ActivityIndicator color={secondary ? colors.deep : '#fff'}/> : null}<Text style={[s.buttonText, secondary && { color: colors.deep }]}>{title}</Text></LinearGradient></Pressable>; }
export function Notice({ text, success = false }: {
    text: string;
    success?: boolean;
}) { return text ? <Text accessibilityRole="alert" style={[s.notice, success && { backgroundColor: '#edf9f3', color: colors.green }]}>{text}</Text> : null; }
export const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.cream }, content: { width: '100%', maxWidth: 960, alignSelf: 'center', padding: 20, gap: 18 },
    card: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 22, padding: 24, gap: 18 },
    brand: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 18, borderBottomWidth: 1, borderColor: colors.line }, mark: { width: 50, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, brandName: { fontFamily: 'Cinzel_700Bold', fontSize: 17, color: colors.ink, marginTop: 5 },
    eyebrow: { fontFamily: 'RobotoMono_500Medium', fontSize: 9, letterSpacing: 1.5, color: colors.pink }, title: { fontFamily: 'Cinzel_700Bold', fontSize: 28, color: colors.ink }, text: { fontSize: 14, lineHeight: 22, color: colors.muted }, label: { fontSize: 12, fontWeight: '700', color: colors.ink, marginBottom: 7 },
    input: { minHeight: 50, borderWidth: 1, borderColor: '#dcd1dc', borderRadius: 11, paddingHorizontal: 14, color: colors.ink, backgroundColor: '#fff', fontSize: 14 },
    button: { minHeight: 50, borderRadius: 11, padding: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }, buttonText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    notice: { padding: 14, borderRadius: 10, backgroundColor: '#fff0f2', color: '#9b293e', lineHeight: 21, fontSize: 13 }, row: { flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
    tab: { flex: 1, minWidth: 120 }, product: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 18, gap: 10, flex: 1 }, productName: { fontSize: 17, fontWeight: '700', color: colors.ink }, uid: { fontFamily: 'RobotoMono_500Medium', fontSize: 10, color: colors.muted }, price: { fontFamily: 'RobotoMono_500Medium', fontSize: 18, color: colors.deep }, badge: { fontSize: 12, fontWeight: '700', color: colors.green, backgroundColor: '#edf8f2', padding: 8, borderRadius: 9 },
});
