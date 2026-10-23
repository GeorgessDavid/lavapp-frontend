// Duración estimada de los servicios (HU-54): las reglas de lo que se puede guardar, las mismas que
// valida el backend, para avisar antes de enviar. Sin React ni fetch, para probarla con el runner de
// Node.

/** Lo que acepta el backend (PATCH /lavaderos/{id}/servicios/{sid}/duracion). */
export const DURACION_MINIMA_MIN = 1;
export const DURACION_MAXIMA_MIN = 120;

export type DuracionValidada = { ok: true; minutos: number } | { ok: false; mensaje: string };

/**
 * Valida lo que escribió el dueño en el campo de minutos: un entero de 1 a 120. Los espacios de los
 * bordes no cuentan. Devuelve los minutos o el mensaje para mostrar.
 */
export function validarDuracion(texto: string): DuracionValidada {
  const limpio = texto.trim();
  if (!limpio) return { ok: false, mensaje: "Ingresá la duración en minutos." };
  if (!/^\d+$/.test(limpio)) {
    return { ok: false, mensaje: "La duración tiene que ser un número entero de minutos." };
  }
  const minutos = Number(limpio);
  if (minutos < DURACION_MINIMA_MIN || minutos > DURACION_MAXIMA_MIN) {
    return {
      ok: false,
      mensaje: `La duración tiene que estar entre ${DURACION_MINIMA_MIN} y ${DURACION_MAXIMA_MIN} minutos.`,
    };
  }
  return { ok: true, minutos };
}

/** Si el valor del campo cambió respecto de lo guardado: sin cambios no hay nada que enviar. */
export function cambioLaDuracion(texto: string, guardada: number) {
  const validada = validarDuracion(texto);
  return !validada.ok || validada.minutos !== guardada;
}
