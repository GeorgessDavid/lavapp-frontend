import type { EstadoOrdenApi, ServiceStage } from "./types";

/**
 * Etapas en las que el vehículo está "en lavado" (HU-34). El flujo local tiene tres etapas
 * intermedias; para el negocio todas son el mismo estado: el lavado empezó y no terminó.
 */
export const ETAPAS_EN_LAVADO: ServiceStage[] = ["LAVADO", "INTERIOR", "TERMINACIONES"];

export const estaEnLavado = (estado: ServiceStage) => ETAPAS_EN_LAVADO.includes(estado);

/**
 * Etapas con una siguiente que todavía no es "Listo". Ahí "Siguiente etapa" sigue teniendo
 * sentido; a "Listo" se llega únicamente con "Finalizar servicio".
 */
export const tieneEtapaIntermedia = (estado: ServiceStage) =>
  estado === "LAVADO" || estado === "INTERIOR";

/** El estado de una orden del backend proyectado sobre las etapas del front. */
export function etapaDeOrden(estado: EstadoOrdenApi): ServiceStage {
  switch (estado) {
    case "EN_PROGRESO":
      return "LAVADO";
    case "LISTO":
      return "LISTO";
    case "ENTREGADO":
    case "CANCELADO":
      return "RETIRADO";
    default:
      return "EN_ESPERA";
  }
}
