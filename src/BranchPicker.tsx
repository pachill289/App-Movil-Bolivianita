import React, { useState } from 'react';
import { FlatList, Modal, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Branch } from './branches';
import { Action, s } from './ui';
export function BranchPicker({branches,value,onChange,disabled=false}:{branches:Branch[];value:string;onChange:(id:string)=>void;disabled?:boolean}) {
 const [open,setOpen]=useState(false);
 return <View style={{gap:8}}><Text style={s.label}>Sucursal</Text><Action secondary title={branches.find(b=>b.id===value)?.name || 'Selecciona una sucursal'} disabled={disabled||!branches.length} onPress={()=>setOpen(true)}/><Modal visible={open} onRequestClose={()=>setOpen(false)} animationType="slide"><SafeAreaView style={s.screen}><FlatList data={branches} keyExtractor={b=>b.id} contentContainerStyle={s.content} ListHeaderComponent={<Text style={s.title}>Seleccionar sucursal</Text>} renderItem={({item})=><Action title={item.name} secondary={item.id!==value} onPress={()=>{setOpen(false);onChange(item.id);}}/>} ListFooterComponent={<Action secondary title="Cerrar" onPress={()=>setOpen(false)}/>}/></SafeAreaView></Modal></View>;
}
