-- ════════════════════════════════════════════════════════════════
-- Revia · Migración inicial
-- Multi-tenant: cada fila pertenece a un user_id y RLS lo aísla.
-- ════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ─── Enums ───────────────────────────────────────────────────────
create type public.contact_channel as enum ('messenger','instagram','whatsapp');
create type public.store_kind      as enum ('amazon','walmart','tiktok','temu','other');
create type public.review_type     as enum ('stars','comment','photos','video');
create type public.product_status  as enum ('in_transit','delayed','received','completed','cancelled','returned');
create type public.photo_kind      as enum ('arrival','review');
create type public.user_role       as enum ('user','admin');

-- ─── Utilidad: updated_at ───────────────────────────────────────
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ─── profiles ────────────────────────────────────────────────────
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  first_name    text,
  last_name     text,
  code_prefix   char(4) check (code_prefix ~ '^[A-Z]{4}$'),
  product_seq   integer not null default 0,
  timezone      text not null default 'America/New_York',
  role          public.user_role not null default 'user',
  onboarded_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Crea el perfil automáticamente al crear el usuario en Auth
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ¿El usuario actual es admin? (security definer para evitar recursión de RLS)
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Protege columnas sensibles del perfil frente al propio usuario
create or replace function public.protect_profile_columns() returns trigger
language plpgsql as $$
begin
  -- Solo restringe a los usuarios finales; service_role y funciones internas pueden escribir
  if current_user in ('authenticated', 'anon') then
    new.role        := old.role;
    new.product_seq := old.product_seq;
    new.email       := old.email;
    -- El prefijo solo se puede fijar una vez (onboarding) y luego es inmutable
    if old.code_prefix is not null then
      new.code_prefix := old.code_prefix;
    end if;
  end if;
  return new;
end $$;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ─── providers (CRM) ─────────────────────────────────────────────
create table public.providers (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name             text not null check (length(trim(name)) between 1 and 120),
  contact_channel  public.contact_channel,
  contact_handle   text check (contact_handle is null or length(contact_handle) <= 120),
  notes            text check (notes is null or length(notes) <= 2000),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);
create unique index providers_user_name_uq on public.providers (user_id, lower(trim(name)));
create index providers_user_idx on public.providers (user_id);
create trigger providers_updated_at before update on public.providers
  for each row execute function public.set_updated_at();

-- ─── products ────────────────────────────────────────────────────
create table public.products (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  code                   text not null default '',
  name                   text not null check (length(trim(name)) between 1 and 200),
  provider_id            uuid not null references public.providers(id),
  contact_channel        public.contact_channel,
  store                  public.store_kind not null default 'amazon',
  store_other            text check (store_other is null or length(store_other) <= 60),
  url                    text check (url is null or (url ~* '^https?://' and length(url) <= 2048)),
  image_url              text,
  requires_review        boolean not null default true,
  review_types           public.review_type[] not null default '{}',
  review_days            smallint,
  status                 public.product_status not null default 'in_transit',
  registered_at          timestamptz not null default now(),
  expected_arrival_date  date not null,
  arrived_on             date,
  review_due_date        date generated always as (
                           case when requires_review and arrived_on is not null and review_days is not null
                                then arrived_on + review_days::integer end
                         ) stored,
  reviewed_on            date,
  notes                  text check (notes is null or length(notes) <= 4000),
  deleted_at             timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  constraint products_review_consistency
    check (requires_review or (review_days is null and review_types = '{}')),
  constraint products_review_days_range
    check (not requires_review or (review_days between 1 and 90)),
  constraint products_store_other
    check (store <> 'other' or (store_other is not null and length(trim(store_other)) > 0)),
  constraint products_arrival_required
    check (status not in ('received','completed','returned') or arrived_on is not null)
);
create unique index products_user_code_uq on public.products (user_id, code);
create index products_user_status_idx on public.products (user_id, status) where deleted_at is null;
create index products_user_expected_idx on public.products (user_id, expected_arrival_date) where deleted_at is null;
create index products_user_due_idx on public.products (user_id, review_due_date) where deleted_at is null;
create index products_provider_idx on public.products (provider_id);
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

-- Asigna el código legible por usuario: PREFIJO-00001 (contador propio de cada usuario)
create or replace function public.assign_product_code() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_prefix text;
  v_seq    integer;
begin
  update public.profiles
     set product_seq = product_seq + 1
   where id = new.user_id
  returning code_prefix, product_seq into v_prefix, v_seq;

  if v_prefix is null then
    raise exception 'El perfil no tiene prefijo de código; completa la bienvenida primero'
      using errcode = 'P0001';
  end if;

  new.code := v_prefix || '-' || lpad(v_seq::text, 5, '0');
  new.registered_at := now();
  return new;
end $$;
create trigger products_assign_code before insert on public.products
  for each row execute function public.assign_product_code();

-- El código, el dueño y la fecha de registro nunca cambian
create or replace function public.protect_product_columns() returns trigger
language plpgsql as $$
begin
  new.code := old.code;
  new.user_id := old.user_id;
  new.registered_at := old.registered_at;
  return new;
end $$;
create trigger products_protect before update on public.products
  for each row execute function public.protect_product_columns();

-- El proveedor debe pertenecer al mismo usuario
create or replace function public.check_product_provider_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.providers p where p.id = new.provider_id and p.user_id = new.user_id) then
    raise exception 'Proveedor no válido' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger products_provider_owner before insert or update of provider_id on public.products
  for each row execute function public.check_product_provider_owner();

