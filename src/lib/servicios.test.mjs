// Pruebas de las reglas de la duración estimada (lib/servicios.ts, HU-54). Se corren con `pnpm test`
// (runner de Node).
import { test } from "node:test";
import assert from "node:assert/strict";
import { DURACION_MAXIMA_MIN, DURACION_MINIMA_MIN, cambioLaDuracion, validarDuracion } from "./servicios.ts";

test("una duración entera dentro del rango se acepta, con los extremos incluidos", () => {
  assert.deepEqual(validarDuracion("45"), { ok: true, minutos: 45 });
  assert.deepEqual(validarDuracion(" 1 "), { ok: true, minutos: DURACION_MINIMA_MIN });
  assert.deepEqual(validarDuracion("120"), { ok: true, minutos: DURACION_MAXIMA_MIN });
});

test("vacía no se acepta", () => {
  assert.deepEqual(validarDuracion("   "), { ok: false, mensaje: "Ingresá la duración en minutos." });
});

test("negativa, con decimales o que no es un número no se acepta", () => {
  for (const texto of ["-5", "30.5", "30,5", "media hora", "1e2"]) {
    assert.equal(validarDuracion(texto).ok, false, texto);
  }
});

test("cero o más de 120 minutos no se acepta, y el mensaje dice el rango", () => {
  for (const texto of ["0", "121", "600"]) {
    assert.deepEqual(validarDuracion(texto), {
      ok: false,
      mensaje: "La duración tiene que estar entre 1 y 120 minutos.",
    });
  }
});

test("sin cambios respecto de lo guardado no hay nada que enviar", () => {
  assert.equal(cambioLaDuracion("45", 45), false);
  assert.equal(cambioLaDuracion(" 45 ", 45), false);
  assert.equal(cambioLaDuracion("60", 45), true);
  assert.equal(cambioLaDuracion("", 45), true);
});
