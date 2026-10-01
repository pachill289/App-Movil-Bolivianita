# Bolivianita Inventario · Android / iOS

Aplicación independiente React Native, Expo y TypeScript, gestionada con pnpm. Sigue la identidad visual del inventario web: ciruela, rosa, crema, Cinzel y Roboto Mono (fuentes incluidas localmente).

## Ejecutar

Requiere Node 22 LTS y pnpm. Desde esta carpeta:

```powershell
pnpm install
pnpm start
```

La copia local de `.env` conserva **los mismos nombres y valores** del sistema web: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. `app.config.js` los adapta a Expo. No usa claves administrativas. El archivo no se incorpora a Git. `.easignore` permite que este `.env` llegue al constructor EAS; contiene únicamente la URL y la clave pública del cliente. Alternativamente configura las dos variables en EAS.

## Acceso y registro por nombre de usuario

El acceso móvil usa la misma Edge Function `username-auth` del sistema web. El registro público solo crea **Colaborador / Cliente**; los vendedores se registran desde el panel administrativo web. Se solicitan nombre, apellido, teléfono boliviano de 8 dígitos, nombre de usuario, contraseña y confirmación. Los usuarios se normalizan a minúsculas y admiten de 3 a 40 caracteres. La contraseña nueva exige 12 caracteres, mayúscula, minúscula, número y símbolo, sin espacios y con un máximo de 72 bytes UTF-8.

### Visor QR desde el login

**Escanear Joya por QR** permite escanear con la cámara o pegar el enlace del certificado sin ingresar al inventario. Después solicita el usuario y contraseña de la cuenta única Visor QR creada por el administrador web. Usa `qr-access` y muestra la misma plantilla de certificado con su foto protegida, sin consultar inventario ni ofrecer compras o ventas.

El permiso se conserva solo en memoria, no crea una sesión Auth y vence a los 15 minutos. El certificado se verifica cada 45 segundos y al regresar del segundo plano; al caducar o revocarse se solicita nuevamente la contraseña. Cerrar el certificado elimina el permiso local y solicita su revocación al servidor. Las fotos usan enlaces firmados. Requiere las funciones y migraciones web Visor QR del 29/09/2026 ya desplegadas en el backend compartido.

Las cuentas creadas en la web y en el móvil sirven en ambos sistemas. Las cuentas anteriores deben utilizar el nombre guardado en `jewelry_profiles.username`; no se convierte automáticamente el correo en usuario. No se solicita correo ni confirmación por correo. El proyecto compartido requiere la migración web 2.1, la función `username-auth` desplegada y Confirm email desactivado, ya configurados en producción.

La app establece la sesión con los tokens devueltos por Supabase y conserva el almacenamiento seguro, la renovación de tokens y el cierre de sesión. Consulta el perfil persistido para mostrar el usuario y sus permisos. Los colaboradores ven precios y pueden comprar por QR. Los administradores y vendedores ven «Venta por QR» y «Vender joya». Los clientes ven «Compra por QR» y «Comprar joya». La migración móvil del 28/09/2026 autoriza por el rol persistido y ya no requiere la lista adicional `mobile_sales_staff`. El registro público no permite crear administradores.

Para ver esta actualización, recarga el proyecto en Expo o genera e instala una nueva compilación nativa. Cambiar el código local no actualiza una APK instalada.

## Compras con tipo de pago

La migración de compras fue aplicada al Supabase de esta app el 18/09/2026 y se habilitó la cuenta de inventario existente. La nueva interfaz requiere recargar Expo Go o reconstruir la app instalada. Consulta supabase/VENTAS.md para los campos del registro y la futura exportación.

## Activar las ventas en otra instalación (necesario una sola vez)

1. En el proyecto Supabase existente, ejecuta `supabase/migrations/202609180001_payment_sales.sql` mediante SQL Editor o tu proceso de migraciones. Requiere las tablas existentes `jewelry_products` y `jewelry_certificates` y la migración de certificados del sistema web. No recrees las tablas del inventario.
2. Aplicar las migraciones del proyecto web hasta `20260928010000_seller_sales.sql` y desplegar `username-auth` actualizado.
3. Aplicar `supabase/migrations/20260928020000_mobile_seller_sales.sql` (también versionada en el proyecto web, se ejecuta una sola vez sobre la base compartida). Habilita compras/ventas por rol; conserva precio de catálogo, certificado, versión, stock e idempotencia.

