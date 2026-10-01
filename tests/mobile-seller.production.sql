-- Explicit deployment smoke test. Every fixture and stock movement is rolled back.
begin;
do $$
declare
 seller uuid := gen_random_uuid();
 product uuid := gen_random_uuid();
 request uuid := gen_random_uuid();
 receipt public.jewelry_mobile_sales%rowtype;
begin
 insert into auth.users(id,raw_app_meta_data) values(seller,jsonb_build_object('jewelry_role','seller'));
 if not exists(select 1 from public.jewelry_profiles where id=seller and role='seller') then
  raise exception 'Seller signup failed';
 end if;
 insert into public.jewelry_products(id,description,price,stock) values(product,'QA venta móvil temporal',250,2);
 insert into public.jewelry_certificates(jewelry_id,description,image_path,gemstone,metal,cut)
 values(product,'QA certificado temporal',product::text || '/dddddddd-dddd-4ddd-8ddd-dddddddddddd.webp','Bolivianita','Oro','Oval');
 perform set_config('request.jwt.claim.sub',seller::text,true);
 select * into receipt from public.register_certificate_sale(request,product,250,1,'qr');
 if receipt.seller_id <> seller or receipt.stock_after <> 1 or receipt.payment_method <> 'qr' then
  raise exception 'Seller receipt failed';
 end if;
 perform * from public.register_certificate_sale(request,product,250,1,'qr');
 if (select stock from public.jewelry_products where id=product) <> 1 then
  raise exception 'Retry deducted stock twice';
 end if;
end $$;
rollback;
