# CLAUDE.md — Revia

> **Revia** · *Tu central diaria de reviews.*
> PWA (app web instalable) para gestionar productos recibidos de proveedores a cambio de reviews en Amazon, Walmart, TikTok Shop y otras tiendas.
> Este archivo es la fuente de verdad del proyecto. Antes de escribir código, léelo completo. Si una decisión no está aquí, pregunta antes de inventarla.

---

## 0. Reglas de oro (no negociables)

1. **Aislamiento total entre usuarios.** Ningún usuario puede leer ni escribir datos de otro. Toda tabla con datos de usuario lleva `user_id` y **RLS activado**. Nunca se usa la `service_role` key en el cliente.
2. **Móvil primero**, pero se debe ver y usar bien en PC.
3. **Simple antes que completo.** La usuaria principal no es técnica. Ante la duda, menos campos, menos pasos y menos notificaciones.
4. **Nada obligatorio que no sea imprescindible.** Elegir tipos de review, el contacto o las notas nunca da error.
5. **Nada se borra de verdad.** Borrar = enviar a la papelera (soft delete). La papelera nunca se vacía sola.
6. **Toda la UI en español** (es-ES neutro, tuteo: "Agrega", "Confirma"). Código, nombres de tablas y commits en inglés.
7. **Las fechas de llegada y de review son fechas locales** de la zona horaria del usuario, no instantes UTC.
8. **No usamos calendarios externos.** Nada de Google Calendar ni eventos `.ics`. Todo vive dentro de la app.

---

## 1. Producto

### 1.1 Problema
La usuaria recibe casi a diario (5–10 por semana) productos de proveedores que le piden un review a cambio: estrellas, comentario, fotos y/o video. Hoy lo controla en un Excel. Necesita **una pantalla que cada mañana le diga qué hacer hoy**: qué llega, qué review toca y qué se le pasó.

### 1.2 Flujo central
```
Registrar producto (al pedirlo) ──► En camino (fecha estimada de llegada)
        │                                  │
        │                    ┌─────────────┼───────────────┐
        │                    ▼             ▼               ▼
        │              Retrasado      Confirmar llegada   Cancelado
        │          (nueva fecha,      (fecha + fotos)
        │           editable siempre)      │
        │                                  ▼
        │              ┌── ¿Lleva review? ──┐
        │              │ Sí                 │ No
        │              ▼                    ▼
        │     Review pendiente         Completado
        │   (vence = llegada + N días)  (sin review)
        │              │
        │              ▼
        │       Review hecho (+ capturas) ──► Completado
        │
        └── Devuelto (caso raro, disponible desde Recibido/Completado)
```
**El plazo del review empieza el día que llega el producto**, nunca el día en que se pidió.

### 1.3 Usuarios
- Las cuentas las crea **solo el admin** (el dueño del proyecto). No hay registro público en la v1.
- Cada cuenta es **personal e individual**: nada de equipos ni cuentas compartidas.
- Rol `admin`: puede **ver** los datos de todos, filtrar por persona, y no puede modificarlos (ver §5.4).
- Futuro: venta del servicio con pantalla de compra y suscripción (ver §14).

---

## 2. Stack

| Capa | Elección | Notas |
|---|---|---|
| Framework | **Next.js 16 (App Router) + TypeScript estricto** | `cacheComponents` desactivado (render dinámico clásico). El middleware se llama **`src/proxy.ts`** en Next 16. Lee `node_modules/next/dist/docs/` antes de usar APIs nuevas |
| UI | **Tailwind CSS v4** + primitivos propios en `src/components/ui` (Radix Dialog / Dropdown) | Tokens en `src/app/globals.css` (§9) |
| Iconos | **lucide-react** | Trazo 1.75–2. **Prohibido usar emojis como iconos**. Lucide ya no trae marcas: el glifo de Instagram es propio (`components/icons.tsx`) |
| Formularios | Estado controlado + **zod** en las Server Actions | Validación junto al campo; el servidor siempre revalida |
| Mutaciones | **Server Actions** (`src/app/(app)/actions.ts`) + `revalidatePath` + `router.refresh()` | Toasts con "Deshacer" (sonner) |
| Fechas | date-fns + @date-fns/tz | Siempre con la zona horaria del perfil (`lib/domain/dates.ts`) |
| BD / Auth / Archivos | **Supabase** (Postgres, Auth, Storage, pg_cron + pg_net) | Una sola BD multi-tenant con RLS. **Sin Edge Functions**: todo el servidor vive en Next |
| PWA | `public/sw.js` propio + `app/manifest.ts` | Caché del shell, página offline, push, actualización |
| Push | Web Push (VAPID) con `web-push` en `lib/push.ts` | Android Chrome e iOS 16.4+ (instalada) |
| Aviso diario | `pg_cron` (cada 15 min) → `POST /api/cron/daily-digest` con `CRON_SECRET` | `supabase/cron.sql` |
| Miniatura del link | `lib/link-preview.ts` ejecutado con `after()` tras guardar | Best-effort, con protección SSRF |
| Email | **Resend** vía API REST (`lib/email.ts`) | Solo códigos de inicio de sesión. En local sin clave, el código se imprime en consola |
| Imágenes | `browser-image-compression` (`lib/storage/photos.ts`) | Comprime en el cliente antes de subir |
| Exportar | `exceljs` en `GET /api/export` | XLSX (3 hojas) y CSV |
| Hosting | **Vercel**, conectado a GitHub (`main` = producción) | |
| Tests | Vitest (`src/**/*.test.ts`) + `supabase/tests/rls_test.sql` | Playwright e2e: pendiente (requiere proyecto Supabase de pruebas) |

