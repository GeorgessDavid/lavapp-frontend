"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, LoaderCircle, Star } from "lucide-react";
import { ApiError } from "@/lib/api";
import {
  calificarServicio,
  type CalificacionApi,
  type SeguimientoApi,
} from "@/lib/api-seguimiento";
import {
  COMENTARIO_MAXIMO,
  PUNTUACION_MAXIMA,
  armarCalificacion,
  etiquetaEstrellas,
  modoCalificacion,
  validarCalificacion,
} from "@/lib/seguimiento";

const ESTRELLAS = Array.from({ length: PUNTUACION_MAXIMA }, (_, i) => i + 1);

/** Lo que se le avisa al cliente arriba de la tarjeta después de enviar. */
export interface AvisoCalificacion {
  tipo: "exito" | "conflicto";
  mensaje: string;
}

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });

/**
 * La calificación del servicio en el seguimiento del cliente (HU-43): solo lectura si ya calificó,
 * el formulario si el servicio está finalizado y sin calificar, y un aviso si todavía no terminó.
 */
export function CalificacionServicio({
  codigo,
  seguimiento,
  aviso,
  onCalificada,
  onDesactualizada,
}: {
  codigo: string;
  seguimiento: SeguimientoApi;
  aviso: AvisoCalificacion | null;
  onCalificada: (calificacion: CalificacionApi) => void;
  /** Un envío rechazado (409, con su motivo) o sin respuesta (null): hay que releer la orden. */
  onDesactualizada: (motivo: string | null) => void;
}) {
  const modo = modoCalificacion(seguimiento);
  if (modo === "no-disponible" && !aviso) return null;

  return (
    <article className="card mt-4 p-5">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Star className="h-4 w-4 text-[#6C5CE7]" aria-hidden="true" />
        {modo === "calificada" ? "Tu calificación" : "Calificá tu experiencia"}
      </p>
      {aviso?.tipo === "exito" && (
        <p
          role="status"
          className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          {aviso.mensaje}
        </p>
      )}
      {aviso?.tipo === "conflicto" && (
        <p role="alert" className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {aviso.mensaje}
        </p>
      )}
      {modo === "calificada" && seguimiento.calificacion && (
        <CalificacionGuardada calificacion={seguimiento.calificacion} />
      )}
      {modo === "formulario" && (
        <FormularioCalificacion
          codigo={codigo}
          onCalificada={onCalificada}
          onDesactualizada={onDesactualizada}
        />
      )}
      {modo === "pendiente" && (
        <p className="text-sm text-slate-500">
          Vas a poder calificar el servicio cuando esté finalizado.
        </p>
      )}
    </article>
  );
}

function CalificacionGuardada({ calificacion }: { calificacion: CalificacionApi }) {
  return (
    <div>
      <p
        role="img"
        aria-label={`${etiquetaEstrellas(calificacion.puntuacion)} de ${PUNTUACION_MAXIMA}`}
        className="flex gap-1 text-2xl"
      >
        {ESTRELLAS.map((n) => (
          <span
            key={n}
            aria-hidden="true"
            className={n <= calificacion.puntuacion ? "text-amber-400" : "text-slate-200"}
          >
            ★
          </span>
        ))}
      </p>
      {calificacion.comentario && (
        <p className="mt-2 whitespace-pre-line break-words text-sm text-slate-600">
          {calificacion.comentario}
        </p>
      )}
      <p className="mt-2 text-[11px] text-slate-400">Calificado el {fecha(calificacion.calificadaEl)}</p>
    </div>
  );
}

function FormularioCalificacion({
  codigo,
  onCalificada,
  onDesactualizada,
}: {
  codigo: string;
  onCalificada: (calificacion: CalificacionApi) => void;
  onDesactualizada: (motivo: string | null) => void;
}) {
  const [puntuacion, setPuntuacion] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Frena un segundo envío aunque llegue antes de que React deshabilite el botón (doble clic).
  const enviandoRef = useRef(false);
  const id = useId();

  async function enviar(event: FormEvent) {
    event.preventDefault();
    if (enviandoRef.current) return;
    const invalida = validarCalificacion(puntuacion, comentario);
    if (puntuacion === null || invalida) {
      setError(invalida);
      return;
    }
    enviandoRef.current = true;
    setEnviando(true);
    setError(null);
    try {
      onCalificada(await calificarServicio(codigo, armarCalificacion(puntuacion, comentario)));
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        // Ya estaba calificado o el servicio cambió: se muestra el motivo y lo que quedó guardado.
        onDesactualizada(e.message);
      } else if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("No pudimos enviar tu calificación. Revisá tu conexión y volvé a intentar.");
        // Sin respuesta no se sabe si llegó a guardarse: se relee la orden y, si quedó guardada,
        // la tarjeta pasa a mostrarla.
        onDesactualizada(null);
      }
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate>
      <div role="group" aria-label="Puntuación" className="flex items-center gap-1 text-2xl">
        {ESTRELLAS.map((n) => (
          <button
            key={n}
            type="button"
            aria-label={etiquetaEstrellas(n)}
            aria-pressed={puntuacion === n}
            disabled={enviando}
            className={`rounded-md px-0.5 leading-none transition disabled:cursor-not-allowed ${
              puntuacion !== null && n <= puntuacion
                ? "text-amber-400"
                : "text-slate-200 hover:text-amber-300"
            }`}
            onClick={() => {
              setPuntuacion(n);
              setError(null);
            }}
          >
            <span aria-hidden="true">★</span>
          </button>
        ))}
        {puntuacion !== null && (
          <span className="ml-2 text-xs font-medium text-slate-500">{etiquetaEstrellas(puntuacion)}</span>
        )}
      </div>
      {puntuacion === null && (
        <p className="mt-1 text-xs text-slate-400">Elegí de 1 a 5 estrellas para enviar tu calificación.</p>
      )}
      <label htmlFor={`${id}-comentario`} className="sr-only">
        Comentario (opcional)
      </label>
      <textarea
        id={`${id}-comentario`}
        className="field mt-3 min-h-20"
        placeholder="Comentarios (opcional)"
        maxLength={COMENTARIO_MAXIMO}
        value={comentario}
        disabled={enviando}
        aria-describedby={`${id}-contador`}
        onChange={(e) => {
          setComentario(e.target.value);
          setError(null);
        }}
      />
      <p id={`${id}-contador`} className="mt-1 text-right text-[11px] text-slate-400">
        {comentario.length}/{COMENTARIO_MAXIMO} caracteres
      </p>
      {error && (
        <p role="alert" className="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        type="submit"
        className="btn-primary mt-3 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={puntuacion === null || enviando}
      >
        {enviando && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {enviando ? "Enviando…" : "Enviar calificación"}
      </button>
    </form>
  );
}
