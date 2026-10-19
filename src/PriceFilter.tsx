import React, { useState } from 'react';
import { FlatList, Modal, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { money } from './api';
import { Action, Notice, s } from './ui';

export function PriceFilter({prices,onApply}:{prices:number[];onApply:(value:number|null)=>void}) {
 const [value,setValue]=useState(''),[open,setOpen]=useState(false),[error,setError]=useState('');
 function apply(){
  const raw=value.trim().replace(',','.');
  if(raw&&(!/^\d+(\.\d{1,2})?$/.test(raw)||Number(raw)>9999999999.99)){setError('Ingresa un precio válido con hasta dos decimales.');return;}
  setError('');onApply(raw?Number(raw):null);
 }
 return <View style={{gap:10}}>
  <Text style={s.label}>Precio (Bs)</Text>
  <TextInput style={s.input} accessibilityLabel="Precio para filtrar" keyboardType="decimal-pad" placeholder="Todos los precios" value={value} onChangeText={setValue} onSubmitEditing={apply}/>
  <Action title="Seleccionar precio disponible" secondary onPress={()=>setOpen(true)}/>
  <Notice text={error}/><Action title="Filtrar" onPress={apply}/>
  <Action title="Todos los precios" secondary onPress={()=>{setValue('');setError('');onApply(null);}}/>
  <Modal visible={open} onRequestClose={()=>setOpen(false)} animationType="slide"><SafeAreaView style={s.screen}>
   <FlatList data={prices} keyExtractor={item=>String(item)} contentContainerStyle={s.content}
    ListHeaderComponent={<><Text style={s.title}>Seleccionar precio</Text><Action title="Todos los precios" secondary onPress={()=>{setValue('');setOpen(false);}}/></>}
    ListEmptyComponent={<Text style={s.text}>No hay precios de joyas con stock en esta sucursal.</Text>}
    renderItem={({item})=><Action title={money(item)} secondary onPress={()=>{setValue(String(item));setOpen(false);setError('');}}/>}
    ListFooterComponent={<Action title="Cerrar" secondary onPress={()=>setOpen(false)}/>}/>
  </SafeAreaView></Modal>
 </View>;
}
