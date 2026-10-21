import React, { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Image, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Crypto from 'expo-crypto';
import { supabase, money } from './api';
import { secureStorage } from './secureStorage';
import { type Branch } from './branches';
import { countBarcode, definitiveCountError, type CountSummary, type CountItem, type CountOperation } from './counting';
import { Action, Notice, s } from './ui';
import { CertificateModal } from './CertificateModal';
function CountPhoto({path}:{path:string|null}) {
 const [url,setUrl]=useState('');
 useEffect(()=>{let live=true;async function refresh(){if(!path)return;const {data}=await supabase.storage.from('certificate-images').createSignedUrl(path,900);if(live)setUrl(data?.signedUrl||'');}void refresh();const timer=setInterval(()=>void refresh(),600000);return()=>{live=false;clearInterval(timer);};},[path]);
 return url?<Image source={{uri:url}} resizeMode="contain" style={{height:180,width:'100%'}}/>:null;
}
export function InventoryCountScreen({userId,branch,active,onBack}:{userId:string;branch:Branch;active:boolean;onBack:()=>void}) {
 const [summary,setSummary]=useState<CountSummary|null>(null),[last,setLast]=useState<CountItem|null>(null),[canUndo,setCanUndo]=useState(false);
 const [pending,setPending]=useState<CountOperation|null>(null),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [scanning,setScanning]=useState(false),[manual,setManual]=useState(''),[permission,requestPermission]=useCameraPermissions();
 const [page,setPage]=useState(0),[rows,setRows]=useState<CountItem[]>([]),[pageLoading,setPageLoading]=useState(false),[pageError,setPageError]=useState(''),[revision,setRevision]=useState(0),[certificate,setCertificate]=useState<string|null>(null);
 const guard=useRef(false),cameraGuard=useRef(false),live=useRef(true);
 const key='bolivianita.count.pending.'+userId+'.'+branch.id;
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 useEffect(()=>{if(!active){cameraGuard.current=true;setScanning(false);}},[active]);
 async function load(){setError('');setReady(false);try{const raw=await secureStorage.getItem(key);setPending(raw?JSON.parse(raw):null);const {data,error}=await supabase.rpc('jewelry_count_status',{});if(error)throw error;setSummary(data);setReady(true);}catch{setError('No se pudo recuperar el conteo. Reintenta antes de continuar.');}}
 useEffect(()=>{void load();},[]);
 useEffect(()=>{let current=true;if(summary?.status!=='finished')return;setPageLoading(true);setPageError('');setRows([]);void supabase.rpc('jewelry_count_missing',{p_id:summary.id,p_offset:page*15,p_limit:15}).then(({data,error})=>{if(!current)return;if(error)setPageError('No se pudieron cargar los faltantes.');else setRows(data.rows);setPageLoading(false);});return()=>{current=false;};},[summary?.id,summary?.status,page,revision]);
 async function start(){if(guard.current||pending)return;guard.current=true;setBusy(true);setError('');try{const {data,error}=await supabase.rpc('jewelry_count_start');if(error)throw error;setSummary(data);setLast(null);setPage(0);}catch(e){setError((e as Error).message);}finally{guard.current=false;setBusy(false);}}
 async function record(raw:string,delta:1|-1=1,retry?:CountOperation){
  if(guard.current||(!retry&&pending)||!ready)return;
  guard.current=true;cameraGuard.current=true;setScanning(false);setBusy(true);setError('');
  let operation=retry;
  try{
   if(!operation){if(!summary||summary.status!=='open')throw new Error('Inicia un conteo primero.');operation={id:summary.id,request:Crypto.randomUUID(),barcode:countBarcode(raw),delta};await secureStorage.setItem(key,JSON.stringify(operation));setPending(operation);}
   const {data,error}=await supabase.rpc('jewelry_count_scan',{p_id:operation.id,p_request:operation.request,p_barcode:operation.barcode,p_delta:operation.delta});
   if(error)throw error;
   await secureStorage.removeItem(key);
   if(live.current){setPending(null);setSummary(data.summary);setLast(data.item);setCanUndo(operation.delta===1);setManual('');}
  }catch(e){
   const failure=e as {code?:string;message?:string};
   if(definitiveCountError(failure.code)){try{await secureStorage.removeItem(key);setPending(null);}catch{}setError(failure.message||'No se pudo registrar la lectura.');}
   else setError(operation?'No se pudo confirmar la lectura. Reintenta la misma operación para evitar duplicarla.':failure.message||'Código inválido.');
  }finally{guard.current=false;if(live.current)setBusy(false);}
 }
 async function scan(){if(busy||pending)return;setError('');try{const result=permission?.granted?permission:await requestPermission();if(!result.granted){setError('Permite la cámara o usa un lector óptico en el campo manual.');return;}cameraGuard.current=false;setScanning(true);}catch{setError('No se pudo abrir la cámara.');}}
 async function finish(){if(guard.current||pending||!summary)return;guard.current=true;cameraGuard.current=true;setScanning(false);setBusy(true);setError('');try{const {data,error}=await supabase.rpc('jewelry_count_finish',{p_id:summary.id});if(error)throw error;setSummary(data);setPage(0);setLast(null);}catch{setError('No se pudo confirmar la finalización. Puedes pulsar Finalizar conteo otra vez sin duplicarlo.');}finally{guard.current=false;setBusy(false);}}
 const finished=summary?.status==='finished';
 const header=<View style={{gap:16}}><Action title="Volver al inventario" secondary disabled={busy} onPress={onBack}/><Text style={s.eyebrow}>{branch.name}</Text><Text style={s.title}>{finished?'Productos faltantes':'Conteo de inventario'}</Text><Notice text={error}/>
 {!ready?<Action title="Reintentar recuperación" onPress={()=>void load()}/>:<>
 {!summary?<><Text style={s.text}>Escanea cada joya una sola vez por su código de barras. El conteo se guarda y no cambia el stock.</Text><Action title="Iniciar conteo" busy={busy} onPress={()=>void start()}/></>:<>
 <View style={s.card}><Text style={s.price}>Joyas registradas: {summary.counted_units}</Text><Text style={s.text}>{summary.counted_products} productos distintos · Stock {finished?'al finalizar':'inicial'}: {summary.expected_units}</Text></View>
 {pending?<><Notice text="Hay una lectura pendiente de confirmar. Compruébala antes de continuar."/><Action title="Reintentar lectura pendiente" busy={busy} onPress={()=>void record(pending.barcode,pending.delta,pending)}/></>:null}
 {finished?<><Text style={s.text}>Faltan {summary.missing_units} unidades de {summary.missing_products} productos. El inventario no se modificó.</Text>{summary.changed_products>0?<Notice text={'El stock cambió en '+summary.changed_products+' productos durante el conteo. La comparación usa el stock al finalizar; revisa ventas y traslados.'}/>:null}{summary.extra_units>0?<Notice text={'Se contaron '+summary.extra_units+' unidades por encima del stock final. Revisa lecturas repetidas o movimientos.'}/>:null}<Action title="Iniciar nuevo conteo" secondary disabled={!!pending} busy={busy} onPress={()=>void start()}/></>:<>
 <Text style={s.text}>Cada código se cuenta una sola vez y suma una unidad. Tras registrarla, pulsa Escanear siguiente para continuar. Puedes salir y retomar este conteo en la misma sucursal.</Text>
 {scanning&&active?<><View style={{height:280,borderRadius:18,overflow:'hidden'}}><CameraView style={{flex:1}} facing="back" barcodeScannerSettings={{barcodeTypes:['code128']}} onBarcodeScanned={({data})=>{if(cameraGuard.current)return;cameraGuard.current=true;void record(data);}} onMountError={()=>{setScanning(false);setError('No se pudo iniciar la cámara.');}}/></View><Action title="Pausar cámara" secondary onPress={()=>{cameraGuard.current=true;setScanning(false);}}/></>:<Action title={last?'Escanear siguiente':'Escanear código de barras'} disabled={!!pending} busy={busy} onPress={()=>void scan()}/>}
 {!scanning?<><TextInput accessibilityLabel="Código para conteo" style={s.input} keyboardType="number-pad" value={manual} editable={!busy&&!pending} onChangeText={setManual} placeholder="Código de barras de 14 dígitos" onSubmitEditing={({nativeEvent})=>void record(nativeEvent.text)}/><Action title="Registrar código / lector óptico" secondary disabled={!manual.trim()||!!pending} busy={busy} onPress={()=>void record(manual)}/></>:null}
 {last?<View style={s.card}><Text style={s.productName}>{last.description}</Text><Text style={s.text}>Certificado: {last.barcode}</Text><Text style={s.text}>Cantidad contada: {last.counted} · Stock inicial: {last.initial_stock??'Llegó durante el conteo'}</Text>{canUndo?<Action title="Deshacer última unidad" secondary disabled={!!pending} busy={busy} onPress={()=>void record(last.barcode!,-1)}/>:null}</View>:null}
 <Action title="Finalizar conteo" disabled={!!pending} busy={busy} onPress={()=>Alert.alert('Finalizar conteo','Se compararán las unidades registradas con el stock actual de esta sucursal. No se cambiará el inventario.',[{text:'Continuar contando',style:'cancel'},{text:'Finalizar conteo',onPress:()=>void finish()}])}/>
 </>}
 </>}
 </>}
 {pageError?<><Notice text={pageError}/><Action title="Reintentar faltantes" secondary onPress={()=>setRevision(v=>v+1)}/></>:null}
 </View>;
 return <View style={{flex:1}}><FlatList data={finished?rows:[]} keyExtractor={item=>item.jewelry_id} keyboardShouldPersistTaps="handled" contentContainerStyle={s.content} ListHeaderComponent={header}
 ListEmptyComponent={finished?<Text style={s.text}>{pageLoading?'Cargando faltantes…':pageError?'':summary.missing_products===0?'No se encontraron productos faltantes.':''}</Text>:null}
 renderItem={({item})=><View style={s.card}><CountPhoto path={item.image_path}/><Text style={s.productName}>{item.description}</Text><Text style={s.price}>Precio actual: {item.price == null ? 'No disponible' : money(item.price)}</Text><Text style={s.uid}>Certificado · {item.barcode||'Sin certificado'}</Text><Text style={s.text}>Cantidad contada: {item.counted} · Stock: {item.stock}</Text><Text style={s.price}>Cantidad faltante: {item.missing}</Text>{item.barcode?<Action title="Ver certificado completo" secondary onPress={()=>setCertificate(item.jewelry_id)}/>:null}</View>}
 ListFooterComponent={finished&&summary.missing_products>0?<View style={s.row}><Action title="Anterior" secondary disabled={page===0||pageLoading} onPress={()=>setPage(v=>v-1)}/><Text style={s.text}>Página {page+1} de {Math.ceil(summary.missing_products/15)}</Text><Action title="Siguiente" secondary disabled={pageLoading||(page+1)*15>=summary.missing_products} onPress={()=>setPage(v=>v+1)}/></View>:null}/>
 {certificate?<CertificateModal id={certificate} active={active} onClose={()=>setCertificate(null)} closeLabel="Volver a productos faltantes"/>:null}</View>;
}
