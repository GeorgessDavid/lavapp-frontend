"use client";

import { Car, Clock, Droplets, Sparkles } from "lucide-react";
import { Card, KpiCard } from "@/components/ui/Card";
import { Plate, StageBadge } from "@/components/ui/badges";
import { useApp } from "@/lib/store";
import { useLookups } from "@/lib/lookups";
import { time } from "@/lib/format";

export default function ColaPage() {
  const { atenciones, boxes, avanzar, asignarBox, retirar } = useApp();
  const { cliente, vehiculo, serviciosDe } = useLookups();
  const libres = boxes.filter((b) => b.estado === "DISPONIBLE");
  const activas = atenciones.filter((a) => a.estado !== "RETIRADO");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Cola</h1>
        <p className="text-sm text-slate-500">
          Visualizá y organizá los vehículos en espera, en proceso y listos.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="En espera"
          value={activas.filter((a) => a.estado === "EN_ESPERA").length}
          tone="purple"
          icon={<Clock className="h-5 w-5" />}
        />
        <KpiCard
          label="En proceso"
          value={
            activas.filter((a) =>
              ["LAVADO", "INTERIOR", "TERMINACIONES"].includes(a.estado),
            ).length
          }
          tone="teal"
          icon={<Droplets className="h-5 w-5" />}
        />
        <KpiCard
          label="Listos para retirar"
          value={activas.filter((a) => a.estado === "LISTO").length}
          tone="green"
          icon={<Sparkles className="h-5 w-5" />}
        />
        <KpiCard
          label="Capacidad del playón"
          value={`${boxes.filter((b) => b.estado === "OCUPADO").length}/${boxes.length}`}
          tone="orange"
          icon={<Car className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Card title="Cola de vehículos">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["Orden", "Patente", "Cliente", "Servicio", "Inicio est.", "Estado", "Acción"].map(
                  (h) => (
                    <th key={h} className="table-head pb-3">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {activas.map((a, i) => {
                const v = vehiculo(a.vehiculoId);
                const c = cliente(a.clienteId);
                return (
                  <tr key={a.id} className="border-b border-slate-50">
                    <td className="py-3 font-semibold text-slate-400">{i + 1}</td>
                    <td>
                      <Plate value={v?.patente ?? "—"} />
                    </td>
                    <td>
                      {c?.nombre} {c?.apellido}
                    </td>
                    <td className="text-slate-500">{serviciosDe(a.servicioIds)}</td>
                    <td>{time(a.horaEstimadaInicio)}</td>
                    <td>
                      <StageBadge estado={a.estado} />
                    </td>
                    <td className="space-x-2">
                      {a.estado === "EN_ESPERA" && libres[0] && (
                        <button
                          className="text-xs font-semibold text-[#6C5CE7]"
                          onClick={() => asignarBox(a.id, libres[0].id)}
                        >
                          Asignar puesto
                        </button>
                      )}
                      {a.estado !== "EN_ESPERA" && a.estado !== "LISTO" && (
                        <button
                          className="text-xs font-semibold text-[#6C5CE7]"
                          onClick={() => avanzar(a.id)}
                        >
                          Siguiente etapa
                        </button>
                      )}
                      {a.estado === "LISTO" && (
                        <button
                          className="text-xs font-semibold text-emerald-600"
                          onClick={() => retirar(a.id)}
                        >
                          Confirmar retiro
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <Card title="Próximos servicios">
          <ul className="space-y-3">
            {activas
              .filter((a) => a.estado === "EN_ESPERA")
              .map((a) => {
                const v = vehiculo(a.vehiculoId);
                return (
                  <li
                    key={a.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {v?.marca} {v?.modelo}
                      </p>
                      <p className="text-xs text-slate-500">{v?.patente}</p>
                    </div>
                    <span className="text-xs font-semibold text-[#6C5CE7]">
                      {time(a.horaEstimadaInicio)}
                    </span>
                  </li>
                );
              })}
          </ul>
        </Card>
      </div>
    </div>
  );
}
