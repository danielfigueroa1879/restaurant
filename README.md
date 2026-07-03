# Menú del restaurante — sitio estático + Supabase

Página web para mostrar el menú del día a los clientes (por tarjetas NFC en las mesas) y para que la dueña lo actualice desde un panel privado, con **actualización en tiempo real** en todos los dispositivos.

Es un sitio 100 % estático (HTML + CSS + JS) que se despliega en **GitHub Pages** y usa **Supabase** como base de datos.

## Estructura

```
menu-restaurante/
├── index.html            ← vista pública (NFC → aquí)
├── admin.html            ← panel de la dueña
├── css/
│   ├── public.css
│   └── admin.css
├── js/
│   ├── supabase-config.js  ← pon aquí tus credenciales
│   ├── public.js
│   └── admin.js
├── supabase-setup.sql    ← script para crear la tabla y permisos
├── README.md
└── .gitignore
```

## Setup paso a paso

### 1. Crea el proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) → **Start your project** → registra con GitHub.
2. **New project**: pon un nombre (ej. `menu-restaurante`), elige una contraseña de base de datos (guárdala) y una región cercana. Plan **Free** basta.
3. Espera ~1 min a que se aprovisione.

### 2. Crea la tabla y las políticas

1. En Supabase, ve a **SQL Editor** → **New query**.
2. Abre el archivo [`supabase-setup.sql`](supabase-setup.sql), copia todo el contenido y pégalo.
3. Presiona **Run**. Deberías ver "Success. No rows returned".

### 3. Crea el usuario administrador (la dueña)

1. Ve a **Authentication → Users → Add user → Create new user**.
2. Introduce:
   - **Email**: uno inventado o real, ej. `dueña@mi-restaurante.cl`
   - **Password**: la clave que usará la dueña para entrar al panel
   - **Auto Confirm User**: ✅ marcado
3. Guarda.

### 4. Copia las credenciales al proyecto

1. En Supabase ve a **Project Settings → API**.
2. Copia:
   - **Project URL** (algo como `https://xxxxx.supabase.co`)
   - **anon / public key** (empieza con `eyJ...`, es larga)
3. Abre el archivo [`js/supabase-config.js`](js/supabase-config.js) y reemplaza:
   ```js
   const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';
   const SUPABASE_ANON_KEY = 'TU_ANON_KEY_AQUI';
   const ADMIN_EMAIL = 'dueña@mi-restaurante.cl';
   ```
   Pon las credenciales reales y el email que usaste en el paso 3.

### 5. Prueba localmente (opcional)

Abre `index.html` y `admin.html` con doble clic en tu navegador. Ambos deben cargar. Si hay error, revisa la consola (F12).

### 6. Sube a GitHub Pages

```bash
git add .
git commit -m "Configuración Supabase"

# Crear el repo en https://github.com/new (no marcar README/gitignore)
git remote add origin https://github.com/TU-USUARIO/menu-restaurante.git
git branch -M main
git push -u origin main
```

Luego en GitHub:
1. Ve al repo → **Settings → Pages**.
2. En **Source** elige **Deploy from a branch**.
3. **Branch**: `main` / `/ (root)` → **Save**.
4. Espera 1–2 minutos. La URL será `https://TU-USUARIO.github.io/menu-restaurante/`.

### 7. Graba las tarjetas NFC

Con una app como **NFC Tools** (Android/iOS) graba una URL por mesa:

- Mesa 1 → `https://TU-USUARIO.github.io/menu-restaurante/?mesa=1`
- Mesa 2 → `https://TU-USUARIO.github.io/menu-restaurante/?mesa=2`
- …

## Uso diario

- **La dueña** entra a `https://TU-USUARIO.github.io/menu-restaurante/admin.html`, escribe su contraseña y edita el menú. Todo se guarda automáticamente.
- **Los clientes** escanean su tarjeta NFC y ven el menú del día, pueden armar un pedido y enviarlo por WhatsApp.
- Cuando la dueña cambia algo, todos los clientes con la página abierta lo ven **al instante** (Supabase Realtime).

## Funciones

- 🍽 Múltiples opciones de plato del día con precio fijo
- 🥗 Agregados incluidos con el menú
- 🌮 Adicionales a la carta con precio propio
- ❌ Marcar como "agotado" (queda fantasma, tachado)
- 🎨 5 temas visuales (Clásico, Oscuro, Bosque, Océano, Borgoña)
- 📱 Envío del pedido a WhatsApp con mesa incluida
- 🔄 Actualización en tiempo real (Supabase Realtime)
- 💾 Autoguardado en cada cambio

## Costes

- **GitHub Pages**: gratis
- **Supabase Free tier**: gratis hasta 500 MB de base de datos, 5 GB de tráfico, 50 000 usuarios autenticados/mes. Sobrado para un restaurante.

## Seguridad

- La `SUPABASE_ANON_KEY` en `supabase-config.js` es pública y está diseñada para eso — no da acceso a escribir en la base de datos gracias a las políticas RLS del paso 2.
- Solo la dueña, con su email + contraseña, puede modificar el menú.
- Si sospechas que alguien tiene tu contraseña, cámbiala en Supabase → Authentication → Users.
