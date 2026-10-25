"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Plate, StageBadge } from "@/components/ui/badges";
import {
  CalificacionServicio,
  type AvisoCalificacion,
} from "@/components/seguimiento/CalificacionServicio";
import { ApiError } from "@/lib/api";
import {
  fetchSeguimiento,
  type CalificacionApi,
  type SeguimientoApi,
} from "@/lib/api-seguimiento";
import { time } from "@/lib/format";
import {
  INTERVALO_ACTUALIZACION_MS,
  etapasSeguimiento,
  falloSeguimiento,
  horariosSeguimiento,
  resumenEspera,
  seActualizaSolo,
} from "@/lib/seguimiento";

type Carga =
  | { tipo: "cargando" }
  | { tipo: "inexistente" }
  | { tipo: "vencido" }
  | { tipo: "limitado" }
  | { tipo: "error" }
  | { tipo: "listo"; seguimiento: SeguimientoApi };

const cargaFallida = (error: unknown): Carga => ({
  tipo: falloSeguimiento(error instanceof ApiError ? error.status : null),
});

/** Un link que venció mientras el cliente lo miraba: se deja de mostrar lo que había. */
const vencio = (error: unknown) => error instanceof ApiError && error.status === 410;

const CALIFICACION_GUARDADA: AvisoCalificacion = {
  tipo: "exito",
  mensaje: "¡Gracias! Guardamos tu calificación.",
};

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });

/**
 * El seguimiento que ve el cliente en modo real (HU-43). Es una página pública: pide la orden al
 * backend con el código del link, sin el store ni la sesión del lavadero, y muestra el vehículo, las
 * etapas, los horarios que ya ocurrieron y la calificación. Mientras el vehículo espera, también su
 * lugar en la fila y cuánto falta para que empiece el lavado (HU-17).
 *
 * Hasta que el vehículo se retira, la página vuelve a pedir el seguimiento cada
 * INTERVALO_ACTUALIZACION_MS y al volver a la pestaña, así la posición, la espera y el estado se
 * mantienen al día sin recargar, y si el link vence (HT-07) deja de mostrar los datos. No hay aviso
 * en vivo desde el backend.
 */
