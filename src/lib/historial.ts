// Lógica pura del historial de servicios (HU-39): validar lo que se busca y ordenar lo que vuelve
// del backend. Sin React ni red, así se prueba con el runner de Node (historial.test.mjs).
import type { CriterioHistorial, HistorialAtencionApi } from "./api-historial.ts";

export type ModoBusqueda = "patente" | "cliente";

/** Los mismos límites que aplica el backend (HistorialService). */
export const MINIMO_CARACTERES_CLIENTE = 2;
export const MAXIMO_RESULTADOS = 200;

/** Sin espacios ni guiones y en mayúsculas: así compara el backend la patente buscada y la guardada. */
export function normalizarPatente(valor: string) {
  return valor.replace(/[\s-]/g, "").toUpperCase();
}

export type BusquedaValidada =
  | { ok: true; criterio: CriterioHistorial; dato: string }
  | { ok: false; error: string };

/**
 * Revisa lo ingresado con las mismas reglas que el backend, para avisar sin ir a la red. `dato`
 * es lo buscado tal como se muestra en los mensajes ("No hay servicios registrados para …").
 */
export function validarBusqueda(modo: ModoBusqueda, texto: string): BusquedaValidada {
  if (modo === "patente") {
    const patente = normalizarPatente(texto);
    return patente
      ? { ok: true, criterio: { patente }, dato: texto.trim().toUpperCase() }
      : { ok: false, error: "Ingresá una patente para buscar." };
  }
  const cliente = texto.trim();
  return cliente.length >= MINIMO_CARACTERES_CLIENTE
    ? { ok: true, criterio: { cliente }, dato: cliente }
    : {
        ok: false,
        error: `Ingresá al menos ${MINIMO_CARACTERES_CLIENTE} letras del nombre del cliente.`,
      };
}

/** Marca y modelo juntos ("Toyota Etios"), o null si el vehículo no tiene ninguno cargado. */
export function describirVehiculo(vehiculo: Pick<HistorialAtencionApi, "marca" | "modelo">) {
  return (
    [vehiculo.marca, vehiculo.modelo]
      .map((parte) => parte?.trim())
      .filter(Boolean)
      .join(" ") || null
  );
}

/** Las atenciones de un mismo cliente con un mismo vehículo. */
export interface FichaHistorial {
  clave: string;
  clienteId: number;
  clienteNombre: string;
  vehiculoId: number;
  patente: string;
  vehiculo: string | null;
  servicios: number;
  ultima: HistorialAtencionApi;
}

export const claveDeFicha = (atencion: Pick<HistorialAtencionApi, "clienteId" | "vehiculoId">) =>
  `${atencion.clienteId}-${atencion.vehiculoId}`;

const masReciente = (a: HistorialAtencionApi, b: HistorialAtencionApi) =>
  Date.parse(a.fecha) > Date.parse(b.fecha);

/**
 * Agrupa por cliente y vehículo, para que una búsqueda que trae a dos "Ana" (o a una Ana con dos
 * autos) los muestre por separado y no mezcle sus servicios. Se agrupa por id y no por nombre o
 * patente: dos clientes homónimos son dos fichas. La más reciente va primero.
 */
export function agruparEnFichas(atenciones: HistorialAtencionApi[]): FichaHistorial[] {
  const fichas = new Map<string, FichaHistorial>();
  for (const atencion of atenciones) {
    const clave = claveDeFicha(atencion);
    const ficha = fichas.get(clave);
    if (ficha) {
      ficha.servicios += 1;
      if (masReciente(atencion, ficha.ultima)) ficha.ultima = atencion;
      continue;
    }
    fichas.set(clave, {
      clave,
      clienteId: atencion.clienteId,
      clienteNombre: atencion.clienteNombre,
      vehiculoId: atencion.vehiculoId,
      patente: atencion.patente,
      vehiculo: describirVehiculo(atencion),
      servicios: 1,
      ultima: atencion,
    });
  }
  return [...fichas.values()].sort(
    (a, b) => Date.parse(b.ultima.fecha) - Date.parse(a.ultima.fecha),
  );
}

export interface ResumenHistorial {
  servicios: number;
  clientes: number;
  vehiculos: number;
  ultima: HistorialAtencionApi | null;
}

/** Cuántos servicios, clientes y vehículos trajo la búsqueda, y cuál fue el último servicio. */
export function resumirHistorial(atenciones: HistorialAtencionApi[]): ResumenHistorial {
  let ultima: HistorialAtencionApi | null = null;
  for (const atencion of atenciones) {
    if (!ultima || masReciente(atencion, ultima)) ultima = atencion;
  }
  return {
    servicios: atenciones.length,
    clientes: new Set(atenciones.map((atencion) => atencion.clienteId)).size,
    vehiculos: new Set(atenciones.map((atencion) => atencion.vehiculoId)).size,
    ultima,
  };
}