## Flujo

- Login con nombre de usuario y contraseña, registro de colaboradores y vendedores, mostrar/ocultar contraseña, sesión cifrada en Keychain/Keystore y actualización de tokens según el estado de la app.
- Cierre de sesión del dispositivo mediante Supabase. Si falla la revocación se muestra un error y se permite reintentar.
- Inventario de solo lectura con búsqueda, precios BOB para los tres roles, existencias y actualización manual / al volver a la app.
- **QR:** abre automáticamente el certificado completo con la plantilla guardada (Amatista o Bolivianita), fotografía, campos, QR y barras. «Continuar con la operación» vuelve a los datos de compra/venta y al pago. Escanear no descuenta stock.
- **Código de barras:** cámara en modo CODE128 o lector óptico USB/Bluetooth en modo teclado. El código de 14 dígitos se busca en `jewelry_certificates.barcode_value`, conservando ceros iniciales, y muestra nombre del producto, precio y cantidad (1 unidad), además del stock.
- **Lector óptico:** emparejar/conectar al teléfono, tocar «Ingreso manual o lector óptico», escanear con sufijo Enter o pulsar «Consultar código». No requiere un SDK propietario ni acceso a la cámara. Lectores con protocolos exclusivos necesitan una integración adicional.
- **Ver certificado:** disponible también en inventario y en la ficha del producto. El visor permite ampliar con dos dedos y girar el teléfono.
- El enlace QR escaneado nunca se abre: únicamente se extrae el UUID y se consulta el Supabase configurado. Se conserva su texto para dibujar el mismo QR en el certificado. Para certificados abiertos desde inventario, `VITE_CERTIFICATE_BASE_URL` puede configurar el origen del sistema web; si no existe, el QR contiene el UUID, compatible con esta app.
- Solo confirmar **Comprar joya** o **Vender joya**, después de seleccionar un pago, descuenta una unidad al precio consultado.
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

La actualización de acceso pasó la comprobación TypeScript, las pruebas automatizadas y la exportación Hermes para Android/iOS. También se comprobó el código móvil contra Supabase: registro de colaborador, inventario con precios, login por usuario, renovación y cierre de sesión. La cuenta temporal fue eliminada. Esto no sustituye la comprobación visual y del almacenamiento seguro en un teléfono físico.

`node --import tsx scripts/check-username-auth.ts` permite repetir esa comprobación real de forma explícita. Requiere `SUPABASE_TEST_SERVICE_ROLE_KEY` únicamente en el entorno del operador para eliminar la cuenta temporal; nunca incluir esa clave en `.env`, Expo ni la aplicación distribuida.

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

## Permisos de compra (24/09/2026)

La migración compartida `20260924020000_customer_purchases.sql`, versionada en el repositorio web, habilita los precios y la compra para perfiles colaboradores existentes y nuevos. Debe aplicarse después de la migración web de usuarios 2.1; no volver a ejecutar migraciones históricas para activar este cambio. Mantiene la edición del inventario y los reportes solo para administradores. La operación usa el precio persistido, valida la versión del certificado, exige stock y método de pago y conserva la protección contra reintentos duplicados. `seller_id` identifica a quien confirma la operación, incluido el cliente que compra. El método de pago es un registro; no hay pasarela ni cobro automático.

## Plantillas del certificado y verificación visual

El visor utiliza `react-native-webview` con HTML local y `src/certificate-assets.json`: plantillas JPEG, CSS, fuentes Roboto Mono y codificadores QR/CODE128 del sistema web. No carga páginas ni scripts remotos; la fotografía procede del Storage configurado. Para actualizar las plantillas desde el repositorio web vecino:

`node scripts/sync-certificate-assets.mjs`

El archivo generado está versionado: compilar la app no requiere el repositorio web. Para revisar ambas plantillas con datos ficticios: `node --import tsx scripts/preview-certificate.ts`, abrir localhost:4177 y /bolivianita.

La cámara y el lector físico requieren una prueba en el dispositivo final. La exportación de Expo verifica los paquetes Android/iOS; no instala una APK. El nuevo módulo WebView requiere reconstruir clientes de desarrollo o APK existentes (o recargar en Expo Go compatible).

La prueba SQL explícita `tests/mobile-seller.production.sql` comprueba venta de vendedor y reintento usando datos temporales y ROLLBACK. Nunca utiliza productos reales.
