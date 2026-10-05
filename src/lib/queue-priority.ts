import type { Atencion, Reserva, Servicio } from "./types";

export function priorizarAtencionesEnEspera(
  atenciones: Atencion[],
  servicios: Servicio[],
  reservasConfirmadas: Reserva[],
  ahora = new Date(),
): Atencion[] {
  const atencionesConReserva = atenciones
    .filter((atencion) => obtenerReservaConfirmada(atencion, reservasConfirmadas) !== null)
    .toSorted(
      (a, b) => {
        const reservaA = obtenerReservaConfirmada(a, reservasConfirmadas);
        const reservaB = obtenerReservaConfirmada(b, reservasConfirmadas);
        return (
          (reservaA && reservaB
            ? fechaHoraReserva(reservaA) - fechaHoraReserva(reservaB)
            : 0) || Date.parse(a.fechaIngreso) - Date.parse(b.fechaIngreso)
        );
      },
    );
  const espontaneas = atenciones
    .filter((atencion) => obtenerReservaConfirmada(atencion, reservasConfirmadas) === null)
    .toSorted(
      (a, b) => Date.parse(a.fechaIngreso) - Date.parse(b.fechaIngreso),
    );

  const ordenadas: Atencion[] = [];
  const agregadas = new Set<string>();
  for (const espontanea of espontaneas) {
    const duracionMin = espontanea.servicioIds.reduce((total, id) => {
      return total + (servicios.find((servicio) => servicio.id === id)?.duracionMin ?? 0);
    }, 0);
    const limiteReserva = ahora.getTime() + duracionMin * 60_000;

    for (const reserva of atencionesConReserva) {
      const reservaConfirmada = obtenerReservaConfirmada(reserva, reservasConfirmadas);
      if (
        !agregadas.has(reserva.id) &&
        reservaConfirmada !== null &&
        fechaHoraReserva(reservaConfirmada) <= limiteReserva
      ) {
        ordenadas.push(reserva);
        agregadas.add(reserva.id);
      }
    }

    ordenadas.push(espontanea);
    agregadas.add(espontanea.id);
  }

  for (const reserva of atencionesConReserva) {
    if (!agregadas.has(reserva.id)) ordenadas.push(reserva);
  }
  return ordenadas;
}

export function obtenerReservaConfirmada(
  atencion: Atencion,
  reservas: Reserva[],
): Reserva | null {
  if (atencion.origen !== "RESERVA") return null;
  return (
    reservas.find(
      (reserva) =>
        reserva.estado === "CONFIRMADA" &&
        reserva.vehiculoId === atencion.vehiculoId &&
        reserva.fecha === atencion.fechaIngreso.slice(0, 10),
    ) ?? null
  );
}

export function fechaHoraReserva(reserva: Reserva): number {
  return Date.parse(`${reserva.fecha}T${reserva.horario}:00`);
}