export function SeguimientoCliente({ codigo }: { codigo: string }) {
  const [carga, setCarga] = useState<Carga>({ tipo: "cargando" });
  const [intento, setIntento] = useState(0);
  const [aviso, setAviso] = useState<AvisoCalificacion | null>(null);

  useEffect(() => {
    // Una respuesta de un intento anterior no pisa la del actual.
    let vigente = true;
    fetchSeguimiento(codigo)
      .then((seguimiento) => {
        if (vigente) setCarga({ tipo: "listo", seguimiento });
      })
      .catch((error: unknown) => {
        if (vigente) setCarga(cargaFallida(error));
      });
    return () => {
      vigente = false;
    };
  }, [codigo, intento]);

  const estado = carga.tipo === "listo" ? carga.seguimiento.estado : null;
  useEffect(() => {
    if (!estado || !seActualizaSolo(estado)) return;
    let vigente = true;
    function actualizar() {
      if (document.visibilityState !== "visible") return;
      fetchSeguimiento(codigo)
        .then((seguimiento) => {
          if (vigente) setCarga({ tipo: "listo", seguimiento });
        })
        .catch((error: unknown) => {
          // Si el link venció (el vehículo se retiró), se avisa; cualquier otra falla no borra lo
          // que se ve y se reintenta en el próximo sondeo.
          if (vigente && vencio(error)) setCarga({ tipo: "vencido" });
        });
    }
    const intervalo = window.setInterval(actualizar, INTERVALO_ACTUALIZACION_MS);
    document.addEventListener("visibilitychange", actualizar);
    return () => {
      vigente = false;
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", actualizar);
    };
  }, [codigo, estado]);

  function reintentar() {
    setCarga({ tipo: "cargando" });
    setIntento((n) => n + 1);
  }

  function calificada(calificacion: CalificacionApi) {
    setCarga((actual) =>
      actual.tipo === "listo"
        ? {
            tipo: "listo",
            seguimiento: { ...actual.seguimiento, calificacion, puedeCalificar: false },
          }
        : actual,
    );
    setAviso(CALIFICACION_GUARDADA);
  }

  // Tras un envío rechazado o sin respuesta se relee la orden, en segundo plano, para mostrar lo que
  // quedó guardado. Si esa lectura falla, se sigue viendo lo que había.
  function desactualizada(motivo: string | null) {
    setAviso(motivo ? { tipo: "conflicto", mensaje: motivo } : null);
    fetchSeguimiento(codigo)
      .then((seguimiento) => {
        setCarga({ tipo: "listo", seguimiento });
        // Un envío que se quedó sin respuesta pero sí se guardó se confirma como cualquier otro.
        if (!motivo && seguimiento.calificacion) setAviso(CALIFICACION_GUARDADA);
      })
      .catch((error: unknown) => {
        // Si el link venció se avisa; si no, la tarjeta ya muestra el error del envío.
        if (vencio(error)) setCarga({ tipo: "vencido" });
      });
  }

  if (carga.tipo === "inexistente" || carga.tipo === "vencido") {
    return (
      <div className="mx-auto min-h-screen max-w-md bg-white p-6">
        <Logo />
        {carga.tipo === "inexistente" ? (
          <p className="mt-8 text-slate-500">No encontramos ese link de seguimiento.</p>
        ) : (
          <div className="mt-8 text-slate-500">
            <p className="font-semibold text-navy">Este link ya no está disponible.</p>
            <p className="mt-1 text-sm">
              El servicio terminó: el vehículo ya se retiró o la atención se canceló. Si tenés alguna
              duda, consultá en el lavadero.
            </p>
          </div>
        )}
      </div>
    );
  }

  if (carga.tipo !== "listo") {
    return (
      <div className="mx-auto min-h-screen max-w-md bg-white p-6">
        <Logo />
        {carga.tipo === "cargando" ? (
          <p role="status" className="mt-8 flex items-center gap-2 text-slate-500">
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            Cargando el seguimiento…
          </p>
        ) : (
          <div role="alert" className="mt-8 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            <p>
              {carga.tipo === "limitado"
                ? "Hubo demasiadas consultas desde tu conexión. Esperá un minuto y volvé a intentar."
                : "No pudimos cargar el seguimiento. Revisá tu conexión y volvé a intentar."}
            </p>
            <button type="button" className="mt-2 font-semibold underline" onClick={reintentar}>
              Reintentar
            </button>
          </div>
        )}
      </div>
    );
  }

  const s = carga.seguimiento;
  const vehiculo = [s.marca, s.modelo].filter(Boolean).join(" ");
  const etapas = etapasSeguimiento(s.estado);
  const horarios = horariosSeguimiento(s);
  const espera = s.estado === "EN_ESPERA" && s.espera ? s.espera : null;
  const resumen = espera ? resumenEspera(espera) : null;
  const ordenActiva = s.estado === "EN_ESPERA" || s.estado === "EN_PROGRESO";

  return (
    <div className="min-h-screen bg-[#F4F7FC]">
      <div className="mx-auto max-w-md px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <Logo />
          <span className="text-xs text-slate-400">Cliente</span>
        </div>

        <article className="card p-5">
          <h1 className="text-xl font-bold">Seguimiento de tu vehículo</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            {vehiculo && <span>{vehiculo}</span>}
            <Plate value={s.patente} />
          </p>
          <p className="mt-1 text-xs text-slate-400">Hola {s.clienteNombre}</p>
          <p className="text-xs text-slate-400">
            {s.servicio} · {s.lavadero}
          </p>

          <dl className="mt-5 grid grid-cols-2 gap-3">
            {horarios.map((horario) => (
              <div key={horario.clave} className="rounded-2xl bg-slate-50 p-3">
                <dt className="text-[11px] text-slate-400">{horario.etiqueta}</dt>
                <dd className="text-lg font-bold">{time(horario.valor)}</dd>
                {horario.clave === "llegada" && (
                  <dd className="text-[11px] text-slate-400">{fecha(horario.valor)}</dd>
                )}
              </div>
            ))}
          </dl>

          {ordenActiva && s.estimacion && (
            <section
              aria-label="Horario estimado de finalización"
              aria-live="polite"
              className="mt-5 rounded-2xl bg-[#6C5CE7]/5 p-4"
            >
              <p className="text-[11px] uppercase tracking-wide text-slate-400">
                Nuevo tiempo estimado
              </p>
              {s.estimacion.finEstimado ? (
                <>
                  <p className="mt-1 text-lg font-bold text-navy">
                    Finalización: {time(s.estimacion.finEstimado)}
                    <span className="ml-2 text-sm font-normal text-slate-500">
                      {fecha(s.estimacion.finEstimado)}
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Es una estimación y puede cambiar durante el servicio.
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-slate-600">
                  Por ahora no podemos estimar el horario de finalización.
                </p>
              )}
              <p className="mt-2 text-[11px] text-slate-400">
                Actualizado {time(s.estimacion.calculadaEl)} · se actualiza solo
              </p>
            </section>
          )}

          {espera && resumen && (
            <section
              aria-label="Tu lugar en la fila"
              aria-live="polite"
              className="mt-5 rounded-2xl bg-[#6C5CE7]/5 p-4"
            >
              <div className="flex items-baseline gap-3">
                <p className="text-4xl font-bold text-[#6C5CE7]">{espera.posicion}</p>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">
                    Tu lugar en la fila
                  </p>
                  <p className="text-sm font-medium text-slate-700">{resumen.posicion}</p>
                </div>
              </div>
              {resumen.espera ? (
                <div className="mt-3">
                  <p className="text-sm font-semibold text-navy">
                    {resumen.espera.texto}
                    {resumen.espera.inicio && (
                      <span className="font-normal text-slate-500">
                        {" "}
                        · cerca de las {time(resumen.espera.inicio)}
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Es una estimación: puede cambiar si cambia la fila.
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  Todavía no podemos estimar cuánto falta. Tu lugar en la fila sí está al día.
                </p>
              )}
              <p className="mt-2 text-[11px] text-slate-400">
                Actualizado {time(espera.calculadaEl)} · se actualiza solo
              </p>
            </section>
          )}

          {s.estado === "CANCELADO" ? (
            <p className="mt-5 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
              Este servicio fue cancelado. Si tenés alguna duda, consultá en el lavadero.
            </p>
          ) : (
            <ol className="mt-6 space-y-3" aria-label="Etapas del servicio">
              {etapas.map((etapa) => (
                <li
                  key={etapa.estado}
                  className="flex items-center gap-3"
                  aria-current={etapa.actual ? "step" : undefined}
                >
                  <span
                    className={`h-3 w-3 rounded-full ${
                      etapa.alcanzada ? "bg-[#6C5CE7]" : "bg-slate-200"
                    }`}
                  />
                  {etapa.actual ? (
                    <StageBadge estado={etapa.etapa} />
                  ) : (
                    <span
                      className={`text-sm ${
                        etapa.alcanzada ? "font-semibold text-navy" : "text-slate-400"
                      }`}
                    >
                      {etapa.etiqueta}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}

          {s.estado === "LISTO" && (
            <p className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              ¡Tu vehículo ya está listo para retirar!
            </p>
          )}
          {s.estado === "ENTREGADO" && (
            <p className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Ya retiraste tu vehículo. ¡Gracias por elegirnos!
            </p>
          )}
        </article>

        <CalificacionServicio
          codigo={codigo}
          seguimiento={s}
          aviso={aviso}
          onCalificada={calificada}
          onDesactualizada={desactualizada}
        />
      </div>
    </div>
  );
}
