require('dotenv').config({ quiet: true });
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env');
if (!url.startsWith('https://')) throw new Error('Supabase requiere HTTPS');
let role;
try { role = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role; } catch {}
if (key.startsWith('sb_secret_') || (role && role !== 'anon')) throw new Error('Usa únicamente una clave anon/publishable');
module.exports = {
  name: 'Bolivianita Inventario', slug: 'bolivianita-inventario', version: '1.0.0',
  platforms: ['ios', 'android'], scheme: 'bolivianita', orientation: 'default', userInterfaceStyle: 'light',
  ios: { supportsTablet: true, bundleIdentifier: 'com.gemasmeyer.bolivianitainventario', config: { usesNonExemptEncryption: false } },
  android: { package: 'com.gemasmeyer.bolivianitainventario', blockedPermissions: ['android.permission.RECORD_AUDIO'] },
  plugins: [['expo-camera', { cameraPermission: 'Permite usar la cámara para escanear certificados de joyería.', recordAudioAndroid: false }], 'expo-secure-store', 'expo-font'],
  extra: { eas: {
      projectId: "387cadf9-24f7-4e35-be75-3567bfa73959"
    }, supabaseUrl: url, supabaseAnonKey: key },
};