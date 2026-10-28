// Pruebas de la lógica del seguimiento del cliente (lib/seguimiento.ts). Se corren con `npm test`
// usando el runner de Node, que ejecuta el TypeScript directamente (Node 22.18 o superior).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COMENTARIO_MAXIMO,
  armarCalificacion,
  duracionLegible,
  etapasSeguimiento,
  etiquetaEstrellas,
  falloSeguimiento,
  horariosSeguimiento,
  linkWhatsApp,
  mensajeAvisoListo,
  mensajeDemoraSeguimiento,
  mensajeSeguimiento,
  modoCalificacion,
  resumenEspera,
  seActualizaSolo,
  telefonoWhatsApp,
  urlSeguimiento,
  validarCalificacion,
} from "./seguimiento.ts";

const calificacion = { puntuacion: 4, comentario: "Muy prolijo", calificadaEl: "2026-10-14T14:10:00Z" };

test("las etapas llevan los nombres que ve el cliente", () => {
  assert.deepEqual(
    etapasSeguimiento("EN_ESPERA").map((e) => e.etiqueta),
    ["En espera", "En lavado", "Listo para retirar", "Retirado"],
  );
});

test("se marcan como alcanzadas las etapas hasta el estado de la orden", () => {
  const alcanzadas = (estado) => etapasSeguimiento(estado).map((e) => e.alcanzada);
  assert.deepEqual(alcanzadas("EN_ESPERA"), [true, false, false, false]);
  assert.deepEqual(alcanzadas("EN_PROGRESO"), [true, true, false, false]);
  assert.deepEqual(alcanzadas("LISTO"), [true, true, true, false]);
  assert.deepEqual(alcanzadas("ENTREGADO"), [true, true, true, true]);
});

test("solo la etapa del estado de la orden es la actual, con su etapa del front", () => {
  assert.deepEqual(etapasSeguimiento("LISTO").map((e) => e.actual), [false, false, true, false]);
  const actual = etapasSeguimiento("EN_PROGRESO").find((e) => e.actual);
  assert.equal(actual.estado, "EN_PROGRESO");
  assert.equal(actual.etapa, "LAVADO");
});

test("una orden cancelada no recorre etapas", () => {
  assert.deepEqual(etapasSeguimiento("CANCELADO"), []);
});

test("solo se muestran los horarios que ya ocurrieron, en el orden del servicio", () => {
  const enLavado = horariosSeguimiento({
    llegada: "2026-10-14T12:00:00Z",
    inicioLavado: "2026-10-14T12:20:00Z",
    finLavado: null,
    salida: null,
  });
  assert.deepEqual(enLavado.map((h) => h.etiqueta), ["Llegada", "Inicio del lavado"]);
  assert.equal(enLavado[1].valor, "2026-10-14T12:20:00Z");

  const retirado = horariosSeguimiento({
    llegada: "2026-10-14T12:00:00Z",
    inicioLavado: "2026-10-14T12:20:00Z",
    finLavado: "2026-10-14T13:05:00Z",
    salida: "2026-10-14T13:40:00Z",
  });
  assert.deepEqual(retirado.map((h) => h.clave), ["llegada", "inicioLavado", "finLavado", "salida"]);
});

test("la tarjeta ofrece calificar solo cuando el backend lo permite", () => {
  assert.equal(modoCalificacion({ estado: "LISTO", puedeCalificar: true, calificacion: null }), "formulario");
  assert.equal(modoCalificacion({ estado: "ENTREGADO", puedeCalificar: true, calificacion: null }), "formulario");
});

test("con una calificación guardada la tarjeta queda en solo lectura", () => {
  assert.equal(modoCalificacion({ estado: "ENTREGADO", puedeCalificar: false, calificacion }), "calificada");
});

test("si el servicio no terminó se avisa que podrá calificarlo; si se canceló no se ofrece nada", () => {
  assert.equal(modoCalificacion({ estado: "EN_ESPERA", puedeCalificar: false, calificacion: null }), "pendiente");
  assert.equal(modoCalificacion({ estado: "EN_PROGRESO", puedeCalificar: false, calificacion: null }), "pendiente");
  assert.equal(modoCalificacion({ estado: "CANCELADO", puedeCalificar: false, calificacion: null }), "no-disponible");
});