Gestor de paquetes: **pnpm**. Node 20 LTS o superior.

---

## 3. Estructura del proyecto
```
revia/
├─ CLAUDE.md · SETUP.md · CHANGELOG.md · README.md · .env.example
├─ public/                         logo.svg, icons/, sw.js, offline.html
├─ src/
│  ├─ proxy.ts                     Refresco de sesión Supabase + regla de 24 h
│  ├─ app/
│  │  ├─ (auth)/login, login/codigo, bienvenida, actions.ts
│  │  ├─ (app)/                    Layout con barra inferior / sidebar
│  │  │  ├─ page.tsx               Inicio (dashboard)
│  │  │  ├─ calendario/ agregar/ productos/[id]/(editar) proveedores/[id]
│  │  │  ├─ ajustes/ (papelera, novedades)
│  │  │  ├─ admin/ (producto/[id]) Solo rol admin, lectura
│  │  │  └─ actions.ts             Server Actions de productos, fotos, proveedores, perfil, push
│  │  ├─ api/version · api/export · api/cron/daily-digest
│  │  ├─ dev/[screen]              Vista previa con datos de ejemplo (404 en producción)
│  │  └─ manifest.ts · layout.tsx · globals.css
│  ├─ components/                  ui/, shell/, product/, dashboard/, pwa/ …
│  └─ lib/
│     ├─ dal.ts                    requireSession / requireAdmin (sesión + 24 h + onboarding)
│     ├─ session.ts · email.ts · push.ts · data.ts · link-preview.ts
│     ├─ supabase/                 client.ts, server.ts (usuario, sin estado, service_role)
│     ├─ domain/                   codes, dates, status, labels, dashboard (+ tests)
│     └─ storage/photos.ts         Interfaz PhotoStorage + Supabase
└─ supabase/
   ├─ migrations/                  SQL versionado. NUNCA editar una migración ya aplicada
   ├─ tests/rls_test.sql · cron.sql · make-admin.sql
```

---

## 4. Modelo de datos (Postgres)

### 4.1 Enums
```sql
create type contact_channel as enum ('messenger','instagram','whatsapp');
create type store_kind      as enum ('amazon','walmart','tiktok','temu','other');
create type review_type     as enum ('stars','comment','photos','video');
create type product_status  as enum ('in_transit','delayed','received','completed','cancelled','returned');
create type photo_kind      as enum ('arrival','review');
create type user_role       as enum ('user','admin');
```

### 4.2 Tablas

**`profiles`**: 1:1 con `auth.users`
| columna | tipo | notas |
|---|---|---|
| id | uuid PK → auth.users.id | |
| first_name | text not null | Del onboarding |
| last_name | text not null | Primer apellido |
| code_prefix | char(4) not null unique-por-usuario | Ej. `JADO`. **Inmutable** una vez creado |
| product_seq | int not null default 0 | Contador propio del usuario |
| timezone | text not null default 'America/New_York' | IANA |
| role | user_role default 'user' | Solo se cambia desde SQL |
| onboarded_at | timestamptz | null = falta el onboarding |
| created_at / updated_at | timestamptz | |

**`providers`**: CRM de proveedores
| columna | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid not null → profiles | |
| name | text not null | unique (user_id, lower(name)) |
| contact_channel | contact_channel null | Canal habitual (opcional) |
| contact_handle | text null | @usuario o teléfono (opcional) |
| notes | text null | |
| created_at, deleted_at | timestamptz | |

**`products`**
| columna | tipo | notas |
|---|---|---|
| id | uuid PK default gen_random_uuid() | ID interno. Nunca se muestra |
| user_id | uuid not null | |
| code | text not null | `JADO-00001`. unique (user_id, code). Lo asigna un trigger |
| name | text not null | El nombre que ella elige (no se autocompleta desde el link) |
| provider_id | uuid not null → providers | |
| contact_channel | contact_channel null | Por dónde la contactaron para este producto |
| store | store_kind not null default 'amazon' | |
| store_other | text null | Obligatorio solo si store = 'other' |
| url | text null | Validado como http(s) |
| image_url | text null | Lo rellena `link-preview` si puede |
| requires_review | boolean not null default true | |
| review_types | review_type[] not null default '{}' | Puede estar vacío. **Nunca da error** |
| review_days | smallint null | null si requires_review = false. Debe ser ≥ 1 |
| status | product_status not null default 'in_transit' | |
| registered_at | timestamptz not null default now() | Automático. No editable |
| expected_arrival_date | date not null | Fecha estimada (la da la tienda) |
| arrived_on | date null | Fecha real de llegada (local) |
| review_due_date | date **generated** | `arrived_on + review_days` si aplica |
| reviewed_on | date null | |
| notes | text null | |
| deleted_at | timestamptz null | Papelera |
| created_at / updated_at | timestamptz | |

