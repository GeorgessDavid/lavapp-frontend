"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Plate, StageBadge } from "@/components/ui/badges";
import { useApp } from "@/lib/store";
import { useLookups } from "@/lib/lookups";
import { time } from "@/lib/format";

export default function HistorialPage() {
  const { atenciones, clientes, vehiculos, abonos } = useApp();
  const { cliente, vehiculo, serviciosDe } = useLookups();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return atenciones.filter((a) => {
      const c = cliente(a.clienteId);
      const v = vehiculo(a.vehiculoId);
      const blob = `${c?.nombre} ${c?.apellido} ${v?.patente} ${v?.marca} ${v?.modelo}`.toLowerCase();
      return blob.includes(term);
    });
  }, [q, atenciones, cliente, vehiculo]);

  const selected = filtered[0];
  const selectedCliente = selected ? cliente(selected.clienteId) : undefined;
  const selectedVehiculo = selected ? vehiculo(selected.vehiculoId) : undefined;
  const abono = abonos.find((a) => a.clienteId === selectedCliente?.id);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Historial de servicios</h1>
        <p className="text-sm text-slate-500">
          Buscá por cliente o patente. También aplica a vehículos de flota.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
        <Card
          title="Resultados"
          action={
            <input
              className="field max-w-xs"
              placeholder="Cliente, patente o modelo"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          }
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["Fecha", "Patente", "Cliente", "Servicio", "Estado"].map((h) => (
                  <th key={h} className="table-head pb-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const c = cliente(a.clienteId);
                const v = vehiculo(a.vehiculoId);
                return (
                  <tr key={a.id} className="border-b border-slate-50">
                    <td className="py-3">{time(a.fechaIngreso)}</td>
                    <td>
                      <Plate value={v?.patente ?? "—"} />
                    </td>
                    <td>
                      {c?.nombre} {c?.apellido}
                    </td>
                    <td>{serviciosDe(a.servicioIds)}</td>
                    <td>
                      <StageBadge estado={a.estado} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <Card title="Ficha del cliente">
          {selectedCliente && selectedVehiculo ? (
            <div className="space-y-3 text-sm">
              <p className="text-lg font-semibold">
                {selectedCliente.nombre} {selectedCliente.apellido}
              </p>
              <p className="text-slate-500">{selectedCliente.telefono}</p>
              <Plate value={selectedVehiculo.patente} />
              <p>
                {selectedVehiculo.marca} {selectedVehiculo.modelo}
              </p>
              <p className="text-xs text-slate-400">
                Última visita: {selectedCliente.fechaUltimaVisita}
              </p>
              {selectedCliente.frecuente && (
                <span className="inline-flex rounded-full bg-[#EDEBFF] px-2 py-1 text-[11px] font-semibold text-[#5B4CDB]">
                  Cliente frecuente
                </span>
              )}
              {selectedCliente.inactivo && (
                <span className="inline-flex rounded-full bg-orange-50 px-2 py-1 text-[11px] font-semibold text-orange-700">
                  Inactivo +30 días
                </span>
              )}
              {abono && (
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Abono</p>
                  <p className="font-semibold">{abono.tipo}</p>
                  <p className="text-xs">
                    {abono.utilizados} usados · {abono.disponibles} disponibles
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Sin resultados.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
