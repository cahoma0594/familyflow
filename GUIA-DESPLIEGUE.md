# 🚀 Guía de despliegue — FamilyFlow
## Netlify + Supabase · Tiempo estimado: 30–40 min

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

1. En Supabase: Authentication → Providers → Email → asegúrate de que está **enabled**
2. Authentication → URL Configuration → Site URL: pon `https://TU-APP.netlify.app` (lo rellenarás después)
3. Opcional: En Authentication → Email Templates puedes personalizar los emails de confirmación

---

## PASO 3 · Anthropic — API Key para OCR de facturas

1. Ve a https://console.anthropic.com
2. API Keys → Create Key → copia la clave (empieza por `sk-ant-...`)
3. Guárdala, solo se muestra una vez

---

## PASO 4 · GitHub — Subir el código

1. Instala Git si no lo tienes: https://git-scm.com
2. Crea cuenta en https://github.com → New repository → nombre: `familyflow` → Public → Create

3. En tu ordenador, abre terminal en la carpeta del proyecto:
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
VITE_ANTHROPIC_KEY=sk-ant-XXXXXXXXXXXXXXXXXX
```
3. **IMPORTANTE**: Añade `.env` a tu `.gitignore` para no subir las claves a GitHub:
```
echo ".env" >> .gitignore
```

---

## PASO 6 · Netlify — Desplegar

1. Ve a https://netlify.com → Sign up with GitHub
2. "Add new site" → "Import an existing project" → GitHub → selecciona `familyflow`
3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Antes de hacer deploy: **Site configuration → Environment variables** → Add variable:
   - `VITE_SUPABASE_URL` = tu URL de Supabase
   - `VITE_SUPABASE_ANON_KEY` = tu anon key
   - `VITE_ANTHROPIC_KEY` = tu clave de Anthropic
5. Pulsa **Deploy site** → en 2–3 min tendrás una URL tipo `https://graceful-fox-123.netlify.app`

---

## PASO 7 · Configurar URL en Supabase

1. Copia tu URL de Netlify
2. En Supabase: Authentication → URL Configuration → Site URL → pega tu URL de Netlify
3. También añádela en Redirect URLs

---

## PASO 8 · Primer uso

1. Accede a tu URL de Netlify
2. Regístrate con tu email → confirma el email
3. Crea la familia: ponle nombre (ej: "Familia García")
4. **Compartir con tu esposa**: ve a la app → en la pantalla inicial verás el **ID de familia** (un código UUID)
   → compártelo con tu esposa → ella se registra → en "Unirme a una familia" pega ese ID
5. ¡Listo! Ambos veréis los mismos datos en tiempo real

---

## ✅ Checklist rápido

- [ ] Supabase creado y schema ejecutado
- [ ] Auth email habilitado en Supabase
- [ ] API Key de Anthropic obtenida
- [ ] Código subido a GitHub
- [ ] Variables de entorno en Netlify
- [ ] Deploy exitoso en Netlify
- [ ] URL de Netlify configurada en Supabase
- [ ] Ambos usuarios registrados y en la misma familia

---

## 🔧 Comandos útiles (desarrollo local)

```bash
# Instalar dependencias
npm install

# Crear archivo .env (copia .env.example y rellena)
cp .env.example .env

# Ejecutar en local
npm run dev
# → Abre http://localhost:5173

# Compilar para producción
npm run build
```

---

## ❓ Problemas frecuentes

**"Error: relation does not exist"** → El schema SQL no se ejecutó correctamente en Supabase. Repite el Paso 1.

**Login no funciona** → Revisa que Site URL en Supabase coincida exactamente con tu URL de Netlify.

**OCR no funciona** → Comprueba que `VITE_ANTHROPIC_KEY` está correctamente configurada en Netlify.

**Mi esposa no ve mis datos** → Asegúrate de que usó el ID de familia correcto al unirse.
