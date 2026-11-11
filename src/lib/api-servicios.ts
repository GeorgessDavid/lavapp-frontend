// Servicios del lavadero y su duración estimada (HU-54). Va aparte de api.ts y usa su mismo
// `request`: cookies de sesión, ApiError con el detail del backend y manejo del 401.
import { request } from "./api.ts";

/** Un servicio tal como lo devuelve el backend. `duracionMin` alimenta los tiempos estimados. */
export interface ServicioApi {
  id: number;
  nombre: string;
  duracionMin: number;
  precio: number;
}

/** Los servicios vigentes del lavadero. */
export function listarServicios(lavaderoId: number) {
  return request<ServicioApi[]>(`/lavaderos/${lavaderoId}/servicios`, { cache: "no-store" });
}

/**
 * Configura la duración estimada de un servicio y devuelve el servicio actualizado. El backend
 * responde 400 con el motivo si el valor no es válido y 404 si el servicio no es de ese lavadero.
 */
export function configurarDuracion(lavaderoId: number, servicioId: number, duracionMin: number) {
  return request<ServicioApi>(`/lavaderos/${lavaderoId}/servicios/${servicioId}/duracion`, {
    method: "PATCH",
    body: JSON.stringify({ duracionMin }),
  });
}
