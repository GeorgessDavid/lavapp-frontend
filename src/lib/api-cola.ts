import { request } from "./api";
import type { OrdenColaApi } from "./types";

// ----------------------------------------------------------------------------
// Cola operativa (backend: HU-16 orden manual, HU-28 demoras y tiempos estimados)
// ----------------------------------------------------------------------------

/**
 * Tiempos estimados de una orden activa. Para una orden en lavado, `inicioEstimado` es el inicio
 * real del lavado y la espera es cero; `posicion` solo existe para las que esperan.
 */
export interface TiempoEstimadoApi {
  ordenId: number;
  estado: "EN_ESPERA" | "EN_PROGRESO";
  posicion: number | null;
  demoraMin: number;
  inicioEstimado: string;
  finEstimado: string;
  esperaEstimadaMin: number;
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
