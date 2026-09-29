"use client";

import { Gift, Star } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useApp } from "@/lib/store";

export default function FidelizacionPage() {
  const { promociones, clientes } = useApp();
  const inactivos = clientes.filter((c) => c.inactivo);
  const frecuentes = clientes.filter((c) => c.frecuente);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Fidelización</h1>
        <p className="text-sm text-slate-500">
          Beneficios, promociones y recuperación de clientes que dejaron de venir.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Promociones activas">
          <ul className="space-y-3">
            {promociones.map((p) => (
              <li
                key={p.id}
                className="flex gap-3 rounded-2xl border border-slate-100 p-4"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#EDEBFF] text-[#6C5CE7]">
                  <Gift className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold">{p.titulo}</p>
                  <p className="text-sm text-slate-500">{p.descripcion}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Vigencia {p.vigencia}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Clientes inactivos">
          <ul className="space-y-3">
            {inactivos.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-xl bg-orange-50 px-3 py-3"
              >
                <div>
                  <p className="font-semibold">
                    {c.nombre} {c.apellido}
                  </p>
                  <p className="text-xs text-slate-500">
                    Última visita {c.fechaUltimaVisita}
                  </p>
                </div>
                <button className="btn-primary py-1.5 text-xs">
                  Enviar promo
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Clientes frecuentes">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {frecuentes.map((c) => (
            <div key={c.id} className="rounded-2xl border border-slate-100 p-4">
              <div className="mb-2 flex items-center gap-2 text-[#6C5CE7]">
                <Star className="h-4 w-4 fill-current" />
                <span className="text-xs font-semibold">Frecuente</span>
              </div>
              <p className="font-semibold">
                {c.nombre} {c.apellido}
              </p>
              <p className="text-xs text-slate-500">{c.telefono}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
