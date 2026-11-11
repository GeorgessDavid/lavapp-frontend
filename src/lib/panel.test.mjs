import { test } from "node:test";
import assert from "node:assert/strict";
import { coincideBusqueda, contarPuestosOcupados, textoPuestos } from "./panel.ts";

const fila = {
  patente: "AE512KD",
  vehiculo: "Volkswagen Gol Trend",
  cliente: "Martina Gómez",
  telefono: "1155551234",
};

test("un puesto ocupado es el que tiene un vehículo que todavía no se retiró", () => {
  assert.equal(
    contarPuestosOcupados([
      { puestoId: 1, estado: "EN_ESPERA" },
      { puestoId: 1, estado: "LISTO" },
      { puestoId: null, estado: "EN_PROGRESO" },
      { puestoId: 2, estado: "ENTREGADO" },
      { puestoId: 3, estado: "CANCELADO" },
    ]),
    1,
  );
  assert.equal(textoPuestos(0, 1), "0/1");
});

test("la búsqueda encuentra al cliente, al auto o a la patente aunque tenga espacios", () => {
  assert.equal(coincideBusqueda(fila, ""), true);
  assert.equal(coincideBusqueda(fila, "martina"), true);
  assert.equal(coincideBusqueda(fila, "gol"), true);
  assert.equal(coincideBusqueda(fila, "ae 512 kd"), true);
  assert.equal(coincideBusqueda(fila, "115555"), true);
  assert.equal(coincideBusqueda(fila, "ford"), false);
});
