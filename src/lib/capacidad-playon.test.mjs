import { test } from "node:test";
import assert from "node:assert/strict";
import {
  lecturaCapacidadFallida,
  porcentajeCapacidadPlayon,
  textoCapacidadPlayon,
} from "./capacidad-playon.ts";

test("sin lectura o con error no se muestra un playón inventado", () => {
  assert.equal(textoCapacidadPlayon(null), "—");
  assert.equal(textoCapacidadPlayon({ estado: "error" }), "—");
  assert.equal(porcentajeCapacidadPlayon(null), null);
  assert.equal(porcentajeCapacidadPlayon({ estado: "error" }), null);
});

test("sin capacidad configurada se dice así, y no 0/0", () => {
  const lectura = { estado: "sin-configurar" };
  assert.equal(textoCapacidadPlayon(lectura), "Sin configurar");
  assert.equal(porcentajeCapacidadPlayon(lectura), null);
  assert.deepEqual(lecturaCapacidadFallida(409), lectura);
});

test("el número es ocupados sobre el máximo real", () => {
  const lectura = { estado: "ok", ocupados: 1, maximo: 4 };
  assert.equal(textoCapacidadPlayon(lectura), "1/4");
  assert.equal(porcentajeCapacidadPlayon(lectura), 25);
});

test("otro error de la API no se trata como playón sin configurar", () => {
  assert.deepEqual(lecturaCapacidadFallida(500), { estado: "error" });
  assert.equal(porcentajeCapacidadPlayon({ estado: "ok", ocupados: 1, maximo: 0 }), null);
});
