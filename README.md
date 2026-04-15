# React + Bun + MUI (plantilla)

Instrucciones rápidas (Windows Command shell):

1) Inicializar proyecto y dependencias (si no has creado package.json):

   bun init -y

2) Instalar dependencias (ejecutar desde la carpeta del proyecto):

   bun add react react-dom
   bun add -d vite @vitejs/plugin-react
   bun add @mui/material @emotion/react @emotion/styled
   bun add @mui/icons-material  # opcional
   bun add leaflet react-leaflet
UserLocations (Compartir ubicación en tiempo real)

1) Crear tabla en Supabase: en el SQL editor ejecuta `supabase/migrations/create_userlocations.sql` o copia su contenido. Esto crea la tabla `UserLocations` y las políticas RLS necesarias.

2) Desde la app: la pantalla de inicio ahora muestra un mapa y un botón "Compartir ubicación en tiempo real" que actualizará la tabla `UserLocations` con tus coordenadas mientras esté activado.


3) Ejecutar en desarrollo:

   bun run dev

4) Hacer build para despliegue (genera `dist`):

   bun run build

5) Probar build localmente:

   bun run preview

6) Deploy en Vercel:
   - Añade este repositorio en Vercel.
   - En Settings > Build & Output, usa:
       Build Command: bun run build
       Output Directory: dist
   - Alternativamente, el archivo `vercel.json` incluido establece "buildCommand" y "outputDirectory".


Notas:
- Este proyecto usa Vite como bundler; Bun es usado como gestor/runtime local para ejecutar los scripts.
- Si prefieres TypeScript, convierte los archivos a `.tsx` y agrega `tsconfig.json`.

Integración con Supabase (Autenticación)

1) Variables de entorno (local y en Vercel): crea un archivo `.env` en la raíz con:

   VITE_SUPABASE_URL="https://xyzcompany.supabase.co"
   VITE_SUPABASE_ANON_KEY="public-anon-key"

   En Vercel agrega las mismas variables en Settings > Environment Variables (usa los mismos nombres `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`).

2) Endpoints implementados:
   - `/login` — formulario de email/contraseña que usa Supabase Auth (tabla `auth.users` de Supabase).
   - `/dashboard` — ruta protegida que solo es accesible si el usuario está autenticado.

3) Flujo:
   - El cliente usa `@supabase/supabase-js` para autenticar (`signInWithPassword`) y escucha cambios de sesión.
   - La app expone un `AuthContext` para acceder a `user`, `login` y `logout`.

