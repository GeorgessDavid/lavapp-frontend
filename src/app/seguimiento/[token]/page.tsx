"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { Star } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { useApp } from "@/lib/store";
import { stageLabel, time } from "@/lib/format";
import type { ServiceStage } from "@/lib/types";

const pipeline: ServiceStage[] = [
  "EN_ESPERA",
  "LAVADO",
  "INTERIOR",
  "TERMINACIONES",
  "LISTO",
];

export default function SeguimientoPage() {
  const params = useParams<{ token: string }>();
  const { atenciones, vehiculos, clientes, promociones } = useApp();

  const atencion = useMemo(
    () =>
      atenciones.find(
        (a) => a.tokenSeguimiento.toLowerCase() === String(params.token).toLowerCase(),
      ),
    [atenciones, params.token],
  );

  if (!atencion) {
    return (
      <div className="mx-auto min-h-screen max-w-md bg-white p-6">
        <Logo />
        <p className="mt-8 text-slate-500">
          No encontramos ese link de seguimiento.
        </p>
      </div>
    );
  }

  const v = vehiculos.find((x) => x.id === atencion.vehiculoId);
  const c = clientes.find((x) => x.id === atencion.clienteId);
  const idx = pipeline.indexOf(
    atencion.estado === "RETIRADO" ? "LISTO" : atencion.estado,
  );
  const delayed = atencion.demoraMin > 0 && atencion.estado !== "LISTO";

  return (
    <div className="min-h-screen bg-[#F4F7FC]">
      <div className="mx-auto max-w-md px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <Logo />
          <span className="text-xs text-slate-400">Cliente</span>
        </div>

        <article className="card p-5">
          <h1 className="text-xl font-bold">Seguimiento de tu vehículo</h1>
          <p className="mt-1 text-sm text-slate-500">
            {v?.marca} {v?.modelo} · {v?.patente}
          </p>
          <p className="text-xs text-slate-400">Hola {c?.nombre}</p>

          {delayed && (
            <div className="mt-4 rounded-2xl bg-orange-50 px-4 py-3 text-sm text-orange-800">
              Tu vehículo presenta una pequeña demora de {atencion.demoraMin}{" "}
              minutos. El horario estimado se actualizó.
            </div>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-[11px] text-slate-400">Inicio estimado</p>
              <p className="text-lg font-bold">{time(atencion.horaEstimadaInicio)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-[11px] text-slate-400">Listo estimado</p>
              <p className="text-lg font-bold">{time(atencion.horaEstimadaFin)}</p>
            </div>
          </div>

          <ol className="mt-6 space-y-3">
            {pipeline.map((step, i) => (
              <li key={step} className="flex items-center gap-3">
                <span
                  className={`h-3 w-3 rounded-full ${
                    i <= idx ? "bg-[#6C5CE7]" : "bg-slate-200"
                  }`}
                />
                <span
                  className={`text-sm ${i <= idx ? "font-semibold text-navy" : "text-slate-400"}`}
                >
                  {stageLabel[step]}
                </span>
              </li>
            ))}
          </ol>

          {atencion.estado === "LISTO" && (
            <p className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              ¡Tu vehículo ya está listo para retirar!
            </p>
          )}
        </article>

        <article className="card mt-4 p-5">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Star className="h-4 w-4 text-[#6C5CE7]" /> Calificá tu experiencia
          </p>
          <div className="flex gap-1 text-2xl text-slate-200">
            {"★★★★★".split("").map((s, i) => (
              <button key={i} className="hover:text-amber-400">
                {s}
              </button>
            ))}
          </div>
          <textarea
            className="field mt-3 min-h-20"
            placeholder="Comentarios (opcional)"
          />
        </article>

        <article className="mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-[#6C5CE7] to-[#3B82F6] p-5 text-white">
          <p className="text-xs uppercase tracking-wide text-white/70">
            Beneficio exclusivo
          </p>
          <h2 className="mt-1 text-lg font-bold">{promociones[0]?.titulo}</h2>
          <p className="mt-1 text-sm text-white/80">
            {promociones[0]?.descripcion}
          </p>
        </article>
      </div>
    </div>
  );
}
