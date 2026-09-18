import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
const client=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
// Only inspect public service metadata. Never authenticate as staff or perform a sale.
const response=await fetch(`${process.env.VITE_SUPABASE_URL}/auth/v1/health`,{headers:{apikey:process.env.VITE_SUPABASE_ANON_KEY}});
console.log('Supabase Auth health:',response.status);
const {error}=await client.rpc('register_certificate_sale',{p_request_id:null,p_jewelry_id:null,p_expected_price:null,p_certificate_version:null,p_payment_method:null});
console.log('RPC anonymous probe:',error?.code??'unexpected success');
if(error?.code==='PGRST202') console.log('Migration must be applied by a database administrator.');
else if(error?.code==='42501') console.log('RPC exists; anonymous access rejected.');
else console.log('Verify server configuration; no sale attempted (null arguments).');