"use client";

import { AlertTriangle, Car, Clock, Droplets, Sparkles } from "lucide-react";
import { Card, KpiCard } from "@/components/ui/Card";
import { CarThumb } from "@/components/ui/CarThumb";
import { Plate, StageBadge } from "@/components/ui/badges";
import { useApp } from "@/lib/store";
import { useLookups } from "@/lib/lookups";
import { time } from "@/lib/format";

export default function DashboardPage() {
  const { atenciones, boxes, avanzar } = useApp();
  const { cliente, vehiculo, serviciosDe } = useLookups();

  const activas = atenciones.filter((a) => a.estado !== "RETIRADO");
  const espera = activas.filter((a) => a.estado === "EN_ESPERA");
  const proceso = activas.filter((a) =>
    ["LAVADO", "INTERIOR", "TERMINACIONES"].includes(a.estado),
  );
  const listos = atenciones.filter((a) => a.estado === "LISTO");
  const ocupados = boxes.filter((b) => b.estado === "OCUPADO");
  const demoras = activas.filter((a) => a.demoraMin > 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Panel operativo</h1>
        <p className="text-sm text-slate-500">
          Vista general del playón, la cola y las demoras del día.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="En espera"
          value={espera.length}
          hint="Cola digital"
          tone="purple"
          icon={<Clock className="h-5 w-5" />}
        />
        <KpiCard
          label="En proceso"
          value={proceso.length}
          hint="Lavado / interior / terminaciones"
          tone="teal"
          icon={<Droplets className="h-5 w-5" />}
        />
        <KpiCard
          label="Listos para retirar"
          value={listos.length}
          hint="Ocupan playón hasta el retiro"
          tone="green"
          icon={<Sparkles className="h-5 w-5" />}
        />
        <KpiCard
          label="Capacidad"
          value={`${ocupados.length}/${boxes.length}`}
          hint="Puestos ocupados"
          tone="orange"
          icon={<Car className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card title="Cola de atención">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {["Patente", "Cliente", "Servicio", "ETA", "Estado", ""].map(
                    (h) => (
                      <th key={h} className="table-head pb-3">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {activas.slice(0, 8).map((a) => {
                  const v = vehiculo(a.vehiculoId);
                  const c = cliente(a.clienteId);
                  return (
                    <tr key={a.id} className="border-b border-slate-50">
                      <td className="py-3">
                        <Plate value={v?.patente ?? "—"} />
                      </td>
                      <td>
                        {c?.nombre} {c?.apellido}
                      </td>
                      <td className="text-slate-500">
                        {serviciosDe(a.servicioIds)}
                      </td>
                      <td>{time(a.horaEstimadaFin)}</td>
                      <td>
                        <StageBadge estado={a.estado} />
                      </td>
                      <td>
                        {a.estado !== "LISTO" ? (
                          <button
                            className="text-xs font-semibold text-[#6C5CE7]"
                            onClick={() => avanzar(a.id)}
                          >
                            Avanzar
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-600">Aviso enviado</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-5">
          <Card title="Puestos del playón">
            <div className="grid grid-cols-2 gap-3">
              {boxes.slice(0, 4).map((b) => {
                const att = atenciones.find((a) => a.id === b.atencionId);
                const v = att ? vehiculo(att.vehiculoId) : undefined;
                return (
                  <div
                    key={b.id}
                    className="rounded-2xl border border-slate-100 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-semibold text-navy">{b.nombre}</span>
                      <span
                        className={
                          b.estado === "OCUPADO"
                            ? "text-orange-500"
                            : "text-emerald-600"
                        }
                      >
                        {b.estado === "OCUPADO" ? "Ocupado" : "Libre"}
                      </span>
                    </div>
                    {v ? (
                      <CarThumb color={v.color} label={`${v.marca} ${v.modelo}`} />
                    ) : (
                      <div className="grid h-24 place-items-center rounded-2xl bg-slate-50 text-xs text-slate-400">
                        Disponible
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="Alertas">
            {demoras.length === 0 ? (
              <p className="text-sm text-slate-500">Sin demoras relevantes.</p>
            ) : (
              <ul className="space-y-2">
                {demoras.map((a) => {
                  const v = vehiculo(a.vehiculoId);
                  return (
                    <li
                      key={a.id}
                      className="flex items-start gap-2 rounded-xl bg-orange-50 px-3 py-2 text-sm text-orange-800"
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      {v?.patente} tiene {a.demoraMin} min de demora. El cliente
                      ya puede verlo en el link de seguimiento.
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