Restricciones:
- `check (requires_review or (review_days is null and review_types = '{}'))`
- `check (not requires_review or review_days >= 1)`
- `check (store <> 'other' or store_other is not null)`

**`product_events`**: historial (la línea de tiempo del producto)
| id | product_id | user_id | type | payload jsonb | note | created_at |
|---|---|---|---|---|---|---|

`type` ∈ `created, expected_date_changed, marked_delayed, arrived, arrival_undone, review_done, review_undone, edited, cancelled, returned, trashed, restored`.
Ejemplo de payload: `{ "from": "2026-11-20", "to": "2026-11-23" }`. Se inserta **siempre** que cambia una fecha o un estado (con trigger o dentro de la misma Server Action, en una transacción).

**`product_photos`**
| id | product_id | user_id | kind photo_kind | storage_path | width | height | bytes | created_at |

**`push_subscriptions`**: id, user_id, endpoint (unique), p256dh, auth, user_agent, created_at, last_success_at

**`notification_log`**: user_id, local_date, kind, sent_at. unique (user_id, local_date, kind) para no notificar dos veces.

**`login_challenges`**: id, user_id, code_hash, expires_at, attempts, consumed_at, ip, created_at. Sin acceso desde el cliente: sin políticas RLS, solo `service_role`.

**`user_sessions`**: id, user_id, verified_at, expires_at (= verified_at + 24 h), user_agent, revoked_at.

### 4.3 Código legible del producto (`JADO-00001`)
- Se genera en el onboarding: **2 primeras letras del nombre + 2 primeras del primer apellido**, en mayúsculas, sin tildes (`á→A`, `ñ→N`), solo A–Z. Si falta alguna letra, se rellena con `X` (ej. "Li Wu" → `LIWU`; "Al O" → `ALOX`).
- Número: **contador propio por usuario**, 5 dígitos con ceros a la izquierda. El primer producto de cada persona es siempre `XXXX-00001`, sin importar cuántos usuarios haya.
- Trigger `before insert` en `products`: `update profiles set product_seq = product_seq + 1 where id = new.user_id returning product_seq` (bloquea la fila, así no hay duplicados) y luego `new.code := prefix || '-' || lpad(seq::text, 5, '0')`.
- Los códigos **nunca se reutilizan** (los productos en papelera conservan el suyo).
- El prefijo es inmutable aunque luego cambie el nombre en el perfil.
- Dos usuarios pueden tener el mismo prefijo (`JADO`). No pasa nada, porque la unicidad es por usuario.

### 4.4 Estado mostrado (derivado; no se guarda)
Se calcula en una vista `products_view` (con `security_invoker = true`) o en `lib/domain/status.ts`, usando el "hoy" local del usuario:

| Condición | Estado visible | Color | Icono |
|---|---|---|---|
| in_transit y expected = hoy | **Llega hoy** | azul | `PackageCheck` |
| in_transit y expected > hoy | **En camino** | azul suave | `Truck` |
| in_transit y expected < hoy | **Llegada sin confirmar** | ámbar | `PackageX` |
| delayed | **Retrasado** (+ nueva fecha) | ámbar | `Clock` |
| received y due > hoy | **Review pendiente** (en N días) | índigo | `Star` |
| received y due = hoy | **Review hoy** | azul fuerte | `CalendarCheck` |
| received y due < hoy | **Review vencido** | rojo | `AlertCircle` |
| completed y requires_review | **Review hecho** | verde | `CheckCircle2` |
| completed y not requires_review | **Recibido · sin review** | verde grisáceo | `Check` |
| cancelled | **Cancelado** | gris | `Ban` |
| returned | **Devuelto** | violeta | `Undo2` |

Un estado **nunca se comunica solo con color**: siempre va con icono y texto.

### 4.5 Reglas de negocio
- Al marcar "Retrasado" se pide la **nueva fecha estimada**. Se puede cambiar cuantas veces haga falta, adelantándola o atrasándola, y cada cambio queda en el historial.
- Al **confirmar la llegada** se pide la fecha (hoy por defecto, se puede elegir una anterior por si se le olvidó confirmar), se pueden subir fotos de llegada (opcionales) y una nota opcional. Si `requires_review = false`, pasa directo a `completed`.
- Si cambia `review_days` o `arrived_on`, el vencimiento se recalcula solo (columna generada).
- **Deshacer**: se puede revertir la llegada o el review por si se marcaron por error. Queda en el historial.
- `cancelled` se puede marcar mientras el producto no ha llegado. `returned` se puede marcar desde received o completed.
- Los productos en papelera (`deleted_at` no nulo) no cuentan en el dashboard, el calendario, las notificaciones ni los conteos del CRM.

