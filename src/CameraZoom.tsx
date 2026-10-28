import React from 'react';
import {Text,View} from 'react-native';
import {Action,s} from './ui';
export function CameraZoom({value,onChange}:{value:number;onChange:(value:number)=>void}){
 return <View style={{gap:8}}><Text style={s.text}>Zoom de cámara: {Math.round(value*100)}%</Text><View style={s.row}>
  <Action title="− Zoom" secondary disabled={value<=0} onPress={()=>onChange(Math.max(0,Math.round((value-.05)*100)/100))}/>
  <Action title="Restablecer" secondary disabled={value===0} onPress={()=>onChange(0)}/>
  <Action title="+ Zoom" secondary disabled={value>=1} onPress={()=>onChange(Math.min(1,Math.round((value+.05)*100)/100))}/>
 </View></View>;
}
