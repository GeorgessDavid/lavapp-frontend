"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, LoaderCircle, Timer } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ApiError, apiConfig } from "@/lib/api";
import { configurarDuracion, listarServicios } from "@/lib/api-servicios";
import { money } from "@/lib/format";
import {
  DURACION_MAXIMA_MIN,
  DURACION_MINIMA_MIN,
  cambioLaDuracion,
  validarDuracion,
} from "@/lib/servicios";
import { useApp } from "@/lib/store";

interface FilaServicio {
  id: number | string;
  nombre: string;
  duracionMin: number;
  precio: number;
}

type Carga =
  | { tipo: "cargando" }
  | { tipo: "sin-lavadero" }
  | { tipo: "error"; mensaje: string }
  | { tipo: "listo"; servicios: FilaServicio[] };

/**
 * La duración estimada de cada servicio del lavadero (HU-54): se ve y se edita de a un servicio, y
 * cada uno se guarda por separado, así cambiar uno no toca a los demás. En modo real pega al
 * backend; en modo demo usa los servicios del mock y los cambios duran lo que dura la página.
 */
export function DuracionServicios() {
  const { user, servicios: serviciosDemo } = useApp();
  const lavaderoId = user?.lavaderoId;
  const [carga, setCarga] = useState<Carga>({ tipo: "cargando" });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (apiConfig.USE_MOCK) return;
    if (lavaderoId === undefined) return;
    let vigente = true;
    listarServicios(lavaderoId)
      .then((servicios) => {
        if (vigente) setCarga({ tipo: "listo", servicios });
      })
      .catch((error: unknown) => {
        if (vigente) {
          setCarga({
            tipo: "error",
            mensaje:
              error instanceof ApiError
                ? error.message
                : "No se pudieron cargar los servicios. Revisá la conexión y volvé a intentar.",
          });
        }
      });
    return () => {
      vigente = false;
    };
  }, [lavaderoId, intento]);

  const vista: Carga = apiConfig.USE_MOCK
    ? { tipo: "listo", servicios: serviciosDemo }
    : lavaderoId === undefined
      ? { tipo: "sin-lavadero" }
      : carga;

  if (vista.tipo === "cargando") {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-slate-500">
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        Cargando los servicios…
      </p>
    );
  }
  if (vista.tipo === "sin-lavadero") {
    return (
      <p className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
        Tu usuario no está asociado a un lavadero, así que no hay servicios para configurar.
      </p>
    );
  }
  if (vista.tipo === "error") {
    return (
      <div role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
        <p>{vista.mensaje}</p>
        <button
          type="button"
          className="mt-2 font-semibold underline"
          onClick={() => {
            setCarga({ tipo: "cargando" });
            setIntento((n) => n + 1);
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <Card title="Duración estimada" action={<Timer className="h-5 w-5 text-brand" aria-hidden="true" />}>
      {apiConfig.USE_MOCK && (
        <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          Modo demo: los cambios se ven en esta página pero no se guardan.
        </p>
      )}
      {vista.servicios.length === 0 ? (
        <p className="text-sm text-slate-500">El lavadero todavía no tiene servicios cargados.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {vista.servicios.map((servicio) => (
            <FilaDuracion
              key={servicio.id}
              servicio={servicio}
              onGuardada={(actualizado) => {
                if (apiConfig.USE_MOCK) return;
                setCarga((actual) =>
                  actual.tipo === "listo"
                    ? {
                        tipo: "listo",
                        servicios: actual.servicios.map((s) => (s.id === actualizado.id ? actualizado : s)),
                      }
                    : actual,
                );
              }}
              guardar={async (minutos) => {
                if (apiConfig.USE_MOCK || lavaderoId === undefined) {
                  return { ...servicio, duracionMin: minutos };
                }
                return configurarDuracion(lavaderoId, Number(servicio.id), minutos);
              }}
            />
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-slate-400">
        Entre {DURACION_MINIMA_MIN} y {DURACION_MAXIMA_MIN} minutos. Un cambio vale para los tiempos
        estimados desde ese momento; las reservas ya tomadas conservan su horario.
      </p>
    </Card>
  );
}

function FilaDuracion({
  servicio,
  guardar,
  onGuardada,
}: {
  servicio: FilaServicio;
  guardar: (minutos: number) => Promise<FilaServicio>;
  onGuardada: (servicio: FilaServicio) => void;
}) {
  const [guardada, setGuardada] = useState(servicio.duracionMin);
  const [texto, setTexto] = useState(String(servicio.duracionMin));
  const [estado, setEstado] = useState<
    { tipo: "quieto" } | { tipo: "guardando" } | { tipo: "guardado" } | { tipo: "error"; mensaje: string }
  >({ tipo: "quieto" });
  const campoId = `duracion-${servicio.id}`;
  const ayudaId = `${campoId}-ayuda`;

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (estado.tipo === "guardando") return;
    const validada = validarDuracion(texto);
    if (!validada.ok) {
      setEstado({ tipo: "error", mensaje: validada.mensaje });
      return;
    }
    setEstado({ tipo: "guardando" });
    try {
      const actualizado = await guardar(validada.minutos);
      setGuardada(actualizado.duracionMin);
      setTexto(String(actualizado.duracionMin));
      setEstado({ tipo: "guardado" });
      onGuardada(actualizado);
    } catch (error) {
      setEstado({
        tipo: "error",
        mensaje:
          error instanceof ApiError
            ? error.message
            : "No se pudo guardar. Revisá la conexión y volvé a intentar.",
      });
    }
  }

  const sinCambios = !cambioLaDuracion(texto, guardada);

  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <label htmlFor={campoId} className="font-semibold text-navy">
          {servicio.nombre}
        </label>
        <p className="text-xs text-slate-400">
          {money(servicio.precio)} · hoy {guardada} min
        </p>
      </div>
      <form onSubmit={(e) => void enviar(e)} className="flex flex-col gap-1 sm:items-end">
        <div className="flex items-center gap-2">
          <input
            id={campoId}
            className="field w-24 text-right"
            inputMode="numeric"
            value={texto}
            aria-describedby={ayudaId}
            aria-invalid={estado.tipo === "error"}
            disabled={estado.tipo === "guardando"}
            onChange={(e) => {
              setTexto(e.target.value);
              if (estado.tipo !== "guardando") setEstado({ tipo: "quieto" });
            }}
          />
          <span className="text-sm text-slate-500">min</span>
          <button
            type="submit"
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            disabled={estado.tipo === "guardando" || sinCambios}
          >
            {estado.tipo === "guardando" ? "Guardando…" : "Guardar"}
          </button>
        </div>
        <p id={ayudaId} role="status" className="min-h-4 text-xs">
          {estado.tipo === "error" && <span className="text-red-600">{estado.mensaje}</span>}
          {estado.tipo === "guardado" && (
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Guardado
            </span>
          )}
        </p>
      </form>
    </li>
  );
}