---

## 5. Seguridad y multi-tenant

### 5.1 RLS (en TODAS las tablas de usuario)
```sql
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- Patrón para cada tabla (products, providers, product_events, product_photos, push_subscriptions):
alter table products enable row level security;
create policy "owner_select" on products for select using (user_id = auth.uid() or public.is_admin());
create policy "owner_insert" on products for insert with check (user_id = auth.uid());
create policy "owner_update" on products for update using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Sin política de DELETE: nadie borra físicamente desde la app.
```
- `profiles`: el usuario lee y actualiza **solo** su fila, y no puede cambiar `role`, `code_prefix` ni `product_seq` (eso se controla con un trigger o grants de columnas).
- `user_id` se pone con `default auth.uid()` y el cliente nunca lo envía.
- `provider_id` debe pertenecer al mismo usuario (lo valida un trigger).

### 5.2 Storage
- Bucket **privado** `product-photos`. Ruta: `{user_id}/{product_id}/{arrival|review}/{uuid}.webp`.
- Política: `(storage.foldername(name))[1] = auth.uid()::text`, más lectura para admin.
- Las imágenes se sirven con signed URLs de corta duración.

### 5.3 Inicio de sesión: contraseña + código por email en CADA inicio de sesión
Supabase no trae "contraseña + código por email" como segundo factor, así que el flujo es propio:
1. `/login`: correo y contraseña. Una Server Action valida la contraseña con `signInWithPassword` en un cliente temporal y **descarta esa sesión** de inmediato.
2. La Server Action `loginWithPassword` genera un código de 6 dígitos, guarda su **hash** en `login_challenges` (válido 10 min, máximo 5 intentos) y lo envía con Resend.
3. `/login/codigo`: seis casillas, con pegado automático, `autocomplete="one-time-code"` y "Reenviar código" activo tras 60 s.
4. Si el código es válido, el servidor crea la sesión real (`auth.admin.generateLink({ type: 'magiclink' })` → `verifyOtp({ token_hash })`) y registra una fila en `user_sessions` con `expires_at = now() + 24h`.
5. **Cierre de sesión automático a las 24 h**: el middleware de Next.js comprueba `user_sessions.expires_at` (en una cookie firmada httpOnly más una consulta a la BD) y, si expiró, ejecuta `signOut()` y redirige a `/login` con el aviso "Por seguridad, vuelve a iniciar sesión". En el panel de Supabase, *Auth → Sessions → Time-box* se configura también a 24 h cuando el plan lo permita.
6. Límites: 5 intentos de contraseña cada 15 min por email+IP, y 5 envíos de código por hora.
7. El registro público está **desactivado** en Supabase (*Allow new users to sign up* = off). Las cuentas se crean desde el panel de Supabase o desde `/admin` (ver §5.4).

### 5.4 Admin
- La cuenta del dueño tiene `role = 'admin'` (puesto manualmente con SQL).
- `/admin` (oculta para los demás; el middleware y RLS la protegen): lista de usuarios, **selector de persona** y vista de sus productos, proveedores y fotos en **solo lectura**. Incluye un botón "Crear usuario" (email + contraseña temporal) que usa la Admin API desde el servidor.
- No hay suplantación de usuarios ni el admin edita datos ajenos. Las correcciones se hacen desde Supabase.

---

## 6. Pantallas

### 6.1 Navegación
- **Móvil (< 1024 px):** barra inferior fija con 5 opciones: **Inicio · Calendario · ( + Agregar ) · Productos · Ajustes**. El botón central "+" es circular y algo más grande, con fondo azul. Cada opción lleva icono y texto. Respeta `safe-area-inset-bottom`.
- **Escritorio (≥ 1024 px):** la barra pasa a una **sidebar izquierda** (logo, las mismas 5 opciones, versión abajo). Contenido con `max-width: 1120px`. En Productos se usa una tabla real.
- **Proveedores** está dentro de Productos como segundo segmento: `Productos | Proveedores`.

### 6.2 Inicio (dashboard)
Pensado para abrirlo cada mañana. Orden de arriba abajo:
1. **Saludo y fecha**: "Buenos días, Jane", con la fecha "miércoles, 18 de noviembre" debajo.
2. **Hoy**: lo accionable. Cada lista solo aparece si tiene elementos:
   - **Llegan hoy**: tarjetas con miniatura, nombre, tienda y el botón **"Llegó"** (abre el sheet de llegada). Menú secundario: "Se retrasó", "Cambiar fecha".
   - **Reviews para hoy**: con chips del tipo de review y el botón **"Hecho"**.
   - **Necesita tu atención**: reviews vencidos y llegadas sin confirmar, con la misma acción rápida.
   - Si no hay nada: estado vacío amable ("Hoy no tienes pendientes. Disfruta el día.") con un enlace a "Próximos 7 días".
