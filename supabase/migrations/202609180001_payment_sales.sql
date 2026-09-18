-- Puede ejecutarse sobre la versión anterior o como primera instalación móvil.
-- Requiere jewelry_products y jewelry_certificates del sistema web.
begin;
create table if not exists public.mobile_sales_staff (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.mobile_sales_staff enable row level security;
revoke all on public.mobile_sales_staff from anon, authenticated;

create table if not exists public.jewelry_mobile_sales (
 request_id uuid primary key,
 jewelry_id uuid not null,
 seller_id uuid not null,
 description text not null,
 certificate_barcode text not null,
 quantity integer not null default 1 check (quantity = 1),
 unit_price numeric not null check (unit_price >= 0),
 stock_after integer not null check (stock_after >= 0),
 created_at timestamptz not null default clock_timestamp()
);
-- No inventar el método de pago de registros históricos: permanecen NULL.
alter table public.jewelry_mobile_sales add column if not exists payment_method text;
alter table public.jewelry_mobile_sales add column if not exists currency text not null default 'BOB';
alter table public.jewelry_mobile_sales add column if not exists total_amount numeric
 generated always as (quantity * unit_price) stored;
alter table public.jewelry_mobile_sales drop constraint if exists jewelry_mobile_sales_payment_method_check;
alter table public.jewelry_mobile_sales add constraint jewelry_mobile_sales_payment_method_check
 check (payment_method in ('efectivo', 'qr', 'tarjeta_credito', 'transferencia_bancaria'));
alter table public.jewelry_mobile_sales enable row level security;
revoke all on public.jewelry_mobile_sales from anon, authenticated;
grant select on public.jewelry_mobile_sales to authenticated;
drop policy if exists "seller reads own mobile sales" on public.jewelry_mobile_sales;
create policy "seller reads own mobile sales" on public.jewelry_mobile_sales
 for select to authenticated using (seller_id = (select auth.uid()));

-- Clientes antiguos no pueden registrar una compra nueva sin seleccionar pago.
create or replace function public.register_certificate_sale(
 p_request_id uuid, p_jewelry_id uuid, p_expected_price numeric, p_certificate_version integer
) returns setof public.jewelry_mobile_sales
language plpgsql security definer set search_path = '' as $$
begin
 raise exception using errcode = '22023', message = 'Actualiza la aplicación y selecciona el tipo de pago para comprar.';
end;
$$;
revoke all on function public.register_certificate_sale(uuid,uuid,numeric,integer) from public, anon;
grant execute on function public.register_certificate_sale(uuid,uuid,numeric,integer) to authenticated;

create or replace function public.register_certificate_sale(
 p_request_id uuid, p_jewelry_id uuid, p_expected_price numeric, p_certificate_version integer, p_payment_method text
) returns setof public.jewelry_mobile_sales
language plpgsql security definer set search_path = '' as $$
declare
 v_user uuid := auth.uid();
 v_product public.jewelry_products%rowtype;
 v_certificate public.jewelry_certificates%rowtype;
 v_sale public.jewelry_mobile_sales%rowtype;
begin
 if v_user is null or not exists (select 1 from public.mobile_sales_staff where user_id = v_user) then
  raise exception using errcode = '42501', message = 'No tienes permiso para registrar compras. Solicita acceso al administrador.';
 end if;
 if p_request_id is null or p_jewelry_id is null or p_expected_price is null or p_certificate_version is null then
  raise exception using errcode = '22023', message = 'Faltan datos de la compra.';
 end if;
 if p_payment_method is null or p_payment_method not in ('efectivo','qr','tarjeta_credito','transferencia_bancaria') then
  raise exception using errcode = '22023', message = 'Selecciona un tipo de pago válido.';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
 select * into v_sale from public.jewelry_mobile_sales where request_id = p_request_id;
 if found then
  if v_sale.seller_id <> v_user or v_sale.jewelry_id <> p_jewelry_id
   or v_sale.unit_price <> p_expected_price
   or (v_sale.payment_method is not null and v_sale.payment_method <> p_payment_method) then
   raise exception using errcode = '22023', message = 'El comprobante pertenece a otra compra o tiene un tipo de pago distinto.';
  end if;
  -- Una venta histórica conserva su pago NULL; no se cobra ni descuenta de nuevo.
  return next v_sale; return;
 end if;
 select * into v_product from public.jewelry_products where id = p_jewelry_id for update;
 if not found then raise exception using errcode = 'P0001', message = 'El producto ya no existe.'; end if;
 select * into v_certificate from public.jewelry_certificates where jewelry_id = p_jewelry_id for share;
 if not found then raise exception using errcode = 'P0001', message = 'El certificado ya no existe.'; end if;
 if v_certificate.version <> p_certificate_version or v_product.price <> p_expected_price then
  raise exception using errcode = 'P0001', message = 'El producto o certificado cambió. Escanéalo de nuevo.';
 end if;
 if v_product.stock is null or v_product.stock < 1 then
  raise exception using errcode = 'P0001', message = 'Producto agotado.';
 end if;
 update public.jewelry_products set stock=stock-1, updated_at=clock_timestamp() where id=p_jewelry_id;
 insert into public.jewelry_mobile_sales(
  request_id,jewelry_id,seller_id,description,certificate_barcode,quantity,unit_price,
  stock_after,payment_method,currency,created_at
 ) values (
  p_request_id,p_jewelry_id,v_user,v_product.description,v_certificate.barcode_value,1,v_product.price,
  v_product.stock-1,p_payment_method,'BOB',clock_timestamp()
 ) returning * into v_sale;
 return next v_sale;
end;
$$;
revoke all on function public.register_certificate_sale(uuid,uuid,numeric,integer,text) from public, anon;
grant execute on function public.register_certificate_sale(uuid,uuid,numeric,integer,text) to authenticated;

-- Consulta preparada para una futura exportación; respeta el RLS de la tabla.
create or replace view public.jewelry_sales_export with (security_invoker=true) as
 select request_id as sale_id, jewelry_id as product_id, seller_id, quantity,
  payment_method, created_at as sold_at_utc,
  created_at at time zone 'America/La_Paz' as sold_at_bolivia,
  description, unit_price, total_amount, currency, stock_after, certificate_barcode
 from public.jewelry_mobile_sales;
revoke all on public.jewelry_sales_export from anon, authenticated;
grant select on public.jewelry_sales_export to authenticated;
notify pgrst, 'reload schema';
commit;