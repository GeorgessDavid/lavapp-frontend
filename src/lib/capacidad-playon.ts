/** Lo que Cola e Ingresos muestran del playón. En modo real sale de GET /capacidad. */

export type LecturaCapacidadPlayon =
  | { estado: "ok"; ocupados: number; maximo: number }
  | { estado: "sin-configurar" }
  | { estado: "error" };

export function textoCapacidadPlayon(lectura: LecturaCapacidadPlayon | null): string {
  if (lectura === null || lectura.estado === "error") return "—";
  if (lectura.estado === "sin-configurar") return "Sin configurar";
  return `${lectura.ocupados}/${lectura.maximo}`;
}

/** Porcentaje para el anillo. Null si todavía no hay un máximo real con el que medirlo. */
export function porcentajeCapacidadPlayon(lectura: LecturaCapacidadPlayon | null): number | null {
  if (lectura === null || lectura.estado !== "ok" || lectura.maximo <= 0) return null;
  return Math.round((lectura.ocupados / lectura.maximo) * 100);
}

/**
 * 409 es la respuesta de GET /capacidad cuando el lavadero no tiene máximo cargado.
 * Cualquier otro fallo no se disfraza de cero.
 */
export function lecturaCapacidadFallida(status: number): LecturaCapacidadPlayon {
  return status === 409 ? { estado: "sin-configurar" } : { estado: "error" };
}
