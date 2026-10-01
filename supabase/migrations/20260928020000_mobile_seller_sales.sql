-- Mobile QR / barcode transactions use persisted roles and catalog price.
begin;
create or replace function public.jewelry_internal_register_sale(
 p_request_id uuid, p_jewelry_id uuid, p_expected_price numeric, p_certificate_version integer, p_payment_method text
) returns setof public.jewelry_mobile_sales
language plpgsql security definer set search_path = '' as $$
declare
 v_user uuid := auth.uid();
 v_product public.jewelry_products%rowtype;
 v_certificate public.jewelry_certificates%rowtype;
 v_sale public.jewelry_mobile_sales%rowtype;
begin
 if v_user is null or not exists (
  select 1 from public.jewelry_profiles p where p.id = v_user
  and p.role in ('collaborator', 'admin', 'seller')
 ) then
  raise exception using errcode = '42501', message = 'No tienes permiso para registrar operaciones. Solicita acceso al administrador.';
 end if;
 if p_request_id is null or p_jewelry_id is null or p_expected_price is null or p_certificate_version is null then
  raise exception using errcode = '22023', message = 'Faltan datos de la operación.';
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
   raise exception using errcode = '22023', message = 'El comprobante pertenece a otra operación o tiene un tipo de pago distinto.';
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

revoke all on function public.jewelry_internal_register_sale(uuid,uuid,numeric,integer,text) from public, anon, authenticated;

notify pgrst,'reload schema';
commit;
