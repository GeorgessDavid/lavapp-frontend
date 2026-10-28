import { request } from "./api.ts";

/** Datos del aviso manual de vehículo listo (HU-36). */
export interface AvisoListoApi {
  ordenId: number;
  clienteNombre: string;
  telefono: string | null;
  patente: string;
  servicioNombre: string;
  codigoSeguimiento: string;
  generadoEl: string;
  confirmadoEl: string | null;
  confirmadoPor: number | null;
}

/** Con sesión: los datos que se usan para armar el mensaje manual de WhatsApp. */
export function consultarAvisoListo(ordenId: number) {
  return request<AvisoListoApi>(`/ordenes/${ordenId}/aviso-listo`, { cache: "no-store" });
}

/**
 * Con sesión: registra que el operador ya envió el aviso. Es idempotente: si ya estaba
 * confirmado, el backend devuelve la misma fecha y el mismo usuario.
 */
export function confirmarAvisoListo(ordenId: number) {
  return request<AvisoListoApi>(`/ordenes/${ordenId}/aviso-listo/confirmar`, {
    method: "POST",
  });
}
