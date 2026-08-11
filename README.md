# Apex Performance - Frontend

Aplicación web para gestionar entrenamientos, rutinas, planificaciones, progreso y seguimiento de atletas. La interfaz está diseñada para funcionar en escritorio y móvil, con temas claro y oscuro y permisos adaptados al tipo de usuario.

## Funcionalidades principales

- Registro de entrenamientos con series, repeticiones, carga, descansos y notas de configuración.
- Rutinas y planificaciones semanales o cíclicas.
- Biblioteca de ejercicios con filtros, imágenes, videos y ejercicios personalizados.
- Dashboard con carga semanal, recuperación, actividad y pesajes.
- Historial y resumen de sesiones.
- Analítica por ejercicio e inteligencia de datos.
- Gestión de atletas para entrenadores.
- Administración de usuarios, coaches y catálogo.
- Fotografías de progreso y avatar de perfil.

## Roles

- **Cliente independiente:** gestiona sus rutinas, entrenamientos y progreso.
- **Cliente con coach:** accede al entrenamiento y seguimiento asignado por su entrenador.
- **Entrenador:** administra sus atletas, planificaciones y sesiones supervisadas.
- **Administrador:** dispone de las funciones de coach y de las herramientas globales de administración.

## Tecnologías

- React 18 y Vite 7.
- Tailwind CSS.
- TanStack Query para estado remoto y caché.
- Axios para comunicación con la API.
- Framer Motion para transiciones.
- Nivo para visualizaciones.
- Lucide React para iconografía.
- Playwright para validación de interfaz.

## Requisitos

- Node.js 22 recomendado.
- npm 10 o posterior.
- Backend de Apex Performance disponible.

## Configuración local

1. Instala las dependencias:

   ```powershell
   npm install
   ```

2. Crea el archivo local de configuración:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Revisa las variables:

   | Variable | Descripción |
   | --- | --- |
   | `VITE_API_URL` | URL pública del backend. En local: `http://localhost:4000`. |
   | `VITE_AUTH_TOKEN_STORAGE` | Persistencia del token cuando la API lo expone. |
   | `VITE_CLOUDINARY_CLOUD_NAME` | Cloud name público, si una vista necesita construir URLs de Cloudinary. |

   Las variables `VITE_*` son visibles en el navegador. Nunca coloques claves privadas en ellas.

4. Inicia el servidor:

   ```powershell
   npm run dev
   ```

   La aplicación queda disponible normalmente en `http://localhost:5173`.

## Scripts

| Comando | Uso |
| --- | --- |
| `npm run dev` | Inicia Vite en desarrollo. |
| `npm run build` | Genera el bundle de producción en `dist/`. |
| `npm run preview` | Sirve localmente el bundle compilado. |
| `npm run lint` | Ejecuta ESLint sobre el proyecto. |

## Estructura

```text
src/
├── components/   Componentes por dominio y componentes compartidos
├── context/      Autenticación, rutinas, entrenamientos y usuarios
├── hooks/        Hooks de interfaz y tema
├── pages/        Pantallas principales de la aplicación
├── services/     Cliente HTTP y persistencia de autenticación
├── styles/       Estilos globales y temas
└── utils/        Cálculos, normalización y utilidades de sesión
```

La navegación principal se coordina desde `src/App.jsx`. Los permisos visibles del menú se definen en `src/components/layout/navConfig.js`, pero la autorización definitiva siempre debe ejecutarse en el backend.

## Autenticación y estado

- La API puede autenticar mediante cookie HTTP-only y, cuando está habilitado, token Bearer.
- TanStack Query gestiona la caché de datos remotos.
- El entrenamiento activo mantiene un snapshot local para sobrevivir recargas y navegación accidental.
- Al cerrar sesión se limpian los contextos y datos locales sensibles del usuario.

## Producción

Ejecuta antes de desplegar:

```powershell
npm run lint
npm run build
```

Configura `VITE_API_URL` con la URL HTTPS del backend y asegúrate de que ese origen esté permitido por CORS. El contenido de `dist/` puede publicarse en un servicio de hosting estático.

## Repositorio relacionado

Backend: [pchuquimia/gym-backend](https://github.com/pchuquimia/gym-backend)
