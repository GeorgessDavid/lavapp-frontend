// Pruebas del armado de la cola (lib/cola.ts). Se corren con `npm test` usando el runner de Node,
// que ejecuta el TypeScript directamente (Node 22.18 o superior).
import { test } from "node:test";
import assert from "node:assert/strict";
import { armarFilasBackend, armarFilasLocales, contarCola, esperando, idDeFila } from "./cola.ts";

const orden = (ordenId, estado, patente = `P${ordenId}`) => ({
  ordenId, estado, patente, ingreso: "2026-10-06T12:00:00Z", modelo: "Polo", clienteNombre: "Ana",
  clienteTelefono: "11", servicioNombre: "Lavado", servicioPrecio: 1, empleadoNombre: null,
  tipoIngreso: "ESPONTANEO", horarioReserva: null, servicioDuracionMin: 30,
});
const atencion = (id, estado) => ({ id, estado, vehiculoId: `v-${id}`, clienteId: "c1", servicioIds: ["s1"], fechaIngreso: "2026-10-06T12:00:00Z", origen: "WALK_IN" });

test("modo real: primero las que esperan en el orden del backend, después en lavado y listas", () => {
  const filas = armarFilasBackend({
    enEspera: [orden(7, "EN_ESPERA"), orden(3, "EN_ESPERA")],
    enLavado: [orden(9, "EN_PROGRESO")],
    listas: [orden(1, "LISTO")],
  });
  assert.deepEqual(filas.map((f) => f.orden.ordenId), [7, 3, 9, 1]);
  assert.deepEqual(filas.map((f) => f.estado), ["EN_ESPERA", "EN_ESPERA", "LAVADO", "LISTO"]);
});

test("solo las que esperan llevan posición, y es su lugar en la cola", () => {
  const filas = armarFilasBackend({
    enEspera: [orden(7, "EN_ESPERA"), orden(3, "EN_ESPERA")],
    enLavado: [orden(9, "EN_PROGRESO")],
    listas: [orden(1, "LISTO")],
  });
  assert.deepEqual(filas.map((f) => f.posicion), [1, 2, null, null]);
});

test("si un vehículo deja de esperar, las posiciones se corren", () => {
  const antes = armarFilasBackend({ enEspera: [orden(7, "EN_ESPERA"), orden(3, "EN_ESPERA")], enLavado: [], listas: [] });
  const despues = armarFilasBackend({ enEspera: [orden(3, "EN_ESPERA")], enLavado: [orden(7, "EN_PROGRESO")], listas: [] });
  assert.equal(antes.find((f) => f.orden.ordenId === 3).posicion, 2);
  assert.equal(despues.find((f) => f.orden.ordenId === 3).posicion, 1);
  assert.equal(despues.find((f) => f.orden.ordenId === 7).posicion, null);
});

test("cola vacía: sin filas y totales en cero", () => {
  const filas = armarFilasBackend({ enEspera: [], enLavado: [], listas: [] });
  assert.deepEqual(filas, []);
  assert.deepEqual(contarCola(filas), { enEspera: 0, enLavado: 0, listos: 0 });
});

test("los totales cuentan por estado, y las etapas intermedias del mock son 'en lavado'", () => {
  const filas = armarFilasLocales(
    [atencion("a1", "EN_ESPERA"), atencion("a2", "EN_ESPERA")],
    [atencion("a3", "LAVADO"), atencion("a4", "INTERIOR"), atencion("a5", "TERMINACIONES"), atencion("a6", "LISTO")],
  );
  assert.deepEqual(contarCola(filas), { enEspera: 2, enLavado: 3, listos: 1 });
  assert.deepEqual(filas.map((f) => f.posicion), [1, 2, null, null, null, null]);
});

test("modo mock: las que esperan quedan en el orden priorizado que se les pasa", () => {
  const filas = armarFilasLocales([atencion("b", "EN_ESPERA"), atencion("a", "EN_ESPERA")], []);
  assert.deepEqual(filas.map((f) => f.atencion.id), ["b", "a"]);
  assert.ok(filas.every(esperando));
});

test("cada fila tiene un id estable para React", () => {
  const [local] = armarFilasLocales([atencion("a1", "EN_ESPERA")], []);
  const [backend] = armarFilasBackend({ enEspera: [orden(7, "EN_ESPERA")], enLavado: [], listas: [] });
  assert.equal(idDeFila(local), "a1");
  assert.equal(idDeFila(backend), "orden-7");
});
