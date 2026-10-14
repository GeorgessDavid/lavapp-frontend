# LavApp | Front-end

## Conectar con el back-end

Por defecto la app corre en **modo demo** con datos mock (sin backend). Para usar la API real:

```bash
cp .env.example .env.local      # NEXT_PUBLIC_USE_MOCK=false y NEXT_PUBLIC_API_URL
pnpm install
pnpm dev                        # http://localhost:3000
```

El backend tiene que estar corriendo (ver `lavapp-backend/README.md`: MySQL + Redis con
`docker compose up -d` y `mvnw spring-boot:run`) con un usuario cargado en `usuarios`; cómo
crearlo está explicado en ese README. No se versionan credenciales de prueba.

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

## Historial de servicios

`/historial` consulta los servicios anteriores del lavadero de la sesión en el backend
(`GET /lavaderos/{id}/historial`, HU-39). Se busca por patente (completa, con o sin espacios y
guiones) o por una parte del nombre del cliente (desde 2 letras), y la búsqueda es a pedido, sin
sondeo. Solo aparecen atenciones cerradas: vehículos ya retirados.

La tabla muestra fecha y hora de llegada, patente, vehículo, cliente y servicio. La ficha resume
cuántos servicios hay y cuál fue el último; si los resultados traen varios clientes o vehículos
(dos clientes con el mismo nombre, o un cliente con dos autos), muestra una ficha para cada uno y
permite ver en la tabla solo los suyos. Sin antecedentes avisa que no hay registros. En modo demo
la pantalla sigue usando los datos mock.

## Cola de vehículos

`/cola` muestra lo que dice el backend (`GET /lavaderos/{id}/ordenes?estado=`): primero los
vehículos en espera, en el orden priorizado que devuelve la API y numerados por su posición,
después los que están en lavado y los listos para retirar. En modo demo usa los datos mock.

La cola se mantiene al día sola: se vuelve a pedir después de cada acción hecha desde la
pantalla, cada 10 segundos mientras la pestaña está visible y al volver a ella. Hay un botón
"Actualizar" con la hora de la última consulta. Si el backend falla se conserva la última cola
vista, se avisa y se puede reintentar.

En modo real, además (HU-16 y HU-28):

- Las flechas de cada vehículo en espera lo suben o bajan un lugar (`PATCH /ordenes/{id}/posicion-cola`).
  El backend guarda el orden y rechaza, con el motivo, un movimiento que deje una reserva próxima
  detrás de un espontáneo. Los vehículos en lavado no se reordenan.
- "Demora" registra minutos de demora (y un motivo opcional) sobre un vehículo en espera o en lavado
  (`POST /ordenes/{id}/demoras`). Si la demora obliga a adelantar una reserva, la cola se reorganiza.
- La columna "Estimado" muestra el inicio estimado de los que esperan y el fin estimado de los que
  están en lavado, con la demora acumulada (`GET /lavaderos/{id}/cola/tiempos`). Si esa consulta
  falla, la cola se muestra igual, sin estimaciones.

## Pruebas

```bash
pnpm test
```

Corre las pruebas de los módulos puros de `src/lib` (armado de la cola, etapas y priorización
por reservas) con el runner de Node, que ejecuta el TypeScript sin compilar. Requiere **Node 22.18
o superior**. Por eso los módulos de `src/lib` se importan entre sí con extensión (`./etapas.ts`):
Node no resuelve imports sin extensión.

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
