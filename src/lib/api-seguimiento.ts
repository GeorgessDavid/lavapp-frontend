// Seguimiento del cliente y calificación del servicio (HU-43). Va aparte de api.ts y usa su mismo
// `request`: cookies de sesión, ApiError con el detail del backend y manejo del 401.
import { request } from "./api.ts";
import type { EstadoOrdenApi } from "./types.ts";

/** Una calificación tal como la devuelve el backend. */
export interface CalificacionApi {
  puntuacion: number;
  comentario: string | null;
  calificadaEl: string;
}

/**
 * Posición en la cola y espera estimada mientras la orden está en espera (HU-17). Sale del mismo
 * cálculo que la cola del coordinador y se recalcula en cada consulta. `esperaEstimadaMin` e
 * `inicioEstimado` llegan en null cuando no hay datos para estimar sin inventar (`sinEstimacion`
 * dice por qué); `calculadaEl` es el momento del cálculo.
 */
export interface EsperaSeguimientoApi {
  posicion: number;
  esperaEstimadaMin: number | null;
  inicioEstimado: string | null;
  puestosActivos: number;
  sinEstimacion: string | null;
  calculadaEl: string;
}

/**
 * Lo que ve el cliente en su link (GET /seguimiento/{codigo}). `llegada` es cuando entró el
 * vehículo; `inicioLavado`, `finLavado` y `salida` llegan en null hasta que ocurren. `espera` solo
 * viene mientras la orden está EN_ESPERA.
 */
export interface SeguimientoApi {
  lavadero: string;
  clienteNombre: string;
  patente: string;
  marca: string | null;
  modelo: string | null;
  servicio: string;
  estado: EstadoOrdenApi;
  llegada: string;
  inicioLavado: string | null;
  finLavado: string | null;
  salida: string | null;
  puedeCalificar: boolean;
  calificacion: CalificacionApi | null;
  espera: EsperaSeguimientoApi | null;
}

/** El código del link de una orden (GET /ordenes/{id}/seguimiento). */
export interface SeguimientoLinkApi {
  ordenId: number;
  codigoSeguimiento: string;
}

/** Lo que manda el cliente al calificar; el comentario no viaja si no escribió nada. */
export interface NuevaCalificacion {
  puntuacion: number;
  comentario?: string;
}

/** Público: el cliente no tiene sesión, el código del link es lo que lo identifica. 404 si no existe. */
export function fetchSeguimiento(codigo: string) {
  return request<SeguimientoApi>(`/seguimiento/${encodeURIComponent(codigo)}`, {
    cache: "no-store",
  });
}

/**
 * Público. Devuelve la calificación guardada; el backend responde 409 si el servicio no está
 * finalizado o ya fue calificado, y el ApiError trae ese motivo.
 */
export function calificarServicio(codigo: string, calificacion: NuevaCalificacion) {
  return request<CalificacionApi>(`/seguimiento/${encodeURIComponent(codigo)}/calificacion`, {
    method: "POST",
    body: JSON.stringify(calificacion),
  });
}

/** Con sesión: el coordinador pide el código para pasarle el link al cliente. */
export function obtenerLinkSeguimiento(ordenId: number) {
  return request<SeguimientoLinkApi>(`/ordenes/${ordenId}/seguimiento`, { cache: "no-store" });
}