3. **Resumen**: una fila de 4 datos compactos y sobrios (no tarjetas gigantes): *En camino*, *Reviews pendientes*, *Hechos este mes*, *Total de productos*. Cada dato lleva a Productos ya filtrado.
4. **Próximos 7 días**: lista agrupada por día ("Mañana · 2 llegadas, 1 review").
5. **Tu actividad**: **una sola** gráfica de barras simple con los productos recibidos por mes (últimos 6 meses), más una barra apilada de proporción por tienda con su leyenda. Nada más; la sección se puede colapsar.

### 6.3 Calendario
- Vista **mensual** con puntos bajo cada día: azul = llegada, índigo = review, rojo = vencido. Debajo, una leyenda con texto.
- Al tocar un día se muestra la lista de ese día debajo de la cuadrícula (en móvil) o en un panel lateral (en escritorio), con las mismas acciones rápidas.
- Botón "Hoy" para volver. Se cambia de mes deslizando o con flechas.

### 6.4 Agregar producto
Formulario en una sola pantalla, en este orden:
1. **¿Este producto lleva review?**: interruptor arriba del todo, en **Sí** por defecto. Con **No** se ocultan (con una animación breve) *Tipo de review* y *Días para el review*.
2. **Nombre del producto** *(obligatorio)*: texto libre, el nombre que ella reconoce.
3. **Link**: campo con botón **"Pegar"** (Clipboard API). Al guardarlo se valida http(s) y se muestra "Abrir link ↗" para comprobarlo. La miniatura se intenta obtener en segundo plano después de guardar; si falla, no se muestra ningún error.
4. **Tienda** *(obligatorio)*: chips de selección única: **Amazon** (por defecto) · Walmart · TikTok Shop · Temu · Otra. Con "Otra" aparece un campo de texto.
5. **Proveedor** *(obligatorio)*: combobox que busca en sus proveedores y ofrece **"+ Crear 'Nombre'"** si no existe.
6. **Contacto**: chips de selección única con icono: Messenger · Instagram · WhatsApp. Opcional. El @usuario o teléfono se guarda en el proveedor, no aquí.
7. **Tipo de review**: chips multiselección con icono y texto: `Star` **Estrellas** · `MessageSquareText` **Comentario** · `Camera` **Fotos** · `Video` **Video**. Se pueden dejar todos sin marcar.
8. **Días para el review**: chips **3 · 7 · 14** y **Otro** (campo numérico de 1 a 90). Texto de ayuda: "Se cuentan desde el día que llegue".
9. **Fecha estimada de llegada** *(obligatorio)*: selector de fecha nativo, con mañana por defecto.
10. **Notas**: opcional, colapsado tras "+ Agregar nota".

- La fecha y hora de registro es automática y no se muestra en el formulario. El ID interno y el código `JADO-00001` tampoco; se ven después en la lista y el detalle.
- Botón fijo abajo: **"Guardar producto"**. Al guardar: toast "Producto JADO-00012 agregado" con la acción "Ver", y el formulario se limpia para agregar otro.
- Validación junto a cada campo, al salir de él. Solo son obligatorios nombre, tienda, proveedor y fecha estimada.

### 6.5 Productos
- Buscador (por nombre, código o proveedor), chips de filtro por estado (Todos, En camino, Por reseñar, Vencidos, Completados…) y una hoja de filtros avanzados (tienda, proveedor, tipo de review, rango de fechas). Orden: próximos vencimientos primero (por defecto), recientes, o A–Z.
- **Móvil:** lista de tarjetas con miniatura (o el icono de la tienda), nombre, código, proveedor y StatusBadge. Deslizando la tarjeta aparece la acción rápida.
- **Escritorio:** tabla con las columnas Código · Producto · Proveedor · Tienda · Estado · Llegada · Vence · Tipo de review.
- **Detalle del producto:** imagen, nombre, código, estado, botón "Abrir link", acciones según el estado, datos del producto y pestañas **Historial** (línea de tiempo de `product_events`) y **Fotos** (llegada / review, en una galería). Menú "⋯" con Editar, Cancelar, Devuelto y **Enviar a la papelera**.
- **Papelera:** se envía con doble confirmación. Primero un diálogo que nombra el producto ("¿Enviar 'Lámpara LED' a la papelera?"); luego, en el botón de confirmar, se mantiene pulsado o se toca una segunda vez. La papelera está en Ajustes y desde ahí se pueden restaurar los productos. No existe "Eliminar para siempre".

