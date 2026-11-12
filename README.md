# LavApp | Front-end

Interfaz web de LavApp para la gestión operativa de lavaderos de autos: reservas, ingresos, cola
de vehículos, puestos, capacidad del playón, historial y seguimiento del servicio por parte del
cliente. Consume la API del back-end Spring Boot (`lavapp-backend`).

## Stack

- [Next.js](https://nextjs.org) 16 (App Router) con React 19 y TypeScript.
- Tailwind CSS 4.
- Íconos de `lucide-react`.
- Pruebas con el runner nativo de Node (`node --test`).

> Esta versión de Next.js tiene cambios respecto de las anteriores. Antes de tocar código propio
> del framework conviene leer la guía correspondiente en `node_modules/next/dist/docs/`.

## Requisitos

- **Node 22.18 o superior** (necesario para las pruebas, que ejecutan TypeScript sin compilar).
- [pnpm](https://pnpm.io).
- Para el modo real: el back-end corriendo (ver más abajo).

## Puesta en marcha

```bash
pnpm install
cp .env.example .env.local      # configurar las variables (ver tabla)
pnpm dev                        # http://localhost:3000
```

Sin `.env.local`, o con `NEXT_PUBLIC_USE_MOCK` distinto de `false`, la app corre en **modo demo**
con datos mock y no necesita back-end. El login de demo ya viene completado con un usuario de
prueba.

Para usar la API real, `NEXT_PUBLIC_USE_MOCK=false` y el back-end levantado (ver
`lavapp-backend/README.md`: MySQL + Redis con `docker compose up -d` y `mvnw spring-boot:run`),
con al menos un usuario cargado en la tabla `usuarios`; cómo crearlo está en ese README.

Abrir siempre `http://localhost:3000` (no `127.0.0.1`): el back-end habilita ese origen para CORS
con credenciales (`FRONTEND_ORIGINS`) y la cookie de sesión `SameSite=Lax` requiere el mismo sitio.

### Scripts

| Comando      | Qué hace                                         |
|--------------|--------------------------------------------------|
| `pnpm dev`   | Servidor de desarrollo en `http://localhost:3000` |
| `pnpm build` | Build de producción                              |
| `pnpm start` | Sirve el build de producción                     |
| `pnpm lint`  | ESLint                                           |
| `pnpm test`  | Pruebas de los módulos de `src/lib`              |

### Variables de entorno

| Variable                   | Default                 | Descripción                                                                 |
|----------------------------|-------------------------|-----------------------------------------------------------------------------|
| `NEXT_PUBLIC_USE_MOCK`     | `true`                  | `false` para usar la API real; cualquier otro valor es modo demo            |
| `NEXT_PUBLIC_API_URL`      | `http://localhost:8080` | URL base del back-end (`/api` en producción, ver abajo)                     |
| `API_ORIGIN`               | —                       | Solo producción: origen del back-end al que Next reenvía `/api/*`           |
| `NEXT_PUBLIC_LAVADERO_ID`  | `1`                     | Lavadero que usan reservas e ingresos si la sesión no trae uno              |

### Producción (Vercel)

Si el front y el back-end están en dominios distintos, el navegador descarta la cookie de sesión.
Para evitarlo, `next.config.ts` reenvía `/api/*` al back-end cuando está definida `API_ORIGIN`, y
el front llama a su propio dominio:

```bash
NEXT_PUBLIC_USE_MOCK=false
NEXT_PUBLIC_API_URL=/api
API_ORIGIN=https://<host-del-backend>
```

Sin `API_ORIGIN` (desarrollo local) no hay rewrite y se usa `NEXT_PUBLIC_API_URL` tal cual.

## Estructura

```
src/
├── app/
│   ├── (operador)/      Pantallas del lavadero (con menú lateral, requieren sesión)
│   ├── admin/lavaderos/ Alta de lavaderos y usuarios (administrador de LavApp)
│   ├── flotas/          Vista de empresas con flota (solo modo demo)
│   ├── login/
│   └── seguimiento/     Página pública que abre el cliente con su link
├── components/          Componentes de UI por dominio (cola, seguimiento, panel, admin…)
└── lib/
    ├── api*.ts          Clientes de la API del back-end
    ├── store.tsx        Estado global: sesión, plan y datos del modo demo
    ├── mock-data.ts     Datos del modo demo
    ├── permisos.ts      Qué ve y qué puede hacer cada rol
    ├── plans.ts         Planes y funcionalidades que habilita cada uno
    └── *.ts / *.test.mjs  Lógica pura (cola, etapas, tiempos, historial…) y sus pruebas
```

## Autenticación, roles y planes

La sesión es una cookie `LAVAPP_SESSION` (HttpOnly) que emite el back-end; el front no guarda
tokens. Todas las requests van con `credentials: "include"`.

- Login: `POST /auth/authenticate` → usuario `{ id, email, rol, lavaderoId }`.
- Al cargar la app: `GET /auth/me` confirma la sesión (401 → vuelve al login).
- Cerrar sesión: `POST /auth/logout`.
- Cualquier 401 posterior (sesión expirada, usuario desactivado) cierra la sesión local.
- Si se abre una ruta protegida sin sesión, después del login se vuelve a esa ruta (`?next=`),
  siempre que sea interna y el usuario pueda abrirla.

Los roles del back-end se mapean a los del front: `DUENO_LAVADERO` y `ADMIN_LAVAPP` → `DUENO`;
`ENCARGADO` y `EMPLEADO` → `OPERADOR`. `FLOTA` existe solo en el modo demo.

`src/lib/permisos.ts` replica las reglas del back-end para no mostrar pantallas que van a
responder 403 (el back-end las vuelve a validar):

| Ruta               | Quién puede abrirla                          |
|--------------------|----------------------------------------------|
| `/plan`, `/reportes` | Dueño de lavadero y administrador de LavApp |
| `/servicios`       | Los anteriores y el encargado                |
| `/admin/lavaderos` | Administrador de LavApp                      |
| El resto           | Cualquier usuario con sesión                 |

Además, el menú bloquea las secciones que el plan del lavadero no incluye (Básico, Pro, Empresa;
ver `src/lib/plans.ts`). `/plan` muestra el plan contratado (`GET /lavaderos/{id}/plan`); el
cambio de plan solo se puede simular en modo demo.

## Pantallas

| Ruta                     | Contenido                                                     | Fuente de datos      |
|--------------------------|---------------------------------------------------------------|----------------------|
| `/dashboard`             | Panel operativo: cola, puestos y demoras                      | API / mock           |
| `/capacidad`             | Capacidad del playón                                          | API / mock           |
| `/cola`                  | Cola de vehículos                                             | API / mock           |
| `/ingresos`              | Ingreso sin reserva y llegada con reserva                     | API / mock           |
| `/puestos`               | Asignación de puestos e inicio del lavado                     | API                  |
| `/reservas`              | Agenda: alta, edición y cancelación de reservas               | API (también en demo) |
| `/historial`             | Historial de servicios                                        | API / mock           |
| `/vehiculos`             | Clientes y vehículos                                          | API / mock           |
| `/servicios`             | Duración de los servicios                                     | API / mock           |
| `/plan`                  | Plan contratado                                               | API / mock           |
| `/reportes`              | Reportes del negocio                                          | mock                 |
| `/fidelizacion`          | Promociones y clientes frecuentes/inactivos                   | mock                 |
| `/admin/lavaderos`       | Alta de lavaderos y usuarios                                  | API                  |
| `/flotas`                | Empresas con flota                                            | mock                 |
| `/seguimiento/{codigo}`  | Seguimiento público del cliente                               | API / mock           |

### Cola de vehículos

`/cola` muestra lo que dice el back-end (`GET /lavaderos/{id}/ordenes?estado=`): primero los
vehículos en espera, en el orden priorizado que devuelve la API y numerados por su posición,
después los que están en lavado y los listos para retirar. En modo demo usa los datos mock.

La cola se mantiene al día sola: se vuelve a pedir después de cada acción hecha desde la
pantalla, cada 10 segundos mientras la pestaña está visible y al volver a ella. Hay un botón
"Actualizar" con la hora de la última consulta. Si el back-end falla se conserva la última cola
vista, se avisa y se puede reintentar.

En modo real, además (HU-16, HU-17, HU-28 y HT-10):

- Las flechas de cada vehículo en espera lo suben o bajan un lugar (`PATCH /ordenes/{id}/posicion-cola`).
  El back-end guarda el orden y rechaza, con el motivo, un movimiento que deje una reserva próxima
  detrás de un espontáneo. Los vehículos en lavado no se reordenan.
- "Demora" registra minutos de demora (y un motivo opcional) sobre un vehículo en espera o en lavado
  (`POST /ordenes/{id}/demoras`). Si la demora obliga a adelantar una reserva, la cola se reorganiza.
  Cuando el fin estimado cambia, el diálogo informa el nuevo horario y permite abrir WhatsApp con
  un mensaje preparado para que el operador lo revise y lo envíe manualmente; no se envía nada
  automáticamente. El seguimiento del mismo servicio muestra el fin recalculado al actualizarse.
- La columna "Estimado" muestra el inicio estimado de los que esperan y el fin estimado de los que
  están en lavado, con la demora acumulada (`GET /lavaderos/{id}/cola/tiempos`). Si esa consulta
  falla, la cola se muestra igual, sin estimaciones. Si el back-end no pudo estimar un tiempo (sin
  puestos activos, o un servicio sin duración), la fila dice "Sin estimar" con el motivo: nunca
  "Puede empezar ya" (`lecturaTiempo` en `src/lib/cola-operativa.ts`). Cada fila dice además en qué
  puesto se asume que se atiende y, si una reserva que todavía no llegó le corrió el inicio,
  "Después de la reserva de las HH:MM".
- En las órdenes listas, "Avisar por WhatsApp" prepara el mensaje para el cliente y el operador
  confirma después que lo envió; la confirmación queda registrada en el back-end (ver `HU-36.md`).

### Capacidad del playón

La tarjeta "Capacidad del playón" en modo real sale de `GET /lavaderos/{id}/capacidad`
(ocupados sobre el máximo). Si el lavadero todavía no tiene máximo, dice "Sin configurar".
En modo demo sigue el playón del mock. Lo mismo muestra la tarjeta y el anillo de `/ingresos`.

`/dashboard` en modo real arma la cola, los puestos y las demoras con las órdenes del lavadero.
`/vehiculos` lista los clientes y vehículos cargados. El buscador del encabezado filtra esa lista
y la campana se enciende solo si hay una demora registrada en la cola.

### Llegada con reserva (HU-03)

`/ingresos` permite buscar una reserva activa por nombre parcial, patente o código y confirmar la
llegada sin volver a cargar datos. Detalle y pasos de prueba en `docs/HU-03.md`.

### Historial de servicios (HU-39)

`/historial` consulta los servicios anteriores del lavadero de la sesión
(`GET /lavaderos/{id}/historial`). Se busca por patente (completa, con o sin espacios y guiones)
o por una parte del nombre del cliente (desde 2 letras), y la búsqueda es a pedido, sin sondeo.
Solo aparecen atenciones cerradas: vehículos ya retirados.

La tabla muestra fecha y hora de llegada, patente, vehículo, cliente y servicio. La ficha resume
cuántos servicios hay y cuál fue el último; si los resultados traen varios clientes o vehículos
(dos clientes con el mismo nombre, o un cliente con dos autos), muestra una ficha para cada uno y
permite ver en la tabla solo los suyos. Sin antecedentes avisa que no hay registros. En modo demo
la pantalla usa los datos mock.

### Duración de los servicios (HU-54)

`/servicios` lista los servicios del lavadero con su duración estimada y deja editarla de a uno
(`PATCH /lavaderos/{id}/servicios/{sid}/duracion`). Acepta enteros de 1 a 120 minutos, las mismas
reglas del back-end (`validarDuracion` en `src/lib/servicios.ts`); cada servicio se guarda por
separado. Esa duración es la que usan la espera y el horario estimado de la cola y del seguimiento
del cliente. En modo demo usa los servicios del mock y los cambios no se guardan.

### Seguimiento del cliente (HU-43, HU-17, HU-53 y HT-07)

`/seguimiento/{codigo}` es la página que abre el cliente con el link de su orden. Es pública: no
usa la sesión ni el store, pide la orden a `GET /seguimiento/{codigo}` y muestra el vehículo, las
etapas (En espera, En lavado, Listo para retirar, Retirado), los horarios que ya ocurrieron y la
calificación. Con el servicio finalizado y sin calificar, el cliente elige de 1 a 5 estrellas y
puede dejar un comentario de hasta 500 caracteres; el botón se deshabilita mientras se envía, así
un doble clic no manda dos calificaciones. Si ya calificó, ve su calificación en solo lectura; si
el servicio todavía no terminó, se le avisa que va a poder calificarlo cuando esté finalizado.

Mientras el vehículo está en espera, la página muestra su lugar en la fila, cuántos vehículos hay
antes y cuánto falta para que empiece el lavado, con la hora aproximada. Sale del bloque `espera`
de la respuesta, que el back-end calcula con la misma cola que ve el coordinador. Si no hay datos
para estimar, se muestra el lugar en la fila y se avisa que todavía no se puede estimar cuánto
falta, sin inventar un tiempo. Para las órdenes activas también muestra el fin estimado actual,
recalculado por el back-end. Hasta que el vehículo se retira, la página vuelve a pedir el
seguimiento cada 15 segundos con la pestaña visible y al volver a ella.

El link vence cuando el vehículo se retira o la atención se cancela: el back-end responde 410 y la
página dice "Este link ya no está disponible", sin datos del cliente, aunque estuviera abierta. Si
desde una conexión se consulta demasiado (429), explica que espere un minuto y deja reintentar. La
página no se indexa en buscadores y no manda su URL como Referer a otros sitios
(`src/app/seguimiento/[token]/layout.tsx`).

El coordinador obtiene el link desde la acción "Link" de cada vehículo en espera, en lavado o
listo en `/cola`, sea espontáneo o con reserva, y también al confirmar la llegada de una reserva
en `/ingresos`. El panel muestra la URL completa y deja copiarla, mandarla por WhatsApp (`wa.me`
con el mensaje armado; un teléfono argentino de 10 dígitos pasa a 549 + número, y si no se
reconoce se abre WhatsApp sin destinatario) y, donde el navegador tiene menú de compartir, usar
ese menú. El mensaje solo lleva el nombre del cliente, su vehículo y el link (`mensajeSeguimiento`
en `src/lib/seguimiento.ts`). En modo demo la página usa los datos mock y el panel no muestra el
link.

## Pruebas

```bash
pnpm test
```

Corre las pruebas de los módulos puros de `src/lib` (cola, etapas, priorización por reservas,
capacidad, historial, permisos, seguimiento, servicios, panel) con el runner de Node, que ejecuta
el TypeScript sin compilar. Por eso los módulos de `src/lib` se importan entre sí con extensión
(`./etapas.ts`): Node no resuelve imports sin extensión.

## Documentación adicional

- [`docs/HU-03.md`](docs/HU-03.md): llegada con reserva.
- [`HU-36.md`](HU-36.md): aviso de vehículo listo por WhatsApp manual.

## Licencia

Ver [`LICENSE`](LICENSE).
