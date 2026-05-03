# 🚀 Guía de despliegue — FamilyFlow
## Vercel + Supabase · Tiempo estimado: 30–40 min

---

## PASO 1 · Supabase — Crear base de datos

1. Ve a https://supabase.com → "Start your project" → crea cuenta gratuita
2. New project → ponle nombre (ej: `familyflow`) → elige región **Europe West** → crea contraseña segura
3. Espera ~2 min a que se aprovisione

4. Una vez creado: ve a **SQL Editor** → "New query"
5. Copia y pega TODO el contenido del archivo `supabase-schema.sql`
6. Pulsa **Run** → debes ver "Success"

7. Ve a **Project Settings → API** y copia:
   - `Project URL` → empieza por `https://xxxx.supabase.co`
   - `anon public` key → empieza por `eyJ...`

---

## PASO 2 · Supabase — Habilitar autenticación por email

1. En Supabase: **Authentication → Providers → Email** → asegúrate de que está **enabled**
2. **Authentication → URL Configuration → Site URL**: pon `https://TU-APP.vercel.app` (lo rellenarás después)
3. Opcional: en **Authentication → Email Templates** puedes personalizar los emails de confirmación

---

## PASO 3 · Anthropic — API Key para OCR de facturas

1. Ve a https://console.anthropic.com
2. **API Keys → Create Key** → copia la clave (empieza por `sk-ant-...`)
3. Guárdala, solo se muestra una vez

> ⚠️ Esta clave se configura **únicamente en Vercel como variable de servidor** (sin prefijo `VITE_`).
> Nunca la pongas en el código ni la expongas en el navegador.

---

## PASO 4 · GitHub — Subir el código

1. Instala Git si no lo tienes: https://git-scm.com
2. Crea cuenta en https://github.com → New repository → nombre: `familyflow` → Public → Create

3. En tu ordenador, abre Git Bash en la carpeta del proyecto:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/familyflow.git
git push -u origin main
```

---

## PASO 5 · Configurar variables de entorno (archivo .env)

1. En la raíz del proyecto, duplica `.env.example` como `.env`
2. Rellena con tus valores:
```
VITE_SUPABASE_URL=https://XXXXXXXX.supabase.co
VITE_SUPABASE_ANON_KEY=eyJXXXXXXXXXXXXXXXXXXXX
ANTHROPIC_KEY=sk-ant-XXXXXXXXXXXXXXXXXXXXXXXX
```

> ⚠️ `ANTHROPIC_KEY` **no lleva prefijo `VITE_`** — así no se expone en el bundle del navegador.
> El archivo `.env` nunca se sube a Git (está en `.gitignore`).

---

## PASO 6 · Vercel — Desplegar la app

1. Ve a https://vercel.com → crea cuenta gratuita (puedes entrar con tu cuenta de GitHub)
2. **Add New Project** → importa tu repositorio de GitHub `familyflow`
3. Vercel detecta automáticamente que es un proyecto Vite. No toques la configuración de build.
4. Antes de hacer deploy, ve a **Environment Variables** y añade estas tres variables:

| Variable | Valor |
|----------|-------|
| `VITE_SUPABASE_URL` | Tu URL de Supabase |
| `VITE_SUPABASE_ANON_KEY` | Tu anon key de Supabase |
| `ANTHROPIC_KEY` | Tu clave de Anthropic (sin prefijo VITE_) |

5. Pulsa **Deploy** → en 2–3 min tendrás una URL tipo `https://familyflow-xxxx.vercel.app`

---

## PASO 7 · Configurar URL en Supabase

1. Copia tu URL de Vercel (ej: `https://familyflow-xxxx.vercel.app`)
2. En Supabase: **Authentication → URL Configuration → Site URL** → pega tu URL de Vercel
3. También añádela en **Redirect URLs**

---

## PASO 8 · Primer uso

1. Accede a tu URL de Vercel
2. Regístrate con tu email → confirma el email
3. Crea la familia: ponle nombre (ej: "Familia García")
4. **Compartir con tu pareja**: en la pantalla inicial verás el **ID de familia** (un código UUID)
   → compártelo → ella se registra → en "Unirme a una familia" pega ese ID
5. ¡Listo! Ambos veréis los mismos datos en tiempo real

---

## ✅ Checklist rápido

- [ ] Supabase creado y schema ejecutado
- [ ] Auth email habilitado
- [ ] API key de Anthropic creada
- [ ] Código subido a GitHub
- [ ] `.env` configurado en local (para desarrollo)
- [ ] Variables de entorno añadidas en Vercel
- [ ] App desplegada en Vercel
- [ ] Site URL actualizada en Supabase
- [ ] Probado registro + confirmación de email
- [ ] Probado crear familia y unirse con ID

---

## 🛠️ Desarrollo local

Para correr el proyecto en local necesitas tener Node.js instalado. Desde la carpeta del proyecto con Git Bash:

```bash
npm install       # instalar dependencias (solo la primera vez)
npm run dev       # inicia servidor local → http://localhost:5173
```

Para probar la función OCR en local (requiere Vercel CLI):
```bash
npm install -g vercel
vercel dev        # emula las serverless functions en local
```

---

## 🔄 Actualizaciones

Cada vez que hagas cambios y los subas a GitHub, Vercel hace redeploy automático:

```bash
git add .
git commit -m "descripción del cambio"
git push
```
