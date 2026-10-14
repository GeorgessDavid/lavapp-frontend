// Lógica del seguimiento del cliente (HU-43): las etapas y los horarios que se le muestran y las
// reglas de la calificación. Sin React ni fetch, para probarla con el runner de Node; por eso los
// imports de lib van con extensión y los de tipos con `import type`.
import type { EstadoOrdenApi, ServiceStage } from "./types.ts";
import type { NuevaCalificacion, SeguimientoApi } from "./api-seguimiento.ts";
import { etapaDeOrden } from "./etapas.ts";
import { stageLabel } from "./format.ts";

export const PUNTUACION_MAXIMA = 5;
export const COMENTARIO_MAXIMO = 500;

/** Los estados que recorre una orden, en orden. Una cancelada sale del recorrido. */
const RECORRIDO: EstadoOrdenApi[] = ["EN_ESPERA", "EN_PROGRESO", "LISTO", "ENTREGADO"];

export interface EtapaSeguimiento {
  estado: EstadoOrdenApi;
  /** La etapa equivalente del front, para usar sus colores y nombres (StageBadge). */
  etapa: ServiceStage;
  etiqueta: string;
  alcanzada: boolean;
  actual: boolean;
}

/**
 * Las etapas que ve el cliente, marcadas hasta donde llegó su orden. Los nombres son los mismos del
 * resto del front: "En espera", "En lavado", "Listo para retirar" y "Retirado". Una orden cancelada
 * no recorre etapas: devuelve [] y la página lo avisa aparte.
 */
export function etapasSeguimiento(estado: EstadoOrdenApi): EtapaSeguimiento[] {
  const actual = RECORRIDO.indexOf(estado);
  if (actual === -1) return [];
  return RECORRIDO.map((paso, i) => {
    const etapa = etapaDeOrden(paso);
    return {
      estado: paso,
      etapa,
      etiqueta: stageLabel[etapa],
      alcanzada: i <= actual,
      actual: i === actual,
    };
  });
}

export interface HorarioSeguimiento {
  clave: "llegada" | "inicioLavado" | "finLavado" | "salida";
  etiqueta: string;
  valor: string;
}

const HORARIOS: Pick<HorarioSeguimiento, "clave" | "etiqueta">[] = [
  { clave: "llegada", etiqueta: "Llegada" },
  { clave: "inicioLavado", etiqueta: "Inicio del lavado" },
  { clave: "finLavado", etiqueta: "Fin del lavado" },
  { clave: "salida", etiqueta: "Retiro" },
];

/** Los horarios que ya ocurrieron, en el orden del servicio: los que faltan no se muestran. */
export function horariosSeguimiento(
  seguimiento: Pick<SeguimientoApi, HorarioSeguimiento["clave"]>,
): HorarioSeguimiento[] {
  return HORARIOS.flatMap(({ clave, etiqueta }) => {
    const valor = seguimiento[clave];
    return valor ? [{ clave, etiqueta, valor }] : [];
  });
}

/**
 * Qué muestra la tarjeta de calificación:
 * - "calificada": la calificación guardada, solo lectura.
 * - "formulario": el backend dice que se puede calificar (servicio finalizado y sin calificar).
 * - "pendiente": el servicio todavía no terminó; se avisa que podrá calificarlo cuando termine.
 * - "no-disponible": no hay nada que ofrecer, por ejemplo en un servicio cancelado.
 */
export type ModoCalificacion = "calificada" | "formulario" | "pendiente" | "no-disponible";

export function modoCalificacion(
  seguimiento: Pick<SeguimientoApi, "estado" | "puedeCalificar" | "calificacion">,
): ModoCalificacion {
  if (seguimiento.calificacion) return "calificada";
  if (seguimiento.puedeCalificar) return "formulario";
  if (seguimiento.estado === "EN_ESPERA" || seguimiento.estado === "EN_PROGRESO") return "pendiente";
  return "no-disponible";
}

/** "1 estrella", "2 estrellas"...: el nombre accesible de cada estrella y de la puntuación. */
export function etiquetaEstrellas(cantidad: number) {
  return `${cantidad} ${cantidad === 1 ? "estrella" : "estrellas"}`;
}

/**
 * Las mismas reglas que valida el backend, para avisar antes de enviar: puntuación entera de 1 a 5
 * y comentario de hasta 500 caracteres sin contar los espacios de los bordes, que no se envían.
 * Devuelve el mensaje de error, o null si se puede enviar.
 */
export function validarCalificacion(puntuacion: number | null, comentario: string): string | null {
  if (
    puntuacion === null ||
    !Number.isInteger(puntuacion) ||
    puntuacion < 1 ||
    puntuacion > PUNTUACION_MAXIMA
  ) {
    return "Elegí una puntuación de 1 a 5 estrellas.";
  }
  if (comentario.trim().length > COMENTARIO_MAXIMO) {
    return `El comentario puede tener hasta ${COMENTARIO_MAXIMO} caracteres.`;
  }
  return null;
}

/** El cuerpo del envío: el comentario va recortado y, si queda vacío, no se manda. */
export function armarCalificacion(puntuacion: number, comentario: string): NuevaCalificacion {
  const recortado = comentario.trim();
  return recortado ? { puntuacion, comentario: recortado } : { puntuacion };
}
