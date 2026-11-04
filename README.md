# XPFly

Tu lista de pendientes con XP, niveles, amigos, clanes y un compañero llamado Pyro.

React + Vite + TypeScript + Tailwind en el frontend; Supabase (Postgres, Auth, Storage y Edge Functions) en el backend; Google Gemini para la IA.

## Desarrollo local

```bash
npm install
cp .env.example .env   # y pon la URL y la clave pública de tu proyecto de Supabase
npm run dev            # http://localhost:8080
```

## Poner en marcha un proyecto de Supabase nuevo

1. Crea un proyecto en [supabase.com](https://supabase.com) y anota el **Project ref** (Settings → General).
2. Inicia sesión y enlaza el proyecto:
   ```bash
   npx supabase login
   npx supabase link --project-ref <PROJECT_REF>
   ```
3. Crea la base de datos con todas las migraciones:
   ```bash
   npx supabase db push
   ```
4. Guarda los secretos de las funciones:
   ```bash
   npx supabase secrets set GEMINI_API_KEY=<tu clave de Google AI Studio>
   npx --yes web-push generate-vapid-keys   # genera las claves para notificaciones push
   npx supabase secrets set VAPID_PUBLIC_KEY=<pública> VAPID_PRIVATE_KEY=<privada> VAPID_SUBJECT=mailto:<tu correo>
   ```
5. Publica las funciones:
   ```bash
   npx supabase functions deploy
   ```
6. Tareas programadas: abre `supabase/setup/cron.sql`, reemplaza los dos valores marcados y ejecútalo una vez en el **SQL Editor** de Supabase.
7. En **Authentication → URL Configuration** pon como *Site URL* la dirección donde publiques la app (y agrégala en *Redirect URLs*, junto con `http://localhost:8080`).

## Publicar el frontend

Conecta este repositorio a [Vercel](https://vercel.com) (o Netlify). Framework: Vite, comando `npm run build`, carpeta `dist`. Agrega las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Cambiar de proveedor de IA

Toda la configuración está en `supabase/functions/_shared/ai.ts` (URL, modelos y clave).
