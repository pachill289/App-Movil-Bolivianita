import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, colors, s } from './ui';
import { PAYMENT_METHODS, type PaymentMethod } from './payments';
import { money, type Candidate } from './api';
import { transactionLabels } from './transactionLabels';

type Props = {
  role: 'admin' | 'collaborator' | 'seller';
  visible: boolean;
  product: Candidate | null;
  selected: PaymentMethod | null;
  busy: boolean;
  legacyPending: boolean;
  onSelect: (method: PaymentMethod) => void;
  onClose: () => void;
  onConfirm: () => void;
};
export function PaymentModal({ role, visible, product, selected, busy, legacyPending, onSelect, onClose, onConfirm }: Props) {
  const labels = transactionLabels(role);
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { if (!busy) onClose(); }}>
    <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(35,18,34,0.6)' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
        <View accessibilityViewIsModal style={[s.card, { width: '100%', maxWidth: 480, alignSelf: 'center' }]}>
          <Text style={s.eyebrow}>{labels.noun.toUpperCase()} · 1 UNIDAD</Text>
          <Text accessibilityRole="header" style={s.title}>Tipo de pago</Text>
          <Text style={s.productName}>{product?.description}</Text>
          <Text style={s.price}>{money(product?.price ?? 0)}</Text>
          <Text style={s.text}>Selecciona cómo se realiza el pago para confirmar la {labels.noun}.</Text>
          {legacyPending ? <Text style={s.text}>Hay una operación pendiente de la versión anterior. Se comprobará su resultado antes de descontar stock.</Text> : null}
          <View accessibilityRole="radiogroup" accessibilityLabel="Tipo de pago obligatorio" style={{ gap: 10 }}>
            {PAYMENT_METHODS.map(method => <Pressable key={method.value} accessibilityRole="radio"
              accessibilityState={{ checked: selected === method.value, disabled: busy }}
              disabled={busy} onPress={() => onSelect(method.value)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, padding: 14,
                borderWidth: selected === method.value ? 2 : 1, borderColor: selected === method.value ? colors.pink : colors.line,
                borderRadius: 12, backgroundColor: selected === method.value ? '#f8edf5' : '#fff' }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.pink, alignItems: 'center', justifyContent: 'center' }}>
                {selected === method.value ? <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.pink }} /> : null}
              </View>
              <Text style={[s.productName, { flex: 1, fontSize: 15 }]}>{method.label}</Text>
            </Pressable>)}
          </View>
          <Action title={busy ? labels.progress : labels.action} busy={busy} disabled={!selected} onPress={onConfirm} />
          <Action title="Cancelar" secondary disabled={busy} onPress={onClose} />
        </View>
      </ScrollView>
    </SafeAreaView>
  </Modal>;
}