test("la puntuación tiene que ser un entero de 1 a 5", () => {
  for (const invalida of [null, 0, 6, 3.5, Number.NaN]) {
    assert.equal(validarCalificacion(invalida, ""), "Elegí una puntuación de 1 a 5 estrellas.");
  }
  for (const valida of [1, 3, 5]) {
    assert.equal(validarCalificacion(valida, ""), null);
  }
});

test("el comentario es opcional y puede tener hasta 500 caracteres sin contar los bordes", () => {
  assert.equal(validarCalificacion(5, ""), null);
  assert.equal(validarCalificacion(5, "x".repeat(COMENTARIO_MAXIMO)), null);
  assert.equal(validarCalificacion(5, `  ${"x".repeat(COMENTARIO_MAXIMO)}  `), null);
  assert.equal(
    validarCalificacion(5, "x".repeat(COMENTARIO_MAXIMO + 1)),
    "El comentario puede tener hasta 500 caracteres.",
  );
});

test("el envío lleva el comentario recortado y lo omite si quedó vacío", () => {
  assert.deepEqual(armarCalificacion(5, "  Excelente atención  "), { puntuacion: 5, comentario: "Excelente atención" });
  assert.deepEqual(armarCalificacion(3, "   "), { puntuacion: 3 });
  assert.deepEqual(armarCalificacion(4, ""), { puntuacion: 4 });
});

test("las estrellas se nombran en singular y plural", () => {
  assert.equal(etiquetaEstrellas(1), "1 estrella");
  assert.equal(etiquetaEstrellas(2), "2 estrellas");
  assert.equal(etiquetaEstrellas(5), "5 estrellas");
});

// HU-17: posición y espera estimada.
const espera = {
  posicion: 3,
  esperaEstimadaMin: 25,
  inicioEstimado: "2026-10-23T13:25:00Z",
  finEstimado: "2026-10-23T14:25:00Z",
  puestosActivos: 2,
  sinEstimacion: null,
  calculadaEl: "2026-10-23T13:00:00Z",
};

test("la posición dice cuántos vehículos hay antes", () => {
  assert.equal(resumenEspera(espera).posicion, "Hay 2 vehículos antes que el tuyo");
  assert.equal(resumenEspera({ ...espera, posicion: 2 }).posicion, "Hay 1 vehículo antes que el tuyo");
  assert.equal(resumenEspera({ ...espera, posicion: 1 }).posicion, "Sos el próximo en la fila");
});

test("la espera estimada se muestra con la hora de inicio", () => {
  assert.deepEqual(resumenEspera(espera).espera, {
    texto: "Empieza en unos 25 min",
    inicio: "2026-10-23T13:25:00Z",
  });
});

test("con espera cero puede empezar ya, sin hora", () => {
  assert.deepEqual(resumenEspera({ ...espera, esperaEstimadaMin: 0 }).espera, {
    texto: "Tu lavado puede empezar en cualquier momento",
    inicio: null,
  });
});

test("sin estimación no se inventa un tiempo, pero la posición sigue", () => {
  const resumen = resumenEspera({
    ...espera,
    esperaEstimadaMin: null,
    inicioEstimado: null,
    sinEstimacion: "El lavadero no tiene puestos activos",
  });
  assert.equal(resumen.espera, null);
  assert.equal(resumen.posicion, "Hay 2 vehículos antes que el tuyo");
});

test("las esperas largas se leen en horas", () => {
  assert.equal(duracionLegible(45), "45 min");
  assert.equal(duracionLegible(60), "1 h");
  assert.equal(duracionLegible(95), "1 h 35 min");
});

test("se actualiza sola hasta que el vehículo se retira", () => {
  assert.equal(seActualizaSolo("EN_ESPERA"), true);
  assert.equal(seActualizaSolo("EN_PROGRESO"), true);
  assert.equal(seActualizaSolo("LISTO"), true);
  assert.equal(seActualizaSolo("ENTREGADO"), false);
  assert.equal(seActualizaSolo("CANCELADO"), false);
});

