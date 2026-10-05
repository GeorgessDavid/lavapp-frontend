# LavApp | Front-end

## Conectar con el back-end

Por defecto la app corre en **modo demo** con datos mock (sin backend). Para usar la API real:

```bash
cp .env.example .env.local      # NEXT_PUBLIC_USE_MOCK=false y NEXT_PUBLIC_API_URL
pnpm install
pnpm dev                        # http://localhost:3000
```

El backend tiene que estar corriendo (ver `lavapp-backend/README.md`: MySQL + Redis con
`docker compose up -d` y `mvnw spring-boot:run`) con un usuario cargado, por ejemplo el de
`database/SC-109-usuario-demo.sql` (`admin@lavapp.com` / `Lavapp2026!`).

### Autenticación

La sesión es una cookie `LAVAPP_SESSION` (HttpOnly) que emite el backend; el front no guarda
tokens. Todas las requests van con `credentials: "include"`.

- Login: `POST /auth/authenticate` → usuario `{ id, email, rol, lavaderoId }`.
- Al cargar la app: `GET /auth/me` confirma la sesión (401 → vuelve al login).
- Cerrar sesión: `POST /auth/logout`.
- Cualquier 401 posterior (sesión expirada, usuario desactivado) cierra la sesión local.

Los roles del backend se mapean a los del front: `DUENO_LAVADERO` y `ADMIN_LAVAPP` → `DUENO`;
`ENCARGADO` y `EMPLEADO` → `OPERADOR`. `FLOTA` existe solo en el modo demo.

Abrir siempre `http://localhost:3000` (no `127.0.0.1`): el backend habilita ese origen para CORS
con credenciales (`FRONTEND_ORIGINS`) y la cookie `SameSite=Lax` requiere el mismo sitio.

| Variable                | Default                 | Descripción                               |
|-------------------------|-------------------------|-------------------------------------------|
| `NEXT_PUBLIC_USE_MOCK`  | `true`                  | `false` para usar la API real             |
| `NEXT_PUBLIC_API_URL`   | `http://localhost:8080` | URL base del back-end                     |

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
