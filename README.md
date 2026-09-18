# Bolivianita Inventario · Android / iOS

Aplicación independiente React Native, Expo y TypeScript, gestionada con pnpm. Sigue la identidad visual del inventario web: ciruela, rosa, crema, Cinzel y Roboto Mono (fuentes incluidas localmente).

## Ejecutar

Requiere Node 22 LTS y pnpm. Desde esta carpeta:

```powershell
pnpm install
pnpm start
```

La copia local de `.env` conserva **los mismos nombres y valores** del sistema web: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. `app.config.js` los adapta a Expo. No usa claves administrativas. El archivo no se incorpora a Git. `.easignore` permite que este `.env` llegue al constructor EAS; contiene únicamente la URL y la clave pública del cliente. Alternativamente configura las dos variables en EAS.

## Compras con tipo de pago

La migración de compras fue aplicada al Supabase de esta app el 18/09/2026 y se habilitó la cuenta de inventario existente. La nueva interfaz requiere recargar Expo Go o reconstruir la app instalada. Consulta supabase/VENTAS.md para los campos del registro y la futura exportación.

## Activar las ventas en otra instalación (necesario una sola vez)

1. En el proyecto Supabase existente, ejecuta `supabase/migrations/202609180001_payment_sales.sql` mediante SQL Editor o tu proceso de migraciones. Requiere las tablas existentes `jewelry_products` y `jewelry_certificates` y la migración de certificados del sistema web. No recrees las tablas del inventario.
2. Autoriza **cada vendedor** desde SQL Editor, sustituyendo su correo:

```sql
insert into public.mobile_sales_staff(user_id)
select id from auth.users where email = 'VENDEDOR@EMPRESA.COM'
on conflict do nothing;
```

El login y la lectura usan los usuarios y las políticas actuales de Supabase. La membresía adicional habilita únicamente la función de venta móvil. No se cambia el CRUD del sistema web. La app nunca crea usuarios. La migración no se aplica automáticamente usando la clave pública del `.env`, porque esa clave no tiene permisos administrativos.

## Flujo

- Login con correo y contraseña, mostrar/ocultar contraseña, sesión cifrada en Keychain/Keystore y actualización de tokens según el estado de la app.
- Cierre de sesión del dispositivo mediante Supabase. Si falla la revocación se muestra un error y se permite reintentar.
- Inventario de solo lectura con búsqueda, precios BOB, existencias y actualización manual / al volver a la app.
- QR existente `https://…/certificado/<UUID>`; también se puede pegar el enlace o UUID. No se abre ni se consulta la URL escaneada: sólo se extrae el UUID y se consulta el Supabase configurado.
- Se muestra producto, foto, precio y stock. Sólo **Comprar** descuenta una unidad.
- La RPC valida vendedor, certificado, versión, precio y stock; bloquea el producto durante la transacción y registra un comprobante. No construye SQL dinámico.
- Cada intención de venta tiene un UUID persistido **antes** de enviar la petición. Un reintento tras corte de red o reinicio recibe el mismo comprobante. No se permiten nuevas ventas desde esa app hasta resolver la pendiente. Las operaciones pendientes se separan por usuario y se conservan al cerrar sesión.
- Escanear de nuevo después de completar una venta inicia otra venta explícita. El esquema web tiene un certificado por producto (que puede tener varias unidades), no un certificado por unidad física.

## Verificar

```powershell
pnpm typecheck
pnpm test
pnpm run doctor
pnpm exec expo export --platform all
node scripts/check-backend.mjs
```

No uses una venta real para probar el sistema. Crea productos y usuarios de prueba en un proyecto Supabase de desarrollo; prueba stock cero, dos ventas simultáneas con una unidad, repetición de request_id, caída de red después del envío y usuarios sin permiso.

## Builds

```powershell
pnpm dlx eas-cli@24.6.0 login
pnpm dlx eas-cli@24.6.0 init
pnpm build:android
pnpm build:ios
```

`eas init` asigna el proyecto de tu cuenta; conserva `extra.supabaseUrl` y `extra.supabaseAnonKey` al añadir `extra.eas.projectId` en `app.config.js` si EAS solicita editarlo manualmente.

- `preview`: APK Android instalable; para iOS, distribución interna con dispositivos registrados.
- `production`: Android AAB / iOS para App Store o TestFlight.
- `simulator`: `pnpm dlx eas-cli@24.6.0 build --platform ios --profile simulator`.
- iOS necesita cuenta Apple Developer y credenciales de firma para distribución física. Android necesita su keystore (EAS puede gestionarlo).
- Puedes compilar iOS en EAS desde Windows; el build iOS local necesita macOS y Xcode. Android local usa Android Studio, SDK y JDK compatibles.
- Identificadores iniciales: `com.gemasmeyer.bolivianitainventario`; cámbialos antes de publicar si tu organización ya usa otros.

Una exportación Metro valida los bundles, pero no sustituye un build nativo firmado ni pruebas de cámara y sesión en dispositivos físicos.

## Referencias

- https://docs.expo.dev/build/setup/
- https://docs.expo.dev/versions/latest/sdk/camera/
- https://docs.expo.dev/versions/latest/sdk/securestore/
- https://supabase.com/docs/guides/auth/quickstarts/react-native