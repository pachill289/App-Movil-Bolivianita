begin;
-- Execute after the web certificate migration. Only explicitly authorized staff may sell.
create table public.mobile_sales_staff (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.mobile_sales_staff enable row level security;
revoke all on public.mobile_sales_staff from anon, authenticated;
create table public.jewelry_mobile_sales (
 request_id uuid primary key,
 jewelry_id uuid not null,
 seller_id uuid not null,
 description text not null,
 certificate_barcode text not null,
 quantity integer not null default 1 check (quantity = 1),
 unit_price numeric not null check (unit_price >= 0),
 stock_after integer not null check (stock_after >= 0),
 created_at timestamptz not null default now()
);
alter table public.jewelry_mobile_sales enable row level security;
revoke all on public.jewelry_mobile_sales from anon, authenticated;
grant select on public.jewelry_mobile_sales to authenticated;
create policy "seller reads own mobile sales" on public.jewelry_mobile_sales
 for select to authenticated using (seller_id = (select auth.uid()));
create function public.register_certificate_sale(
 p_request_id uuid, p_jewelry_id uuid, p_expected_price numeric, p_certificate_version integer
) returns setof public.jewelry_mobile_sales
language plpgsql security definer set search_path = '' as $$
declare
 v_user uuid := auth.uid();
 v_product public.jewelry_products%rowtype;
 v_certificate public.jewelry_certificates%rowtype;
 v_sale public.jewelry_mobile_sales%rowtype;
begin
 if v_user is null or not exists (select 1 from public.mobile_sales_staff where user_id = v_user) then
  raise exception using errcode = '42501', message = 'No tienes permiso para registrar ventas móviles.';
 end if;
 if p_request_id is null or p_jewelry_id is null or p_expected_price is null or p_certificate_version is null then
  raise exception using errcode = '22023', message = 'Faltan datos de la venta.';
 end if;
 -- Serialize retries even when separate devices use the same operation UUID.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text, 0));
 select * into v_sale from public.jewelry_mobile_sales where request_id = p_request_id;
 if found then
  if v_sale.seller_id <> v_user or v_sale.jewelry_id <> p_jewelry_id then
   raise exception using errcode = '22023', message = 'La operación pertenece a otra venta.';
  end if;
  return next v_sale; return;
 end if;
 select * into v_product from public.jewelry_products where id = p_jewelry_id for update;
 if not found then raise exception using errcode = 'P0001', message = 'El producto ya no existe.'; end if;
 select * into v_certificate from public.jewelry_certificates where jewelry_id = p_jewelry_id for share;
 if not found then raise exception using errcode = 'P0001', message = 'El certificado ya no existe.'; end if;
 if v_certificate.version <> p_certificate_version or v_product.price <> p_expected_price then
  raise exception using errcode = 'P0001', message = 'El producto o certificado cambió. Escanéalo de nuevo.';
 end if;
 if v_product.stock < 1 then raise exception using errcode = 'P0001', message = 'Producto agotado.'; end if;
 update public.jewelry_products set stock = stock - 1, updated_at = now() where id = p_jewelry_id;
 insert into public.jewelry_mobile_sales(request_id,jewelry_id,seller_id,description,certificate_barcode,unit_price,stock_after)
 values(p_request_id,p_jewelry_id,v_user,v_product.description,v_certificate.barcode_value,v_product.price,v_product.stock-1)
 returning * into v_sale;
 return next v_sale;
end;
$$;
revoke all on function public.register_certificate_sale(uuid,uuid,numeric,integer) from public, anon;
grant execute on function public.register_certificate_sale(uuid,uuid,numeric,integer) to authenticated;
commit;
-- Authorize a specific existing staff member separately in SQL Editor:
-- insert into public.mobile_sales_staff(user_id)
-- select id from auth.users where email = 'VENDEDOR@EMPRESA.COM' on conflict do nothing;