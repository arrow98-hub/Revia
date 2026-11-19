-- ════════════════════════════════════════════════════════════════
-- Revia · Aviso diario de las 8:00 a. m.
-- Ejecutar UNA vez en Supabase → SQL Editor, DESPUÉS de desplegar en Vercel.
-- Reemplaza los dos valores marcados con <<…>>.
-- ════════════════════════════════════════════════════════════════
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Cada 15 minutos; la app decide a quién le toca (8:00 en su zona horaria)
-- y nunca envía más de un aviso al día por persona.
select cron.schedule(
  'revia-daily-digest',
  '*/15 * * * *',
  $$
  select net.http_post(
    url     := 'https://<<TU-APP>>.vercel.app/api/cron/daily-digest',
    headers := jsonb_build_object('Authorization', 'Bearer <<TU_CRON_SECRET>>', 'Content-Type', 'application/json'),
    body    := '{}'::jsonb
  );
  $$
);

-- Para revisar:   select * from cron.job;
--                 select * from cron.job_run_details order by start_time desc limit 10;
-- Para quitarlo:  select cron.unschedule('revia-daily-digest');