// HU-53: compartir el link de seguimiento.
const destinatario = { nombre: "Martina Gómez", patente: "AE512KD", modelo: "Gol Trend", telefono: "341 555-1234" };
const url = "https://app.lavapp.com/seguimiento/9b2f6c1e-3d4a-4f8b-a1c7-5e0d2b8f6a93";

test("la URL del seguimiento lleva el código escapado", () => {
  assert.equal(urlSeguimiento("https://app.lavapp.com", "a b/c"), "https://app.lavapp.com/seguimiento/a%20b%2Fc");
});

test("los teléfonos argentinos pasan al formato de wa.me", () => {
  assert.equal(telefonoWhatsApp("341 555-1234"), "5493415551234");
  assert.equal(telefonoWhatsApp("0341 5551234"), "5493415551234");
  assert.equal(telefonoWhatsApp("+54 341 555 1234"), "5493415551234");
  assert.equal(telefonoWhatsApp("+54 9 341 555 1234"), "5493415551234");
});

test("un teléfono que no se reconoce no se adivina", () => {
  assert.equal(telefonoWhatsApp("555-1234"), null);
  assert.equal(telefonoWhatsApp(""), null);
  assert.equal(telefonoWhatsApp(null), null);
});

test("el mensaje saluda por el nombre y nombra el vehículo, con el link", () => {
  assert.equal(
    mensajeSeguimiento(destinatario, url),
    `Hola Martina, podés seguir el lavado de tu Gol Trend AE512KD desde este link: ${url}`,
  );
  assert.equal(
    mensajeSeguimiento({ nombre: "", patente: "AE512KD" }, url),
    `Hola, podés seguir el lavado de tu AE512KD desde este link: ${url}`,
  );
});

test("WhatsApp se abre al teléfono del cliente, o sin destinatario si no se reconoce", () => {
  const conTelefono = linkWhatsApp(destinatario, url);
  assert.ok(conTelefono.startsWith("https://wa.me/5493415551234?text="));
  assert.equal(decodeURIComponent(conTelefono.split("text=")[1]), mensajeSeguimiento(destinatario, url));
  assert.ok(linkWhatsApp({ ...destinatario, telefono: null }, url).startsWith("https://wa.me/?text="));
});

test("el aviso de vehículo listo indica el servicio y el link de esa orden", () => {
  const mensaje = mensajeAvisoListo(destinatario, "Lavado completo", url);
  assert.equal(
    mensaje,
    `Hola Martina, tu Gol Trend AE512KD ya está listo para retirar. Servicio: Lavado completo. ` +
      `Podés consultar el detalle acá: ${url}`,
  );
  assert.equal(
    decodeURIComponent(linkWhatsApp(destinatario, url, mensaje).split("text=")[1]),
    mensaje,
  );
});

test("el aviso de listo no inventa un servicio si no vino", () => {
  assert.equal(
    mensajeAvisoListo({ nombre: "Ana", patente: "AB123CD" }, "", url),
    `Hola Ana, tu AB123CD ya está listo para retirar. Podés consultar el detalle acá: ${url}`,
  );
});

test("el aviso manual de demora indica el servicio, el nuevo horario y solo el link de esa orden", () => {
  const finEstimado = "2026-10-24T16:30:00Z";
  const mensaje = mensajeDemoraSeguimiento(destinatario, "Lavado completo", finEstimado, url);
  assert.ok(mensaje.startsWith("Hola Martina, hubo una demora en el servicio Lavado completo"));
  assert.ok(mensaje.includes("Gol Trend AE512KD"));
  assert.ok(mensaje.includes(new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(finEstimado))));
  assert.ok(mensaje.endsWith(url));
  assert.equal(
    decodeURIComponent(linkWhatsApp(destinatario, url, mensaje).split("text=")[1]),
    mensaje,
  );
});

// HT-07: por qué no se pudo mostrar el seguimiento.
test("cada status del backend tiene su motivo; lo desconocido es un error", () => {
  assert.equal(falloSeguimiento(404), "inexistente");
  assert.equal(falloSeguimiento(410), "vencido");
  assert.equal(falloSeguimiento(429), "limitado");
  assert.equal(falloSeguimiento(500), "error");
  assert.equal(falloSeguimiento(null), "error");
});
