import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { supabase } from './api';
import { selectedBranch, selectBranch, type Branch } from './branches';
import { BranchPicker } from './BranchPicker';
import { Action, Notice, s } from './ui';
export function BranchGate({children}:{children:(branch:Branch,branches:Branch[],change:(id:string)=>void)=>React.ReactNode}) {
 const [id,setId]=useState(selectedBranch),[branches,setBranches]=useState<Branch[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setError('');void supabase.from('jewelry_branches').select('id,name').order('name').then(({data,error})=>{if(!active)return;if(error)setError('No se pudieron verificar tus sucursales.');else setBranches(data);setLoading(false);});return()=>{active=false;};},[attempt]);
 async function change(next:string){setError('');try{await selectBranch(next);setId(next);}catch{setError('No se pudo guardar la sucursal. Reintenta.');}}
 const branch=branches.find(b=>b.id===id);
 if(loading)return <ActivityIndicator/>;
 if(!branch||error)return <View style={s.content}><Text style={s.title}>Acceso a sucursal</Text><Notice text={error||'No tienes acceso a la sucursal elegida. Selecciona una asignada o contacta al administrador.'}/><BranchPicker branches={branches} value={id} onChange={next=>void change(next)}/><Action title="Actualizar permisos" onPress={()=>setAttempt(v=>v+1)}/><Action title="Cerrar sesión" secondary onPress={()=>void supabase.auth.signOut({scope:'local'})}/></View>;
 return <>{children(branch,branches,next=>void change(next))}</>;
}
