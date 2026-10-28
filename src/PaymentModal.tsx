import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Action, colors, s } from './ui';
import { PAYMENT_METHODS, type PaymentMethod } from './payments';
import { money, type Candidate } from './api';
import { transactionLabels } from './transactionLabels';
import { guideAmounts, guidePercent } from './guideCommission';

type Props = {
  role: 'admin' | 'collaborator' | 'seller';
  visible: boolean;
  product: Candidate | null;
  selected: PaymentMethod | null;
  busy: boolean;
  legacyPending: boolean;
  onSelect: (method: PaymentMethod) => void;
  onClose: () => void;
  onConfirm: (percent:number, amount?:number) => void;
};
export function PaymentModal({ role, visible, product, selected, busy, legacyPending, onSelect, onClose, onConfirm }: Props) {
  const labels = transactionLabels(role);
  const [adjust,setAdjust]=useState(false),[priceText,setPriceText]=useState('');
  const [guide,setGuide]=useState(false),[percentText,setPercentText]=useState('');
  useEffect(()=>{if(visible){setGuide(false);setPercentText('');setAdjust(false);setPriceText(String(product?.price??''));}},[visible]);
  const staff=role==='admin'||role==='seller';
  const percent=guide&&staff&&!legacyPending?guidePercent(percentText):0;
  const rawPrice=priceText.trim().replace(',','.');
  const adjusted=adjust&&staff&&!legacyPending;
  const validPrice=!adjusted||(/^\d+(\.\d{1,2})?$/.test(rawPrice)&&Number(rawPrice)>0&&Number(rawPrice)<=9999999999.99);
  const salePrice=adjusted?Number(rawPrice):product?.price??0;
  const amounts=percent===null||!validPrice?null:guideAmounts(salePrice,selected,role,percent);
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { if (!busy) onClose(); }}>
    <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(35,18,34,0.6)' }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}>
        <View accessibilityViewIsModal style={[s.card, { width: '100%', maxWidth: 480, alignSelf: 'center' }]}>
          <Text style={s.eyebrow}>{labels.noun.toUpperCase()} · 1 UNIDAD</Text>
          {staff&&!legacyPending?<View style={{gap:10}}><View style={s.row}><Text style={s.text}>Ajuste de precio</Text><Switch accessibilityLabel="Ajuste de precio" value={adjust} disabled={busy} onValueChange={setAdjust}/></View>{adjust?<><TextInput accessibilityLabel="Precio de venta ajustado en Bs" style={s.input} keyboardType="decimal-pad" editable={!busy} value={priceText} onChangeText={setPriceText} placeholder="Monto de la venta (Bs)"/><Text style={s.text}>El precio de catálogo no se modifica.</Text>{!validPrice?<Text style={{color:colors.red}}>Ingresa un monto mayor a cero con hasta dos decimales.</Text>:null}</>:null}</View>:null}
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
          {staff&&!legacyPending?<View style={{gap:10}}><View style={s.row}><Text style={s.text}>Agregar comisión de guía</Text><Switch accessibilityLabel="Agregar comisión de guía" value={guide} disabled={busy} onValueChange={setGuide}/></View>{guide?<><TextInput accessibilityLabel="Porcentaje de comisión de guía" style={s.input} keyboardType="decimal-pad" editable={!busy} placeholder="Porcentaje (0 a 100)" value={percentText} onChangeText={setPercentText}/><Text style={s.text}>Se calcula sobre el monto después de descontar la tarjeta, si corresponde.</Text>{percent===null?<Text style={{color:colors.red}}>Ingresa un porcentaje de 0 a 100 con hasta dos decimales.</Text>:null}</>:null}</View>:null}
          {amounts?.applies ? <Text style={s.text}>Monto original: {money(amounts.gross)} · Deducción por tarjeta (1,5 %): {money(amounts.fee)} · Monto unitario neto a registrar: {money(amounts.net)}</Text> : null}
          {amounts?<Text style={s.text}>Comisión de guía ({percent}%): {money(amounts.commission)} · Venta neta: {money(amounts.net)}</Text>:null}
          <Action title={busy ? labels.progress : labels.action} busy={busy} disabled={!selected||!amounts} onPress={()=>{if(percent!==null)onConfirm(percent,adjusted?salePrice:undefined);}} />
          <Action title="Cancelar" secondary disabled={busy} onPress={onClose} />
        </View>
      </ScrollView>
    </SafeAreaView>
  </Modal>;
}