### 6.6 Proveedores (CRM ligero)
- Lista con nombre, número de colaboraciones, última colaboración y los pendientes activos.
- Detalle: contacto opcional (canal y @/teléfono, con el botón "Abrir chat" → `wa.me/`, `ig.me/`, `m.me/`), estadísticas simples (total de productos, reviews hechos, primera y última colaboración) y la lista de sus productos.

### 6.7 Sheets de acción (sustituyen a los modales)
Se usan bottom sheets en móvil y diálogos laterales en escritorio:
- **Llegó**: fecha (hoy), fotos de llegada (cámara o galería, varias), nota opcional.
- **Se retrasó / Cambiar fecha**: nueva fecha estimada y nota opcional.
- **Review hecho**: fecha (hoy) y capturas del review (opcionales, varias).

### 6.8 Ajustes
Perfil (nombre; el código se muestra pero no se puede cambiar) · Zona horaria · Notificaciones (activar, probar, estado del permiso) · Papelera · Exportar mis datos · **Versión e historial de cambios** · Cerrar sesión.

### 6.9 Onboarding (primera vez)
1. Nombre y primer apellido, con una vista previa del código ("Tus productos se verán así: **JADO-00001**").
2. Cambio de la contraseña temporal.
3. Zona horaria: se **detecta automáticamente** con `Intl.DateTimeFormat().resolvedOptions().timeZone`, sin pedir permiso de ubicación ("Detectamos: Nueva York (GMT-5). ¿Es correcto?"). Si la rechaza, puede elegirla de una lista con buscador. La geolocalización no hace falta y añadiría un aviso de permiso innecesario.
4. Activar notificaciones, con una explicación previa de para qué sirven. En iPhone, se muestra antes una guía de "Agregar a pantalla de inicio".
5. Instrucciones para instalar la app (Android: aviso de `beforeinstallprompt`; iOS: guía visual).

---

## 7. Notificaciones

- **Una sola notificación al día, a las 8:00 a.m. hora local**, y **solo si hay algo que hacer**. Ejemplo: *"Hoy: 2 llegadas, 1 review. 1 review vencido."* Al tocarla se abre Inicio.
- Incluye llegadas de hoy, reviews de hoy, **reviews vencidos** y **llegadas sin confirmar**.
- **No se avisa por adelantado** ("mañana tienes…"). No hay notificaciones de marketing ni resúmenes por email.
- Implementación: `pg_cron` cada 15 min llama a `POST /api/cron/daily-digest` (con `CRON_SECRET`). Selecciona a los usuarios cuya hora local sea las 8 y sin registro hoy en `notification_log`, envía Web Push a todas sus suscripciones y elimina las que respondan 404/410.
- Email: solo los códigos de inicio de sesión. Un respaldo por email queda en el roadmap y estaría desactivado por defecto.
- En iOS el push solo funciona con la PWA instalada (iOS 16.4+). La UI lo detecta y lo explica.

---

## 8. Link, miniatura y fotos

### 8.1 Link
- Se normaliza (trim, añadir `https://` si falta) y se valida con `new URL()`. Se aceptan enlaces cortos (`a.co`, `amzn.to`, `vm.tiktok.com`).
- Se abre siempre en una pestaña nueva con `rel="noopener noreferrer"`.

### 8.2 Miniatura (best-effort)
- `lib/link-preview.ts` (vía `after()`) hace la petición desde el servidor (timeout de 5 s y User-Agent de navegador), sigue redirecciones, busca `og:image`, `twitter:image` y en Amazon `#landingImage`/`data-old-hires`, y guarda el resultado en `image_url`.
- **Si falla, se ignora en silencio** y se muestra el icono de la tienda. No se reintenta en bucle; solo una vez más al editar el link.

### 8.3 Fotos de prueba (llegada y review)
- Se **comprimen siempre** en el cliente: lado mayor 1600 px, WebP con calidad 0.75, objetivo ≤ 300 KB. Además se genera una miniatura de 400 px.
- Se suben con barra de progreso y se pueden quitar antes de guardar. No hay límite estricto de fotos (recomendado ≤ 6 por momento).
- Estimación: ~10 productos/semana × ~3 fotos × ~250 KB ≈ **0.4 GB por usuario al año**. El plan gratuito de Supabase (1 GB) alcanza para poco más de 2 años de un usuario. Hay que vigilar el uso desde `/admin`.
- Todo el acceso pasa por la interfaz `PhotoStorage` (`upload`, `getUrl`, `list`), para poder añadir **Google Drive** como backend en el futuro sin tocar la UI.

---

## 9. Sistema de diseño

Principios (impeccable, modo *Operate*, y UI/UX Pro Max, estilo *Minimalism & Swiss*): **limpio, fino, profesional y tranquilo.** La herramienta desaparece detrás de la tarea. Color restringido: el azul solo marca acciones, selección y estados, nunca es decoración.

