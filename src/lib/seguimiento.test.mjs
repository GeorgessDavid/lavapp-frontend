// Pruebas de la lógica del seguimiento del cliente (lib/seguimiento.ts). Se corren con `npm test`
// usando el runner de Node, que ejecuta el TypeScript directamente (Node 22.18 o superior).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COMENTARIO_MAXIMO,
  armarCalificacion,
  etapasSeguimiento,
  etiquetaEstrellas,
  horariosSeguimiento,
  modoCalificacion,
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
