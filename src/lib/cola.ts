import type { Atencion, OrdenColaApi, ServiceStage } from "./types";
// Con extensión: los módulos de lib se importan así para que el runner de Node (npm test) los
// resuelva sin compilar; el bundler de Next también lo acepta.
import { estaEnLavado, etapaDeOrden } from "./etapas.ts";

/** Las órdenes del backend por estado: en espera (ya priorizadas por el backend), en lavado y listas. */
export interface OrdenesBackend {
  enEspera: OrdenColaApi[];
  enLavado: OrdenColaApi[];
  listas: OrdenColaApi[];
}

/**
 * Una fila de la cola. `posicion` es el lugar entre los que esperan, de 1 en adelante, y null
 * para los que ya están en lavado o listos: esos no hacen cola, se muestran para seguirlos.
 */
export type FilaCola =
  | { tipo: "local"; atencion: Atencion; estado: ServiceStage; posicion: number | null }
  | { tipo: "backend"; orden: OrdenColaApi; estado: ServiceStage; posicion: number | null };

export const idDeFila = (fila: FilaCola) =>
  fila.tipo === "backend" ? `orden-${fila.orden.ordenId}` : fila.atencion.id;

export const esperando = (fila: FilaCola) => fila.estado === "EN_ESPERA";

/**
 * Las filas en modo real: solo lo que dice el backend (HU-13). Primero las que esperan, en el
 * orden en que las devuelve porque ya vienen priorizadas; después las que están en lavado y las
 * listas para retirar.
 */
export function armarFilasBackend(ordenes: OrdenesBackend): FilaCola[] {
  const fila = (orden: OrdenColaApi): FilaCola => ({
    tipo: "backend",
    orden,
    estado: etapaDeOrden(orden.estado),
    posicion: null,
  });
  return numerar([
    ...ordenes.enEspera.map(fila),
    ...ordenes.enLavado.map(fila),
    ...ordenes.listas.map(fila),
  ]);
}

/** Las filas en modo mock: las atenciones en espera ya priorizadas y después el resto de las activas. */
export function armarFilasLocales(enEspera: Atencion[], resto: Atencion[]): FilaCola[] {
  return numerar(
    [...enEspera, ...resto].map((atencion) => ({
      tipo: "local",
      atencion,
      estado: atencion.estado,
      posicion: null,
    })),
  );
}

/** Numera solo las que esperan, en el orden en que vienen: es su posición en la cola. */
function numerar(filas: FilaCola[]): FilaCola[] {
  let posicion = 0;
  return filas.map((fila) => (esperando(fila) ? { ...fila, posicion: ++posicion } : fila));
}

/** Los totales para las tarjetas de arriba de la cola. */
export function contarCola(filas: FilaCola[]) {
  return {
    enEspera: filas.filter(esperando).length,
    enLavado: filas.filter((fila) => estaEnLavado(fila.estado)).length,
    listos: filas.filter((fila) => fila.estado === "LISTO").length,
  };
}
