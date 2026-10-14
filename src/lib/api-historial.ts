// Historial de servicios (HU-39): GET /lavaderos/{lavaderoId}/historial. Vive fuera de api.ts para
// no pisarse con otras ramas que tocan ese archivo; usa el mismo `request` (cookie de sesión,
// ApiError con el detail del backend y cierre de la sesión local ante un 401).
import { request } from "./api.ts";

/** Una atención ya cerrada (orden ENTREGADO, retirada) tal como la devuelve el backend. */
export interface HistorialAtencionApi {
  ordenId: number;
  /** Llegada del vehículo (created_at de la orden), ISO-8601 en UTC. */
  fecha: string;
  /** Retiro del vehículo (HU-35). */
  salida: string | null;
  servicioId: number;
  servicioNombre: string;
  /** Precio actual del servicio en el catálogo: la orden no guarda lo que se cobró. */
  servicioPrecio: number;
  vehiculoId: number;
  patente: string;
  marca: string | null;
  modelo: string | null;
  clienteId: number;
  clienteNombre: string;
}

/** Se busca por uno solo de los dos datos; el backend responde 400 si llegan los dos o ninguno. */
export type CriterioHistorial = { patente: string } | { cliente: string };

/**
 * Los servicios anteriores del lavadero, de la llegada más reciente a la más antigua (hasta 200).
 * Sin antecedentes devuelve una lista vacía. Sin cache: cada búsqueda consulta el backend.
 */
export function buscarHistorial(
  lavaderoId: number,
  criterio: CriterioHistorial,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams(
    "patente" in criterio ? { patente: criterio.patente } : { cliente: criterio.cliente },
  );
  return request<HistorialAtencionApi[]>(`/lavaderos/${lavaderoId}/historial?${params}`, {
    cache: "no-store",
    signal,
  });
}
