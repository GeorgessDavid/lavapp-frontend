"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { AlertTriangle, CarFront, CircleGauge, RefreshCw } from "lucide-react";
import { useApp } from "@/lib/store";
import { fetchCapacidad, updateCapacidad } from "@/lib/api";
import type { CapacidadActual } from "@/lib/types";

const POLL_INTERVAL_MS = 5000;

export function CapacidadResumen({ compacto = false }: { compacto?: boolean }) {
  const { user, atenciones } = useApp();
  const [capacidad, setCapacidad] = useState<CapacidadActual | null>(null);
  const [error, setError] = useState("");
  const [actualizando, setActualizando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [capacidadInput, setCapacidadInput] = useState("");
  const capacidadInputDirty = useRef(false);

  const ocupadosEnDemo = atenciones.filter(
    (atencion) => atencion.estado !== "RETIRADO",
  ).length;

  const actualizar = useCallback(async () => {
    if (!user || user.lavaderoId === undefined) return;
    setActualizando(true);
    try {
      const resumen = await fetchCapacidad(user.lavaderoId, ocupadosEnDemo);
      setCapacidad((actual) => {
        if (
          actual?.capacidadMaxima === resumen.capacidadMaxima &&
          actual.lugaresOcupados === resumen.lugaresOcupados &&
          actual.lugaresDisponibles === resumen.lugaresDisponibles &&
          actual.sobreCapacidad === resumen.sobreCapacidad
        ) {
          return actual;
        }
        return resumen;
      });
      if (!capacidadInputDirty.current) {
        setCapacidadInput(String(resumen.capacidadMaxima));
      }
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo consultar la capacidad del playón.",
      );
    } finally {
      setActualizando(false);
    }
  }, [user, ocupadosEnDemo]);

  useEffect(() => {
    if (!user || user.lavaderoId === undefined) return;

    let cancelled = false;
    const lavaderoId = user.lavaderoId;
    const cargar = () => {
      void fetchCapacidad(lavaderoId, ocupadosEnDemo)
        .then((resumen) => {
          if (cancelled) return;
          setCapacidad((actual) => {
            if (
              actual?.capacidadMaxima === resumen.capacidadMaxima &&
              actual.lugaresOcupados === resumen.lugaresOcupados &&
              actual.lugaresDisponibles === resumen.lugaresDisponibles &&
              actual.sobreCapacidad === resumen.sobreCapacidad
            ) {
              return actual;
            }
            return resumen;
          });
          if (!capacidadInputDirty.current) {
            setCapacidadInput(String(resumen.capacidadMaxima));
          }
          setError("");
        })
        .catch((cause: unknown) => {
          if (cancelled) return;
          setError(
            cause instanceof Error
              ? cause.message
              : "No se pudo consultar la capacidad del playón.",
          );
        })
        .finally(() => {
          if (!cancelled) setActualizando(false);
        });
    };

    cargar();
    const intervalId = window.setInterval(cargar, POLL_INTERVAL_MS);
    window.addEventListener("focus", cargar);
    window.addEventListener("lavapp:capacity-updated", cargar);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", cargar);
      window.removeEventListener("lavapp:capacity-updated", cargar);
    };
  }, [user, ocupadosEnDemo]);

  async function guardarCapacidad(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || user.lavaderoId === undefined) return;
    const parsedCapacity = Number(capacidadInput);
    if (!Number.isInteger(parsedCapacity) || parsedCapacity <= 0) {
      setError("Ingresá una capacidad máxima entera mayor que cero.");
      return;
    }

    setGuardando(true);
    setError("");
    try {
      const updated = await updateCapacidad(
        user.lavaderoId,
        parsedCapacity,
        ocupadosEnDemo,
      );
      capacidadInputDirty.current = false;
      setCapacidad(updated);
      setCapacidadInput(String(updated.capacidadMaxima));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo guardar la capacidad máxima.",
      );
    } finally {
      setGuardando(false);
    }
  }

  if (!user || user.rol === "FLOTA") return null;

  if (user.lavaderoId === undefined) {
    return (
      <section role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        No se puede consultar la capacidad: la cuenta aún no tiene un lavadero asociado.
      </section>
    );
  }

  const porcentaje = capacidad && capacidad.capacidadMaxima > 0
    ? Math.min(
        100,
        Math.round((capacidad.lugaresOcupados / capacidad.capacidadMaxima) * 100),
      )
    : 0;
  const barraColor = capacidad?.sobreCapacidad
    ? "bg-red-500"
    : porcentaje >= 80
      ? "bg-orange-500"
      : "bg-teal";

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 p-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal/10 text-teal">
              <CircleGauge className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold text-navy">Capacidad del playón</h2>
              <p className="text-xs text-slate-500">
                {actualizando ? "Actualizando..." : "Actualizada automáticamente cada 5 segundos"}
              </p>
            </div>
          </div>
        </div>
        {compacto ? (
          <Link
            className="text-sm font-semibold text-brand hover:underline"
            href="/capacidad"
          >
            Ver detalle
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => void actualizar()}
            disabled={actualizando}
            className="btn-ghost px-3 py-2"
            aria-label="Actualizar capacidad"
          >
            <RefreshCw className={`h-4 w-4 ${actualizando ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        )}
      </div>

      {capacidad ? (
        <>
          <div className={`grid gap-3 px-5 pb-5 ${compacto ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">Vehículos ocupando lugar</p>
              <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-navy">
                <CarFront className="h-5 w-5 text-orange-500" />
                {capacidad.lugaresOcupados}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-xs font-medium text-emerald-800">Lugares disponibles</p>
              <p className="mt-1 text-2xl font-bold text-emerald-900">
                {capacidad.lugaresDisponibles}
              </p>
            </div>
            {!compacto && (
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">Capacidad máxima</p>
                <p className="mt-1 text-2xl font-bold text-navy">
                  {capacidad.capacidadMaxima}
                </p>
              </div>
            )}
          </div>

          <div className="px-5 pb-5">
            <div
              aria-label={`${porcentaje}% de ocupación del playón`}
              className="h-2.5 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={porcentaje}
            >
              <div
                className={`h-full rounded-full transition-all ${barraColor}`}
                style={{ width: `${porcentaje}%` }}
              />
            </div>
            {capacidad.sobreCapacidad && (
              <p role="alert" className="mt-3 flex items-center gap-2 text-sm font-medium text-red-700">
                <AlertTriangle className="h-4 w-4" />
                Hay más vehículos ingresados que lugares configurados. No se cuentan lugares negativos.
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="mx-5 mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-950">
            Configurá la capacidad máxima del playón
          </p>
          <p className="mt-1 text-xs text-amber-900">
            {error || "La capacidad del lavadero todavía no está configurada."}
          </p>
        </div>
      )}

      {!compacto && (
        <form
          onSubmit={guardarCapacidad}
          className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 p-5 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <label
              htmlFor="capacidad-maxima"
              className="mb-1 block text-xs font-semibold text-slate-600"
            >
              Capacidad máxima de vehículos
            </label>
            <input
              id="capacidad-maxima"
              className="field"
              type="number"
              min={1}
              step={1}
              required
              value={capacidadInput}
              onChange={(event) => {
                capacidadInputDirty.current = true;
                setCapacidadInput(event.target.value);
              }}
              placeholder="Ej.: 12"
            />
          </div>
          <button
            className="btn-primary"
            disabled={guardando}
            type="submit"
          >
            {guardando ? "Guardando..." : "Guardar capacidad"}
          </button>
        </form>
      )}

      {error && capacidad && (
        <p role="alert" className="px-5 pb-4 text-sm text-red-700">
          {error}
        </p>
      )}

      <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
        Se cuentan vehículos ingresados que aún no fueron retirados. Los vehículos listos para retirar siguen ocupando capacidad.
      </p>
    </section>
  );
}
