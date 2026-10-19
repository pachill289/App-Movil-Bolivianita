import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Text, View } from 'react-native';
import { supabase } from './api';
import { Action, s } from './ui';

export function JewelryPhoto({path,description,active}:{path?:string|null;description:string;active:boolean}) {
 const [url,setUrl]=useState(''),[loading,setLoading]=useState(false),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  let live=true;
  setUrl('');setFailed(false);setLoading(false);
  if(!path||!active)return;
  async function refresh(){
   setLoading(true);
   try{
    const {data,error}=await supabase.storage.from('certificate-images').createSignedUrl(path!,900);
    if(error||!data?.signedUrl)throw error||new Error('Imagen no disponible');
    if(live){setUrl(data.signedUrl);setFailed(false);}
   }catch{if(live)setFailed(true);}
   finally{if(live)setLoading(false);}
  }
  void refresh();
  const timer=setInterval(()=>void refresh(),600000);
  return()=>{live=false;clearInterval(timer);};
 },[path,active,attempt]);
 return <View style={{gap:8}}>
  <View style={{height:180,width:'100%',borderRadius:14,overflow:'hidden',backgroundColor:'#faf6f9',alignItems:'center',justifyContent:'center'}}>
   {url&&!failed?<Image source={{uri:url}} accessibilityLabel={'Fotografía de '+description} resizeMode="contain" style={{width:'100%',height:'100%'}} onError={()=>setFailed(true)}/>:loading?<ActivityIndicator accessibilityLabel="Cargando fotografía"/>:<Text style={s.text}>{!path?'Sin fotografía':failed?'No se pudo cargar la fotografía':'Fotografía en pausa'}</Text>}
  </View>
  {failed?<Action title="Reintentar fotografía" secondary onPress={()=>setAttempt(value=>value+1)}/>:null}
 </View>;
}
