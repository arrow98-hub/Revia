-- Pruebas de aislamiento multi-tenant. Ejecutar sobre una BD de pruebas (NUNCA producción).
-- Devuelve "OK: ..." por cada comprobación; cualquier fallo aborta con excepción.
begin;
insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-00000000000a','a@test.com'),
 ('00000000-0000-0000-0000-00000000000b','b@test.com'),
 ('00000000-0000-0000-0000-0000000000ad','admin@test.com');
update public.profiles set code_prefix='JADO', first_name='Jane', last_name='Doe', onboarded_at=now() where email='a@test.com';
update public.profiles set code_prefix='JOSM', first_name='John', last_name='Smith', onboarded_at=now() where email='b@test.com';
update public.profiles set code_prefix='ADMI', role='admin', onboarded_at=now() where email='admin@test.com';

-- ── Usuario A crea proveedor y 2 productos
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a', true);
insert into public.providers(id,name) values ('10000000-0000-0000-0000-00000000000a','Proveedor A');
insert into public.products(name,provider_id,expected_arrival_date,review_days,review_types)
  values ('Lámpara','10000000-0000-0000-0000-00000000000a','2026-11-20',7,'{stars,photos}');
insert into public.products(name,provider_id,expected_arrival_date,requires_review)
  values ('Sin review','10000000-0000-0000-0000-00000000000a','2026-11-21',false);
do $$ begin
  if (select string_agg(code, ',' order by code) from public.products) <> 'JADO-00001,JADO-00002' then
    raise exception 'FALLO códigos A: %', (select string_agg(code, ',') from public.products); end if;
  raise notice 'OK: códigos de A son JADO-00001 y JADO-00002';
end $$;

-- A no puede cambiar su rol ni su contador
update public.profiles set role='admin', product_seq=999, code_prefix='ZZZZ' where id=auth.uid();
do $$ begin
  if (select role from public.profiles where id=auth.uid())<>'user' or (select product_seq from public.profiles where id=auth.uid())<>2
     or (select code_prefix from public.profiles where id=auth.uid())<>'JADO' then raise exception 'FALLO: A cambió columnas protegidas'; end if;
  raise notice 'OK: A no puede cambiar rol, contador ni prefijo';
end $$;

-- ── Usuario B: su primer producto también es 00001 y no ve nada de A
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b', true);
do $$ begin
  if (select count(*) from public.products)<>0 then raise exception 'FALLO: B ve productos de A'; end if;
  if (select count(*) from public.providers)<>0 then raise exception 'FALLO: B ve proveedores de A'; end if;
  if (select count(*) from public.profiles)<>1 then raise exception 'FALLO: B ve perfiles ajenos'; end if;
  raise notice 'OK: B no ve datos de A';
end $$;
insert into public.providers(id,name) values ('10000000-0000-0000-0000-00000000000b','Proveedor A');  -- mismo nombre permitido entre usuarios
insert into public.products(name,provider_id,expected_arrival_date,review_days)
  values ('Producto B','10000000-0000-0000-0000-00000000000b','2026-11-20',3);
do $$ begin
  if (select code from public.products)<>'JOSM-00001' then raise exception 'FALLO código B'; end if;
  raise notice 'OK: primer producto de B es JOSM-00001';
end $$;

-- B no puede modificar productos de A (0 filas afectadas)
update public.products set name='hack' where user_id='00000000-0000-0000-0000-00000000000a';
-- B no puede usar el proveedor de A
do $$ begin
  begin
    insert into public.products(name,provider_id,expected_arrival_date,review_days)
      values ('x','10000000-0000-0000-0000-00000000000a','2026-11-20',3);
    raise exception 'FALLO: B usó proveedor de A';
  exception when insufficient_privilege then raise notice 'OK: B no puede usar el proveedor de A';
  end;
end $$;
-- B no puede insertar a nombre de A
do $$ begin
  begin
    insert into public.providers(user_id,name) values ('00000000-0000-0000-0000-00000000000a','intruso');
    raise exception 'FALLO: B insertó a nombre de A';
  exception when insufficient_privilege then raise notice 'OK: B no puede insertar a nombre de A';
  end;
end $$;
-- Nadie puede borrar físicamente
do $$ begin
  begin
    delete from public.products;
    raise exception 'FALLO: DELETE permitido';
  exception when insufficient_privilege then raise notice 'OK: DELETE físico bloqueado';
  end;
end $$;
-- Storage: B no puede subir en la carpeta de A
do $$ begin
  begin
    insert into storage.objects(bucket_id,name) values ('product-photos','00000000-0000-0000-0000-00000000000a/p/arrival/x.webp');
    raise exception 'FALLO: B subió foto en carpeta de A';
  exception when insufficient_privilege then raise notice 'OK: B no puede subir fotos en la carpeta de A';
  end;
end $$;

-- ── Admin: lee todo, no escribe lo ajeno
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000ad', true);
do $$ begin
  if (select count(*) from public.products)<>3 then raise exception 'FALLO: admin no ve todo (%)', (select count(*) from public.products); end if;
  raise notice 'OK: admin ve los productos de todos';
end $$;
update public.products set name='admin edit';
do $$ begin
  if exists(select 1 from public.products where name='admin edit') then raise exception 'FALLO: admin editó datos ajenos'; end if;
  raise notice 'OK: admin no puede editar datos ajenos';
end $$;

-- ── Columna generada de vencimiento
reset role;
update public.products set status='received', arrived_on='2026-11-22' where code='JADO-00001';
do $$ begin
  if (select review_due_date from public.products where code='JADO-00001')<>'2026-11-29' then raise exception 'FALLO vencimiento'; end if;
  if (select code from public.products where code='JADO-00001') is null then raise exception 'x'; end if;
  raise notice 'OK: vencimiento = llegada + 7 días (2026-11-29)';
end $$;
-- "Sin review" no puede tener días
do $$ begin
  begin
    update public.products set review_days=5 where name='Sin review';
    raise exception 'FALLO: sin review aceptó días';
  exception when check_violation then raise notice 'OK: producto sin review no acepta días';
  end;
end $$;
rollback;
