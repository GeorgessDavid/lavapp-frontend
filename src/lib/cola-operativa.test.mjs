// Pruebas de la lógica de las acciones de la cola operativa (lib/cola-operativa.ts): reordenar
// (HU-16) y registrar demoras (HU-28). Se corren con `pnpm test` (runner de Node).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEMORA_MAX,
  SIN_DATOS_PARA_ESTIMAR,
  indexarTiempos,
  lecturaTiempo,
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

// HU-17: el backend manda null lo que no pudo estimar; la cola no lo convierte en "ya".
const tiempoBase = {
  ordenId: 1,
  estado: "EN_ESPERA",
  posicion: 1,
  demoraMin: 0,
  inicioEstimado: "2026-10-23T13:00:00Z",
  finEstimado: "2026-10-23T13:45:00Z",
  esperaEstimadaMin: 0,
  sinEstimacion: null,
  puestoId: 2,
  puestoNombre: "Puesto 2",
  reservaPrevia: null,
};

test("en espera con todo estimado: hora de inicio y la espera", () => {
  assert.deepEqual(lecturaTiempo({ ...tiempoBase, esperaEstimadaMin: 15 }), {
    tipo: "estimado",
    etiqueta: "Empieza",
    hora: "2026-10-23T13:00:00Z",
    esperaMin: 15,
    puesto: "Puesto 2",
    reservaPrevia: null,
  });
});

test("en espera sin estimar: no dice que puede empezar ya, dice por qué", () => {
  const lectura = lecturaTiempo({
    ...tiempoBase,
    inicioEstimado: null,
    finEstimado: null,
    esperaEstimadaMin: null,
    sinEstimacion: "El lavadero no tiene puestos activos",
  });
  assert.deepEqual(lectura, { tipo: "sin-estimar", motivo: "El lavadero no tiene puestos activos" });
});

test("sin motivo del backend se usa uno genérico", () => {
  const lectura = lecturaTiempo({ ...tiempoBase, inicioEstimado: null, esperaEstimadaMin: null });
  assert.deepEqual(lectura, { tipo: "sin-estimar", motivo: SIN_DATOS_PARA_ESTIMAR });
});

test("en lavado: hora de fin, o sin estimar si el servicio no tiene duración", () => {
  const enLavado = { ...tiempoBase, estado: "EN_PROGRESO", posicion: null };
  assert.equal(lecturaTiempo(enLavado).etiqueta, "Termina");
  assert.equal(lecturaTiempo(enLavado).esperaMin, null);
  assert.equal(
    lecturaTiempo({ ...enLavado, finEstimado: null, sinEstimacion: "Sin duración" }).tipo,
    "sin-estimar",
  );
});

test("un servicio sin duración en espera conserva su hora de inicio", () => {
  const lectura = lecturaTiempo({ ...tiempoBase, finEstimado: null, sinEstimacion: "Sin duración" });
  assert.equal(lectura.tipo, "estimado");
});

// HT-10: el puesto previsto y la reserva que corrió el inicio.
test("en espera trae el puesto previsto y la reserva que corrió su inicio", () => {
  const lectura = lecturaTiempo({ ...tiempoBase, esperaEstimadaMin: 40, reservaPrevia: "2026-10-23T12:30:00Z" });
  assert.equal(lectura.puesto, "Puesto 2");
  assert.equal(lectura.reservaPrevia, "2026-10-23T12:30:00Z");
});

test("en lavado trae su puesto y nunca una reserva previa", () => {
  const lectura = lecturaTiempo({ ...tiempoBase, estado: "EN_PROGRESO", posicion: null, reservaPrevia: "2026-10-23T12:30:00Z" });
  assert.equal(lectura.puesto, "Puesto 2");
  assert.equal(lectura.reservaPrevia, null);
});

test("un backend anterior al motor, sin puesto ni reserva, se lee igual", () => {
  const viejo = { ...tiempoBase };
  delete viejo.puestoId;
  delete viejo.puestoNombre;
  delete viejo.reservaPrevia;
  const lectura = lecturaTiempo(viejo);
  assert.equal(lectura.tipo, "estimado");
  assert.equal(lectura.puesto, null);
  assert.equal(lectura.reservaPrevia, null);
});
