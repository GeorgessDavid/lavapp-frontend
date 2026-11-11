// Pruebas de la lógica del historial de servicios (lib/historial.ts). Se corren con `pnpm test`
// usando el runner de Node, que ejecuta el TypeScript directamente (Node 22.18 o superior).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  agruparEnFichas,
  claveDeFicha,
  describirVehiculo,
  normalizarPatente,
  resumirHistorial,
  validarBusqueda,
} from "./historial.ts";

const atencion = (ordenId, fecha, { clienteId = 10, clienteNombre = "Ana Pérez", vehiculoId = 20, patente = "AB123CD", servicioNombre = "Lavado completo" } = {}) => ({
  ordenId, fecha: `2026-10-${fecha}Z`, salida: null, servicioId: 30, servicioNombre, servicioPrecio: 12500,
  vehiculoId, patente, marca: "Toyota", modelo: "Etios", clienteId, clienteNombre,
});

test("la patente se normaliza sin espacios ni guiones y en mayúsculas, como en el backend", () => {
  assert.equal(normalizarPatente(" ab 123-cd "), "AB123CD");
  assert.equal(normalizarPatente("aa-000-aa"), "AA000AA");
});

test("por patente: manda la patente normalizada y muestra lo escrito en mayúsculas", () => {
  assert.deepEqual(validarBusqueda("patente", " ab 123-cd "), {
    ok: true, criterio: { patente: "AB123CD" }, dato: "AB 123-CD",
  });
});

test("una patente vacía o hecha solo de separadores no se busca", () => {
  for (const texto of ["", "   ", " - "]) {
    assert.deepEqual(validarBusqueda("patente", texto), { ok: false, error: "Ingresá una patente para buscar." });
  }
});

test("por cliente: recorta el texto y manda solo ese criterio", () => {
  const busqueda = validarBusqueda("cliente", "  Ana Pé  ");
  assert.deepEqual(busqueda, { ok: true, criterio: { cliente: "Ana Pé" }, dato: "Ana Pé" });
  assert.deepEqual(Object.keys(busqueda.criterio), ["cliente"]);
});

test("un nombre de cliente de menos de 2 letras no se busca", () => {
  for (const texto of ["", " a "]) {
    const busqueda = validarBusqueda("cliente", texto);
    assert.equal(busqueda.ok, false);
    assert.match(busqueda.error, /al menos 2 letras/);
  }
});

test("el vehículo se describe con marca y modelo, o con lo que haya", () => {
  assert.equal(describirVehiculo({ marca: "Toyota", modelo: "Etios" }), "Toyota Etios");
  assert.equal(describirVehiculo({ marca: null, modelo: "Etios" }), "Etios");
  assert.equal(describirVehiculo({ marca: " ", modelo: null }), null);
});

test("dos clientes homónimos y una clienta con dos autos son tres fichas que no se mezclan", () => {
  const atenciones = [
    atencion(1, "05T10:00:00", { clienteId: 10, vehiculoId: 20, patente: "AB123CD" }),
    atencion(2, "04T10:00:00", { clienteId: 11, vehiculoId: 21, patente: "AC456EF" }),
    atencion(3, "03T10:00:00", { clienteId: 10, vehiculoId: 22, patente: "AD789GH" }),
    atencion(4, "02T10:00:00", { clienteId: 10, vehiculoId: 20, patente: "AB123CD", servicioNombre: "Encerado" }),
  ];

  const fichas = agruparEnFichas(atenciones);

  assert.deepEqual(fichas.map((f) => [f.clienteId, f.patente, f.servicios]), [
    [10, "AB123CD", 2],
    [11, "AC456EF", 1],
    [10, "AD789GH", 1],
  ]);
  for (const ficha of fichas) {
    assert.equal(claveDeFicha(ficha.ultima), ficha.clave);
  }
  assert.equal(fichas[0].ultima.ordenId, 1);
  assert.equal(fichas[0].vehiculo, "Toyota Etios");
});

test("el último servicio es el más reciente aunque lleguen desordenados", () => {
  const atenciones = [
    atencion(4, "02T10:00:00", { servicioNombre: "Encerado" }),
    atencion(7, "06T09:30:00", { servicioNombre: "Lavado de motor" }),
    atencion(5, "03T10:00:00"),
  ];

  assert.equal(agruparEnFichas(atenciones)[0].ultima.ordenId, 7);
  assert.equal(resumirHistorial(atenciones).ultima.servicioNombre, "Lavado de motor");
});

test("el resumen cuenta servicios, clientes y vehículos distintos", () => {
  const resumen = resumirHistorial([
    atencion(1, "05T10:00:00", { clienteId: 10, vehiculoId: 20 }),
    atencion(2, "04T10:00:00", { clienteId: 11, vehiculoId: 21 }),
    atencion(3, "03T10:00:00", { clienteId: 10, vehiculoId: 20 }),
  ]);

  assert.equal(resumen.servicios, 3);
  assert.equal(resumen.clientes, 2);
  assert.equal(resumen.vehiculos, 2);
  assert.equal(resumen.ultima.ordenId, 1);
});

test("sin antecedentes no hay fichas y el resumen queda vacío", () => {
  assert.deepEqual(agruparEnFichas([]), []);
  assert.deepEqual(resumirHistorial([]), { servicios: 0, clientes: 0, vehiculos: 0, ultima: null });
});
