/** Qué muestra el inicio y el padrón cuando la app está conectada al backend. */

export interface OrdenDePuesto {
  puestoId: number | null;
  estado: string;
}

/** Puestos con un vehículo asignado que todavía no se retiró. */
export function contarPuestosOcupados(ordenes: OrdenDePuesto[]): number {
  const ids = new Set<number>();
  for (const orden of ordenes) {
    if (orden.puestoId == null) continue;
    if (orden.estado === "ENTREGADO" || orden.estado === "CANCELADO") continue;
    ids.add(orden.puestoId);
  }
  return ids.size;
}

export function textoPuestos(ocupados: number, totales: number): string {
  return `${ocupados}/${totales}`;
}

export interface FilaVehiculo {
  patente: string;
  vehiculo: string;
  cliente: string;
  telefono: string;
}

/** La búsqueda del encabezado: nombre, teléfono, marca, modelo o patente, con o sin espacios. */
export function coincideBusqueda(fila: FilaVehiculo, texto: string): boolean {
  const consulta = texto.trim().toLowerCase();
  if (!consulta) return true;
  const junto = [fila.patente, fila.vehiculo, fila.cliente, fila.telefono]
    .join(" ")
    .toLowerCase();
  if (junto.includes(consulta)) return true;
  const patente = consulta.replace(/[\s-]/g, "");
  return patente.length > 0 && fila.patente.replace(/[\s-]/g, "").toLowerCase().includes(patente);
}
