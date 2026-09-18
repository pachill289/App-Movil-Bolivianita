# Compras y registro de ventas

## Flujo de la app

1. Escanear el certificado y consultar la joya.
2. Pulsar **Comprar** abre una ventana emergente.
3. Seleccionar **Efectivo**, **QR**, **Tarjeta de crédito** o **Transferencia bancaria**. No hay selección predeterminada.
4. Pulsar **Comprar** en la ventana registra una unidad y descuenta el stock. Cancelar no modifica nada.
5. Se muestra comprobante, tipo de pago, total, fecha en Bolivia y stock después de esa compra.

El tipo de pago se registra como dato de la operación; no se integra una pasarela de cobro. Un reintento usa el mismo comprobante y tipo de pago. Una compra nueva necesita una selección nueva.

## Migración

`migrations/202609180001_payment_sales.sql` sirve tanto para una instalación sin ventas móviles como para actualizar la versión anterior. Se puede volver a ejecutar sin borrar compras. Requiere las tablas del sistema web.

Aplicada el 18/09/2026 al proyecto configurado en `.env` mediante SQL Editor; cuenta existente autorizada en `mobile_sales_staff`. No se realizaron compras reales durante el despliegue.

Para autorizar otra cuenta existente, el administrador ejecuta:

```sql
insert into public.mobile_sales_staff(user_id)
select id from auth.users where email = 'CORREO_DEL_VENDEDOR'
on conflict do nothing;
```

No habilitar usuarios ajenos al personal del inventario. Los clientes no pueden insertar, editar ni borrar registros de ventas directamente; la RPC comprueba los permisos y el stock.

## Tabla `public.jewelry_mobile_sales`

| Campo | Contenido |
| --- | --- |
| request_id | UUID único del comprobante; clave para evitar duplicados |
| jewelry_id | ID del producto vendido |
| seller_id | Usuario que registró la operación |
| quantity | Cantidad vendida; actualmente 1 por compra |
| payment_method | efectivo, qr, tarjeta_credito o transferencia_bancaria |
| created_at | Fecha y hora exactas asignadas por PostgreSQL, con zona horaria |
| description | Descripción de la joya al comprar |
| unit_price | Precio unitario al comprar |
| total_amount | Cantidad × precio, calculado por PostgreSQL |
| currency | BOB |
| stock_after | Stock resultante de esa operación |
| certificate_barcode | Código del certificado |

Los valores históricos no se actualizan si después se cambia o elimina el producto. Las ventas anteriores sin tipo de pago mantienen NULL: no se inventa un pago retroactivo. Los clientes antiguos sin selector de pago reciben un mensaje para actualizarse.

## Preparación para Google Sheets

La vista `public.jewelry_sales_export` expone `sale_id`, `product_id`, `seller_id`, `quantity`, `payment_method`, `sold_at_utc`, `sold_at_bolivia`, `description`, `unit_price`, `total_amount`, `currency`, `stock_after` y `certificate_barcode`.

`SELECT * FROM public.jewelry_sales_export ORDER BY sold_at_utc, sale_id;`

La vista respeta RLS: cada usuario autenticado sólo ve sus propias ventas. Una integración futura debe ejecutarse en un servidor autorizado y usar `sale_id` para no duplicar filas en Sheets. No se ha conectado Google Sheets ni añadido credenciales de Google a la app.

## Validación

- `pnpm typecheck`
- `pnpm test`: instalación nueva y actualización, cuatro pagos, rechazo de pago vacío/inválido, snapshots de precio/descripción, permisos, reintentos, stock agotado y rollback.
- `pnpm run export`: bundles Android/iOS.
- `node scripts/check-backend.mjs`: comprueba que existe la RPC y deniega el acceso anónimo sin registrar compras.