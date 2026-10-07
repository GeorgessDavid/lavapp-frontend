import { test } from "node:test";
import assert from "node:assert/strict";
import { ETAPAS_EN_LAVADO, estaEnLavado, etapaDeOrden, tieneEtapaIntermedia } from "./etapas.ts";

test("en lavado son las tres etapas intermedias del flujo local", () => {
  assert.deepEqual(ETAPAS_EN_LAVADO, ["LAVADO", "INTERIOR", "TERMINACIONES"]);
  assert.deepEqual(["EN_ESPERA", "LAVADO", "INTERIOR", "TERMINACIONES", "LISTO", "RETIRADO"].map(estaEnLavado), [false, true, true, true, false, false]);
});

test("a Listo solo se llega finalizando: Terminaciones no tiene etapa siguiente", () => {
  assert.deepEqual(["LAVADO", "INTERIOR", "TERMINACIONES", "EN_ESPERA", "LISTO"].map(tieneEtapaIntermedia), [true, true, false, false, false]);
});

test("los estados del backend se proyectan sobre las etapas del front", () => {
  assert.deepEqual(["EN_ESPERA", "EN_PROGRESO", "LISTO", "ENTREGADO", "CANCELADO"].map(etapaDeOrden), ["EN_ESPERA", "LAVADO", "LISTO", "RETIRADO", "RETIRADO"]);
});