### 9.1 Color (solo modo claro en la v1)
```css
--bg:            #FFFFFF;  /* fondo principal: blanco */
--bg-subtle:     #F8FAFC;  /* zonas secundarias, sidebar, filas alternas */
--surface:       #FFFFFF;  /* tarjetas y sheets */
--border:        #E2E8F0;
--border-strong: #CBD5E1;
--text:          #0F172A;  /* contraste 17:1 */
--text-muted:    #64748B;  /* 4.8:1 sobre blanco: mínimo permitido para texto secundario */
--text-faint:    #94A3B8;  /* solo iconos decorativos y separadores, NUNCA texto */

--primary:       #2563EB;  /* azul de marca */
--primary-hover: #1D4ED8;
--primary-press: #1E40AF;
--primary-soft:  #EFF6FF;  /* fondos de chips seleccionados, día de hoy */
--primary-ring:  #93C5FD;
--on-primary:    #FFFFFF;

--info:    #2563EB;  --info-soft:    #EFF6FF;
--review:  #4F46E5;  --review-soft:  #EEF2FF;
--success: #15803D;  --success-soft: #F0FDF4;
--warning: #B45309;  --warning-soft: #FFFBEB;
--danger:  #DC2626;  --danger-soft:  #FEF2F2;
--neutral: #475569;  --neutral-soft: #F1F5F9;
--returned:#7C3AED;  --returned-soft:#F5F3FF;
```
Sombras con tono gris pizarra, siempre con desplazamiento y desenfoque suave (sin halos de color):
```css
--shadow-xs: 0 1px 2px rgb(15 23 42 / 0.05);
--shadow-sm: 0 1px 3px rgb(15 23 42 / 0.06), 0 1px 2px rgb(15 23 42 / 0.04);
--shadow-md: 0 4px 12px -2px rgb(15 23 42 / 0.08), 0 2px 4px -2px rgb(15 23 42 / 0.05);
--shadow-lg: 0 12px 32px -8px rgb(15 23 42 / 0.14);   /* sheets y popovers */
```

### 9.2 Tipografía
- Una sola familia: **Plus Jakarta Sans** (con `next/font`, autoalojada), pesos 400/500/600/700.
- Escala fija en rem (ratio ~1.2): 12 · 14 · **16 (base)** · 18 · 20 · 24 · 30.
- Cuerpo de 16 px con interlineado de 1.5. Las etiquetas pueden ir a 14 px con peso 500. Nunca menos de 12 px.
- Para números, fechas y códigos: `font-variant-numeric: tabular-nums`. Los códigos (`JADO-00001`) van en la misma familia, peso 600 y `letter-spacing: 0.02em`, **no en monospace**.

### 9.3 Espaciado, forma y tamaño
- Escala base de 4 px: 4, 8, 12, 16, 20, 24, 32, 40, 48. Padding de pantalla: 16 px en móvil y 24–32 px en escritorio.
- Radios: chips `9999px`, inputs y botones `10px`, tarjetas `14px`, sheets `20px` (solo las esquinas superiores).
- Botones e inputs con **tamaño normal**: altura de 40 px y área táctil mínima de 44 px (con padding o hit-area invisible). Sin botones gigantes.
- Tarjetas: borde de 1 px `--border` y `--shadow-xs`; al pasar el cursor o pulsar, `--shadow-sm`. **No se anidan tarjetas.**

### 9.4 Componentes clave
- **StatusBadge**: píldora con fondo `*-soft`, texto e icono del color del estado, 12–13 px y peso 600.
- **ReviewTypeChip**: icono y texto. Sin seleccionar: borde gris y texto muted. Seleccionado: fondo `--primary-soft`, borde y texto `--primary` y un check pequeño.
- **Store badge**: texto con un punto de color neutro. **No se usan logos oficiales de marcas.**
- **Toasts** abajo, por encima de la barra de navegación, con la acción "Deshacer" cuando aplique.
- **Skeletons** (no spinners) mientras se cargan listas y el dashboard.
- **Estados vacíos** que explican qué hacer ("Aún no tienes productos. Toca + para agregar el primero").
- Cada componente interactivo tiene los estados default, hover, focus-visible, active, disabled, loading y error.

### 9.5 Movimiento
- Transiciones de 150–220 ms con `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out). Las salidas son más rápidas que las entradas.
- El movimiento solo comunica un cambio de estado: abrir un sheet, el check de "hecho", ocultar campos con el interruptor de review.
- Se respeta `prefers-reduced-motion`.
- Detalle propio: al confirmar "Llegó" o "Hecho", la tarjeta muestra un check que se dibuja (stroke-dashoffset) y se retira de la lista con un colapso suave.

### 9.6 Prohibido (anti-patrones)
Texto con degradado · glassmorphism decorativo · eyebrows o kickers sobre los títulos · bordes laterales de color en tarjetas · sombras duras desplazadas · emojis como iconos · modales cuando basta un sheet o algo inline · varias gráficas en el dashboard · el patrón "número gigante de hero" · gris sobre gris · el color como único indicador · desactivar el zoom · scroll horizontal en móvil.

### 9.7 Detalles del navegador
- Selección de texto con `--primary-soft`, `caret-color: var(--primary)`, `accent-color: var(--primary)`.
- Anillo de foco de 2 px `--primary-ring` con offset de 2 px.
- `theme-color` blanco en el manifest y en la meta, y `viewport-fit=cover` con las safe areas.

### 9.8 Logo
`public/logo.svg`: cuadrado redondeado azul `#2563EB` con una caja en línea blanca y un check en un círculo blanco (concepto: *"llegó y está hecho"*). A partir de él se generan los iconos PWA (192, 512, maskable con un 20 % de margen) y el `apple-touch-icon`.

