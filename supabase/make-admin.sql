-- Convierte tu cuenta en administradora (ver datos de todos, solo lectura).
-- Ejecuta en Supabase → SQL Editor reemplazando el correo.
update public.profiles set role = 'admin' where email = '<<tu-correo@ejemplo.com>>';
