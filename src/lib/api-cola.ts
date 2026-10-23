import { request } from "./api";
import type { OrdenColaApi } from "./types";

// ----------------------------------------------------------------------------
// Cola operativa (backend: HU-16 orden manual, HU-28 demoras y tiempos estimados)
// ----------------------------------------------------------------------------

/**
 * Tiempos estimados de una orden activa. Para una orden en lavado, `inicioEstimado` es el inicio
 * real del lavado y la espera es cero; `posicion` solo existe para las que esperan.
 *
 * El backend no inventa tiempos (HU-17): sin puestos activos, o si falta la duración de un
 * servicio, lo que no se puede estimar llega en null y `sinEstimacion` dice por qué.
 *
 * El motor de tiempos (HT-10) estima cada vehículo en un puesto concreto: `puestoNombre` es el
 * puesto en el que se asume que se atiende, y `reservaPrevia` el horario de una reserva que todavía
 * no llegó y que corrió su inicio. Los dos vienen en null si no aplican.
 */
export interface TiempoEstimadoApi {
  ordenId: number;
  estado: "EN_ESPERA" | "EN_PROGRESO";
  posicion: number | null;
  demoraMin: number;
  inicioEstimado: string | null;
  finEstimado: string | null;
  esperaEstimadaMin: number | null;
  sinEstimacion: string | null;
  puestoId: number | null;
  puestoNombre: string | null;
  reservaPrevia: string | null;
}

/** Demora registrada. `colaReordenada` dice si cambió el orden de la cola de espera. */
export interface DemoraApi {
  id: number;
  ordenId: number;
  minutos: number;
  motivo: string | null;
  registradaEl: string;
  demoraTotalMin: number;
  colaReordenada: boolean;
}

/**
 * Mueve un vehículo en espera a otra posición (1 = primero) y devuelve la cola de espera
 * resultante. 409 si rompería la prioridad de una reserva próxima o si ya no está en espera.
 */
export function moverEnCola(ordenId: number, posicion: number) {
  return request<OrdenColaApi[]>(`/ordenes/${ordenId}/posicion-cola`, {
    method: "PATCH",
    body: JSON.stringify({ posicion }),
  });
}

/** Registra una demora sobre una atención activa (en espera o en lavado). */
export function registrarDemora(ordenId: number, payload: { minutos: number; motivo?: string }) {
  return request<DemoraApi>(`/ordenes/${ordenId}/demoras`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Inicio y fin estimados de los vehículos en lavado y en espera, en el orden de la cola. */
export function fetchTiemposCola(lavaderoId: number) {
  return request<TiempoEstimadoApi[]>(`/lavaderos/${lavaderoId}/cola/tiempos`, { cache: "no-store" });
}