---

## 10. Versiones y actualizaciones

- **SemVer** en `package.json` (`MAJOR.MINOR.PATCH`). Cada release lleva un tag `vX.Y.Z`, un GitHub Release y una entrada en `CHANGELOG.md` en español sencillo, pensado para la usuaria.
- En el build se inyecta `NEXT_PUBLIC_APP_VERSION` (desde package.json) y `NEXT_PUBLIC_COMMIT_SHA`.
- `GET /api/version` → `{ version, sha, builtAt }`, sin caché.
- **Aviso de actualización:** cuando el service worker detecta una versión nueva esperando, o el `/api/version` consultado al volver a la app difiere de la versión cargada, aparece un banner discreto encima de la barra inferior: *"Hay una nueva versión (1.3.0) · **Actualizar**"*. Al tocarlo se ejecuta `skipWaiting()` y se recarga. Después de actualizar se muestra una sola vez la hoja "Novedades".
- Ajustes muestra "Revia v1.2.0" y el enlace "Novedades".
- Flujo Git: ramas `feat/*` y `fix/*` → PR a `main` → Vercel despliega. Commits con Conventional Commits (`feat:`, `fix:`, `chore:`…). Para versionar se usa `pnpm version minor|patch` y `git push --follow-tags`.

---

## 11. Exportar datos
Ajustes → **Exportar mis datos**:
- **Excel (.xlsx)** con 3 hojas: *Productos* (todas las columnas legibles en español, código incluido, fechas en su zona horaria), *Proveedores* e *Historial*.
- **CSV** de productos.
- Casilla "Incluir productos en papelera".
- Futuro: ZIP con las fotos.
- La exportación se genera en el servidor solo con los datos del usuario (RLS) y no requiere ayuda del admin. Está pensada para que una persona que deje el servicio pueda llevarse todo.

---

## 12. Calidad

- **Tests de RLS obligatorios**: con los usuarios A y B, B no puede leer, actualizar ni insertar en nombre de A en ninguna tabla ni en Storage. El admin puede leer y no puede escribir.
- Tests unitarios de `codes.ts` (prefijos con tildes, ñ, nombres cortos), `status.ts` (cada fila de §4.4) y `dates.ts` (cambios de horario de verano y zonas distintas).
- E2E con Playwright en 375 px y 1440 px: agregar → confirmar llegada → review hecho → papelera → restaurar.
- Accesibilidad: contraste ≥ 4.5:1, navegación con teclado, `aria-label` en los botones de solo icono, labels visibles (el placeholder nunca sustituye al label).
- Rendimiento: LCP < 2.5 s en 4G, imágenes lazy con tamaño reservado (CLS < 0.1).
- Antes de cerrar cualquier tarea de UI: pasar el checklist de `ui-ux-pro-max/references/pro-rules.md` y la revisión `impeccable audit`.

---

## 13. Variables de entorno
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # solo en el servidor
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@…
RESEND_API_KEY=
LOGIN_CODE_FROM=Revia <acceso@…>
SESSION_COOKIE_SECRET=
CRON_SECRET=                        # protege /api/cron/daily-digest
```
Nunca se commitean `.env*` (están en `.gitignore`); solo `.env.example`.

---

## 14. Roadmap (fuera de la v1, NO implementar sin pedirlo)
- Venta del servicio: landing, planes, pago (Stripe) y registro con suscripción.
- Modo oscuro.
- Número de orden de la tienda en el producto.
- Google Drive como almacenamiento de fotos.
- Respaldo por email (desactivado por defecto).
- Inglés (i18n). Se preparan desde ya las cadenas en `src/i18n/es.ts`.
- ZIP de fotos en la exportación.

---

## 15. Glosario UI (usar estos textos)
| Concepto | Texto |
|---|---|
| Confirmar llegada | **Llegó** |
| Marcar review hecho | **Hecho** |
| Retraso | **Se retrasó** |
| Sin review | **Este producto no lleva review** |
| Papelera | **Enviar a la papelera** / **Restaurar** |
| Código | **Código** (ej. JADO-00001) |
| Fecha estimada | **Llega aprox.** |
| Vencimiento | **Review antes del** |
