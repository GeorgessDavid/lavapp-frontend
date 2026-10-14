import type { TiempoEstimadoApi } from "./api-cola.ts";

// Lógica pura de las acciones de la cola operativa (HU-16 y HU-28). Los límites son los mismos que
// valida el backend (RegistrarDemoraRequest); se repiten acá para avisar antes de mandar.
export const DEMORA_MIN = 1;
export const DEMORA_MAX = 240;
export const MOTIVO_MAX = 255;

/** La posición a la que lleva subir (-1) o bajar (+1) un vehículo, o null si ya está en el borde. */
export function posicionDestino(
  posicion: number | null,
  delta: -1 | 1,
  total: number,
): number | null {
  if (posicion === null) return null;
  const destino = posicion + delta;
  return destino >= 1 && destino <= total ? destino : null;
}

/** El error a mostrar antes de registrar una demora, o null si los datos están bien. */
export function validarDemora(minutos: number, motivo: string): string | null {
  if (!Number.isInteger(minutos) || minutos < DEMORA_MIN || minutos > DEMORA_MAX) {
    return `La demora tiene que ser de entre ${DEMORA_MIN} y ${DEMORA_MAX} minutos.`;
  }
  if (motivo.trim().length > MOTIVO_MAX) {
    return `El motivo no puede superar los ${MOTIVO_MAX} caracteres.`;
  }
  return null;
}

/** Los tiempos estimados indexados por orden, para cruzarlos con las filas de la cola. */
export function indexarTiempos(tiempos: TiempoEstimadoApi[]): Map<number, TiempoEstimadoApi> {
  return new Map(tiempos.map((tiempo) => [tiempo.ordenId, tiempo]));
}

/** El aviso después de registrar una demora. */
export function mensajeDemora(patente: string, minutos: number, colaReordenada: boolean) {
  return (
    `Demora de ${minutos} min registrada para ${patente}.` +
    (colaReordenada ? " La cola se reorganizó para respetar las reservas próximas." : "")
  );
}
