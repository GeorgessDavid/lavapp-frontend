// Priorización de la cola local por reservas (lib/queue-priority.ts). El "ahora" se fija: nada
// depende del reloj de la máquina. Las fechas van sin zona horaria, como las guarda la reserva.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fechaHoraReserva, obtenerReservaConfirmada, priorizarAtencionesEnEspera } from "./queue-priority.ts";

const AHORA = new Date("2026-10-06T10:00:00");
const SERVICIOS = [{ id: "s1", nombre: "Lavado", duracionMin: 30 }];
const espontanea = (id, ingreso) => ({ id, vehiculoId: `v-${id}`, servicioIds: ["s1"], fechaIngreso: `2026-10-06T${ingreso}:00`, origen: "WALK_IN", estado: "EN_ESPERA" });
const conReserva = (id, ingreso) => ({ ...espontanea(id, ingreso), origen: "RESERVA" });
const reserva = (atencion, horario, estado = "CONFIRMADA") => ({ id: `r-${atencion.id}`, vehiculoId: atencion.vehiculoId, fecha: "2026-10-06", horario, estado });

test("sin reservas, las espontáneas van por orden de ingreso", () => {
  const orden = priorizarAtencionesEnEspera([espontanea("tarde", "09:50"), espontanea("temprano", "09:30")], SERVICIOS, [], AHORA);
  assert.deepEqual(orden.map((a) => a.id), ["temprano", "tarde"]);
});

test("una reserva cuyo turno cae antes de que termine la espontánea pasa adelante", () => {
  const e = espontanea("e", "09:30");
  const r = conReserva("r", "09:55");
  const orden = priorizarAtencionesEnEspera([e, r], SERVICIOS, [reserva(r, "10:20")], AHORA);
  assert.deepEqual(orden.map((a) => a.id), ["r", "e"]);
});

test("una reserva lejana no frena a la espontánea", () => {
  const e = espontanea("e", "09:30");
  const r = conReserva("r", "09:55");
  const orden = priorizarAtencionesEnEspera([e, r], SERVICIOS, [reserva(r, "11:00")], AHORA);
  assert.deepEqual(orden.map((a) => a.id), ["e", "r"]);
});

test("una atención de reserva sin reserva confirmada cuenta como espontánea", () => {
  const r = conReserva("r", "09:55");
  assert.equal(obtenerReservaConfirmada(r, [reserva(r, "10:20", "CANCELADA")]), null);
  const orden = priorizarAtencionesEnEspera([espontanea("e", "09:30"), r], SERVICIOS, [reserva(r, "10:20", "CANCELADA")], AHORA);
  assert.deepEqual(orden.map((a) => a.id), ["e", "r"]);
});

test("la fecha y hora de la reserva se arman en hora local", () => {
  assert.equal(fechaHoraReserva({ fecha: "2026-10-06", horario: "10:20" }), new Date("2026-10-06T10:20:00").getTime());
});
