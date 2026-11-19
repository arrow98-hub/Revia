# Revia

**Tu central diaria de reviews.** PWA para organizar los productos que llegan de proveedores (Amazon, Walmart, TikTok Shop, Temu…) a cambio de un review: qué llega hoy, qué review toca, qué se atrasó.

- **Stack:** Next.js 16 · TypeScript · Tailwind v4 · Supabase (Postgres + RLS, Auth, Storage, pg_cron) · Resend · Web Push · Vercel
- **Multi-tenant:** cada usuario solo ve lo suyo (RLS en todas las tablas y en Storage).
- **Seguridad:** contraseña + código por correo en cada inicio de sesión; la sesión se cierra a las 24 h.

| Documento | Para qué |
|---|---|
| [`SETUP.md`](SETUP.md) | Pasos exactos para Supabase, Resend, Vercel, GitHub y el teléfono |
| [`CLAUDE.md`](CLAUDE.md) | Reglas del producto, modelo de datos y sistema de diseño |
| [`CHANGELOG.md`](CHANGELOG.md) | Novedades por versión (se muestran dentro de la app) |

```bash
pnpm install && pnpm dev     # local
pnpm test && pnpm lint && pnpm build
```