-- ─── product_events (historial) ─────────────────────────────────
create table public.product_events (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  type        text not null check (type in (
                'created','expected_date_changed','marked_delayed','arrived','arrival_undone',
                'review_done','review_undone','edited','cancelled','returned','trashed','restored','reactivated')),
  payload     jsonb not null default '{}'::jsonb,
  note        text check (note is null or length(note) <= 2000),
  created_at  timestamptz not null default now()
);
create index product_events_product_idx on public.product_events (product_id, created_at);

-- ─── product_photos ─────────────────────────────────────────────
create table public.product_photos (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete cascade,
  user_id       uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  kind          public.photo_kind not null,
  storage_path  text not null,
  width         integer,
  height        integer,
  bytes         integer,
  created_at    timestamptz not null default now(),
  constraint product_photos_path_owner check (split_part(storage_path, '/', 1) = user_id::text)
);
create index product_photos_product_idx on public.product_photos (product_id, kind);

-- Fotos y eventos deben pertenecer a un producto del mismo usuario
create or replace function public.check_child_product_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.products p where p.id = new.product_id and p.user_id = new.user_id) then
    raise exception 'Producto no válido' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger product_events_owner before insert on public.product_events
  for each row execute function public.check_child_product_owner();
create trigger product_photos_owner before insert on public.product_photos
  for each row execute function public.check_child_product_owner();

-- ─── push_subscriptions ─────────────────────────────────────────
create table public.push_subscriptions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  endpoint         text not null unique,
  p256dh           text not null,
  auth             text not null,
  user_agent       text,
  created_at       timestamptz not null default now(),
  last_success_at  timestamptz
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- ─── notification_log (evita duplicados) ────────────────────────
create table public.notification_log (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  local_date  date not null,
  kind        text not null,
  sent_at     timestamptz not null default now(),
  primary key (user_id, local_date, kind)
);

-- ─── Seguridad de inicio de sesión (solo service_role) ──────────
create table public.login_challenges (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  email        text not null,
  code_hash    text not null,
  expires_at   timestamptz not null,
  attempts     smallint not null default 0,
  consumed_at  timestamptz,
  ip           text,
  created_at   timestamptz not null default now()
);
create index login_challenges_user_idx on public.login_challenges (user_id, created_at desc);

create table public.login_attempts (
  id          bigserial primary key,
  email       text not null,
  ip          text,
  success     boolean not null,
  created_at  timestamptz not null default now()
);
create index login_attempts_email_idx on public.login_attempts (lower(email), created_at desc);

create table public.user_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  verified_at  timestamptz not null default now(),
  expires_at   timestamptz not null,
  user_agent   text,
  revoked_at   timestamptz
);
create index user_sessions_user_idx on public.user_sessions (user_id, verified_at desc);

-- ════════════════════════════════════════════════════════════════
-- RLS
-- ════════════════════════════════════════════════════════════════
alter table public.profiles            enable row level security;
alter table public.providers           enable row level security;
alter table public.products            enable row level security;
alter table public.product_events      enable row level security;
alter table public.product_photos      enable row level security;
alter table public.push_subscriptions  enable row level security;
alter table public.notification_log    enable row level security;
alter table public.login_challenges    enable row level security;  -- sin políticas: solo service_role
alter table public.login_attempts      enable row level security;  -- sin políticas: solo service_role
alter table public.user_sessions       enable row level security;

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- providers / products / product_events / product_photos: dueño escribe, dueño+admin leen
create policy providers_select on public.providers for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy providers_insert on public.providers for insert to authenticated
  with check (user_id = auth.uid());
create policy providers_update on public.providers for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy products_select on public.products for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy products_insert on public.products for insert to authenticated
  with check (user_id = auth.uid());
create policy products_update on public.products for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy product_events_select on public.product_events for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy product_events_insert on public.product_events for insert to authenticated
  with check (user_id = auth.uid());

create policy product_photos_select on public.product_photos for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy product_photos_insert on public.product_photos for insert to authenticated
  with check (user_id = auth.uid());
create policy product_photos_delete on public.product_photos for delete to authenticated
  using (user_id = auth.uid());

create policy push_select on public.push_subscriptions for select to authenticated
  using (user_id = auth.uid());
create policy push_insert on public.push_subscriptions for insert to authenticated
  with check (user_id = auth.uid());
create policy push_update on public.push_subscriptions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy push_delete on public.push_subscriptions for delete to authenticated
  using (user_id = auth.uid());

create policy user_sessions_select on public.user_sessions for select to authenticated
  using (user_id = auth.uid());

-- Sin DELETE en products/providers/events: nada se borra físicamente desde la app.
revoke delete on public.products, public.providers, public.product_events from authenticated, anon;
revoke all on public.login_challenges, public.login_attempts from authenticated, anon;

-- ════════════════════════════════════════════════════════════════
-- Storage: bucket privado de fotos
-- Ruta: {user_id}/{product_id}/{arrival|review}/{uuid}.webp
-- ════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-photos', 'product-photos', false, 5242880, array['image/webp','image/jpeg','image/png'])
on conflict (id) do nothing;

create policy photos_owner_read on storage.objects for select to authenticated
  using (bucket_id = 'product-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy photos_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'product-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy photos_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'product-photos' and (storage.foldername(name))[1] = auth.uid()::text);
