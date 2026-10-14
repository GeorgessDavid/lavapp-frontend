// Pruebas de la lógica de las acciones de la cola operativa (lib/cola-operativa.ts): reordenar
// (HU-16) y registrar demoras (HU-28). Se corren con `pnpm test` (runner de Node).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEMORA_MAX,
  indexarTiempos,
  mensajeDemora,
  posicionDestino,
  validarDemora,
} from "./cola-operativa.ts";

test("subir y bajar llevan a la posición vecina", () => {
  assert.equal(posicionDestino(3, -1, 5), 2);
  assert.equal(posicionDestino(3, 1, 5), 4);
});

test("en los bordes de la cola no hay a dónde mover", () => {
  assert.equal(posicionDestino(1, -1, 5), null);
  assert.equal(posicionDestino(5, 1, 5), null);
  assert.equal(posicionDestino(1, 1, 1), null);
});

test("una fila sin posición (en lavado o lista) no se mueve", () => {
  assert.equal(posicionDestino(null, -1, 5), null);
});

test("la demora tiene que ser un entero de 1 a 240 minutos", () => {
  assert.equal(validarDemora(15, ""), null);
  assert.equal(validarDemora(DEMORA_MAX, "Falta de agua"), null);
  assert.match(validarDemora(0, ""), /entre 1 y 240/);
  assert.match(validarDemora(241, ""), /entre 1 y 240/);
  assert.match(validarDemora(7.5, ""), /entre 1 y 240/);
  assert.match(validarDemora(Number.NaN, ""), /entre 1 y 240/);
});

test("el motivo es opcional pero tiene un máximo", () => {
  assert.equal(validarDemora(10, "   "), null);
  assert.match(validarDemora(10, "x".repeat(256)), /255 caracteres/);
});

test("los tiempos se buscan por orden", () => {
  const tiempos = indexarTiempos([
    { ordenId: 7, estado: "EN_ESPERA", posicion: 1, demoraMin: 0, inicioEstimado: "2026-10-14T13:00:00Z", finEstimado: "2026-10-14T13:30:00Z", esperaEstimadaMin: 0 },
    { ordenId: 9, estado: "EN_PROGRESO", posicion: null, demoraMin: 15, inicioEstimado: "2026-10-14T12:40:00Z", finEstimado: "2026-10-14T13:25:00Z", esperaEstimadaMin: 0 },
  ]);
  assert.equal(tiempos.get(9).demoraMin, 15);
  assert.equal(tiempos.get(7).posicion, 1);
  assert.equal(tiempos.get(1), undefined);
});

test("el aviso de la demora dice si la cola se reorganizó", () => {
  assert.equal(mensajeDemora("AE123FG", 15, false), "Demora de 15 min registrada para AE123FG.");
  assert.match(mensajeDemora("AE123FG", 30, true), /La cola se reorganizó/);
});
