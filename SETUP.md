# Puesta en marcha de Revia

Sigue los pasos **en este orden**. Tiempo total aproximado: 45–60 minutos.
Cuando veas `<<algo>>`, reemplázalo por tu valor.

---

## 0. Lo que necesitas

- Cuenta de **GitHub**, **Supabase**, **Vercel** y **Resend** (las cuatro tienen plan gratuito).
- Un **dominio propio** (ej. `revia.app` o `tunombre.com`) para enviar los códigos por correo. Sin dominio, Resend solo deja enviar correos **a tu propio email**, lo que sirve para probar pero no para que tu mamá entre.
- En tu computadora: Node 20+ y pnpm (`npm i -g pnpm`).

---

## 1. GitHub: subir el código

1. En GitHub → **New repository** → nombre `revia` → **Private** → *Create repository* (sin README).
2. En la carpeta del proyecto:
   ```bash
   git remote add origin https://github.com/<<tu-usuario>>/revia.git
   git branch -M main
   git push -u origin main --follow-tags
   ```

---

## 2. Supabase: base de datos

### 2.1 Crear el proyecto
1. [supabase.com](https://supabase.com) → **New project** → nombre `revia` → región **East US (North Virginia)** → crea una contraseña de base de datos y guárdala.
2. Espera a que termine de crearse (~2 min).

### 2.2 Crear las tablas
1. Menú izquierdo → **SQL Editor** → **New query**.
2. Abre el archivo `supabase/migrations/20261118000000_init.sql`, copia **todo** su contenido, pégalo y pulsa **Run**.
3. Debe decir *Success. No rows returned*.

### 2.3 Configurar el inicio de sesión
En **Authentication**:
1. **Sign In / Providers → Email**: déjalo **activado**. Desactiva **Confirm email** (las cuentas las confirmas tú al crearlas).
2. **Sign In / Providers → User Signups**: desactiva **Allow new users to sign up** (nadie puede registrarse solo).
3. **URL Configuration → Site URL**: por ahora pon `http://localhost:3000`; en el paso 5 lo cambias por la URL de Vercel.

### 2.4 Crear tu cuenta (admin) y la de tu mamá
1. **Authentication → Users → Add user → Create new user**.
2. Escribe tu correo y una contraseña temporal, marca **Auto Confirm User** y pulsa **Create user**.
3. Repite con el correo de tu mamá. A ella le das su correo y la contraseña temporal: al entrar la primera vez pondrá su nombre (de ahí sale su código, p. ej. `JADO-00001`) y una contraseña nueva.
4. Para que tu cuenta sea **admin**: SQL Editor → pega el contenido de `supabase/make-admin.sql` con tu correo → **Run**.

> Más adelante puedes crear usuarios desde la propia app, en **Ajustes → Administración → Crear usuario**.

### 2.5 Copiar las claves
**Project Settings → API Keys** (o *API*):
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon / publishable key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role / secret key** → `SUPABASE_SERVICE_ROLE_KEY` (**secreta**: nunca la compartas)

---

## 3. Resend: correo de los códigos

1. [resend.com](https://resend.com) → crea tu cuenta.
2. **Domains → Add domain** → escribe tu dominio → Resend te da 3–4 registros DNS (TXT/MX/CNAME).
3. Agrégalos en el panel de donde compraste el dominio (GoDaddy, Namecheap, Cloudflare…) y vuelve a Resend → **Verify**. Puede tardar de minutos a unas horas.
4. **API Keys → Create API key** → permiso *Sending access* → cópiala → `RESEND_API_KEY`.
5. `LOGIN_CODE_FROM` = `Revia <acceso@<<tu-dominio>>>`.

> Para probar antes de verificar el dominio, usa `LOGIN_CODE_FROM=Revia <onboarding@resend.dev>`: solo llegará a tu propio correo de Resend.

---

## 4. Generar los secretos

En una terminal:
```bash
# Claves para notificaciones push
npx web-push generate-vapid-keys
#   Public Key  → NEXT_PUBLIC_VAPID_PUBLIC_KEY
#   Private Key → VAPID_PRIVATE_KEY

# Secreto de sesión (firma la cookie de 24 h)
openssl rand -base64 48      # → SESSION_COOKIE_SECRET

# Secreto del aviso diario
openssl rand -hex 32         # → CRON_SECRET
```
`VAPID_SUBJECT` = `mailto:<<tu-correo>>`.

> En Windows sin `openssl`: usa cualquier generador de contraseñas de 48+ caracteres.

---

## 5. Vercel: publicar la app

1. [vercel.com](https://vercel.com) → **Add New → Project** → importa el repo `revia` de GitHub.
2. Framework: **Next.js** (se detecta solo). No cambies los comandos de build.
3. **Environment Variables**: agrega **todas** las de `.env.example` con tus valores (marca *Production* y *Preview*).
4. **Deploy**. Al terminar tendrás una URL tipo `https://revia-xxxx.vercel.app`.
   - Si quieres, en **Settings → Domains** asigna un subdominio propio, p. ej. `app.<<tu-dominio>>`.
5. Vuelve a Supabase → **Authentication → URL Configuration → Site URL** y pon la URL final de la app.

---

## 6. Activar el aviso de las 8:00 a. m.

1. Supabase → **Database → Extensions**: activa **pg_cron** y **pg_net** (si no lo están).
2. SQL Editor → pega `supabase/cron.sql` con tu URL de Vercel y tu `CRON_SECRET` → **Run**.
3. Para comprobar: `select * from cron.job_run_details order by start_time desc limit 5;` debe mostrar ejecuciones con `succeeded` cada 15 min.

---

## 7. Instalar en el teléfono (Samsung / Android)

1. Abre la URL de la app en **Chrome**.
2. Inicia sesión: correo + contraseña → llega un código de 6 dígitos al correo → escríbelo.
3. Completa la bienvenida (nombre, primer apellido, nueva contraseña, zona horaria).
4. En Inicio, toca **Instalar Revia** (o menú ⋮ de Chrome → *Agregar a pantalla de inicio* / *Instalar app*).
5. Abre Revia **desde el ícono** y toca **Activar avisos** → *Permitir*.
6. En **Ajustes → Notificaciones → Probar aviso** debe llegar una notificación.

**iPhone (para otros usuarios):** Safari → botón Compartir → *Agregar a pantalla de inicio* → abrir desde el ícono → Ajustes → Activar avisos. Requiere iOS 16.4 o superior.

> La sesión se cierra sola cada 24 h por seguridad: al volver a entrar llega un código nuevo.

---

## 8. Publicar una versión nueva (control de versiones)

1. Haz tus cambios en una rama, ábrela como PR y fusiónala a `main`.
2. Añade una sección nueva arriba en `CHANGELOG.md` (en español sencillo, para la usuaria):
   ```md
   ## [1.1.0] - 2026-12-01
   - Lo nuevo que verá tu mamá.
   ```
3. Sube la versión y empuja con la etiqueta:
   ```bash
   pnpm version minor      # 1.0.0 → 1.1.0 (usa "patch" para arreglos: 1.0.1)
   git push --follow-tags
   ```
4. Vercel despliega solo. Quien tenga la app abierta verá **“Hay una nueva versión (1.1.0) · Actualizar”**; al actualizar aparece **“Ver novedades”** una vez. La versión actual siempre se ve en **Ajustes**.
5. Opcional: en GitHub → **Releases → Draft a new release** con la etiqueta `v1.1.0`.

---

## 9. Trabajar en local

```bash
cp .env.example .env.local      # rellena los valores
pnpm install
pnpm dev                        # http://localhost:3000
```
- Sin `RESEND_API_KEY` en local, el código de acceso **se imprime en la terminal**.
- Vista previa con datos de ejemplo (solo en desarrollo, sin login): `/dev/inicio`, `/dev/productos`, `/dev/agregar`, `/dev/detalle`, `/dev/calendario`, `/dev/proveedores`.
- Comprobaciones: `pnpm test` · `pnpm lint` · `pnpm typecheck` · `pnpm build`.

### Probar el aislamiento entre usuarios (opcional, en un proyecto de PRUEBA)
`supabase/tests/rls_test.sql` comprueba que un usuario no puede ver ni tocar datos de otro y que el admin solo lee. Ejecútalo en un proyecto Supabase vacío de pruebas (hace `rollback` al final, pero **nunca** lo corras en producción).

---

## Problemas comunes

| Síntoma | Solución |
|---|---|
| “No pudimos enviar el código a tu correo” | Revisa `RESEND_API_KEY`, que el dominio esté **Verified** y que `LOGIN_CODE_FROM` use ese dominio. |
| La app redirige a “Falta conectar Supabase” | Faltan `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` en Vercel; vuelve a desplegar. |
| “Correo o contraseña incorrectos” con datos buenos | En Supabase, confirma que el usuario existe y está **confirmado** (Auto Confirm). |
| No llegan los avisos | Que la app esté instalada, avisos activados en Ajustes, `cron.sql` ejecutado y las claves VAPID correctas. Mira `cron.job_run_details`. |
| Error al guardar fotos | Revisa que la migración creó el bucket `product-photos` (Storage). |
| Espacio de fotos | En **Administración** ves los MB usados. El plan gratuito de Supabase incluye 1 GB. |
