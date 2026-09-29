"use client";

import { Card } from "@/components/ui/Card";
import { CarThumb } from "@/components/ui/CarThumb";
import { Plate, StageBadge } from "@/components/ui/badges";
import { useApp } from "@/lib/store";
import { useLookups } from "@/lib/lookups";
import { time } from "@/lib/format";

export default function PuestosPage() {
  const { boxes, atenciones, asignarBox } = useApp();
  const { vehiculo, cliente, serviciosDe } = useLookups();
  const espera = atenciones.filter((a) => a.estado === "EN_ESPERA");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Puestos y lavados</h1>
        <p className="text-sm text-slate-500">
          Lugares libres del playón y vehículos asignados a cada box.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {boxes.map((b) => {
          const att = atenciones.find((a) => a.id === b.atencionId);
          const v = att ? vehiculo(att.vehiculoId) : undefined;
          const c = att ? cliente(att.clienteId) : undefined;
          return (
            <article key={b.id} className="card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">{b.nombre}</h3>
                <span
                  className={`text-xs font-semibold ${
                    b.estado === "OCUPADO" ? "text-orange-500" : "text-emerald-600"
                  }`}
                >
                  {b.estado === "OCUPADO" ? "Ocupado" : "Disponible"}
                </span>
              </div>
              {v && att ? (
                <>
                  <CarThumb color={v.color} label={`${v.marca} ${v.modelo}`} />
                  <div className="mt-3 space-y-1">
                    <Plate value={v.patente} />
                    <p className="text-xs text-slate-500">
                      {c?.nombre} {c?.apellido} · {serviciosDe(att.servicioIds)}
                    </p>
                    <p className="text-xs text-slate-400">
                      Fin est. {time(att.horaEstimadaFin)}
                    </p>
                    <StageBadge estado={att.estado} />
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="grid h-28 place-items-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-400">
                    Puesto libre
                  </div>
                  {espera[0] && (
                    <button
                      className="btn-ghost w-full text-xs"
                      onClick={() => asignarBox(espera[0].id, b.id)}
                    >
                      Asignar {vehiculo(espera[0].vehiculoId)?.patente}
                    </button>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
