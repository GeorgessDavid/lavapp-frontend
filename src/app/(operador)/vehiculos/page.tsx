"use client";

import { Card } from "@/components/ui/Card";
import { Plate } from "@/components/ui/badges";
import { useApp } from "@/lib/store";

export default function VehiculosPage() {
  const { vehiculos, clientes, abonos, atenciones } = useApp();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Vehículos y clientes</h1>
        <p className="text-sm text-slate-500">
          Registro de patentes, abonos y frecuencia de visitas.
        </p>
      </div>
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              {["Patente", "Vehículo", "Cliente", "Visitas", "Abono", "Estado"].map(
                (h) => (
                  <th key={h} className="table-head pb-3">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {vehiculos.map((v) => {
              const c = clientes.find((x) => x.id === v.clienteId);
              const visits = atenciones.filter((a) => a.vehiculoId === v.id).length;
              const abono = abonos.find((a) => a.vehiculoId === v.id);
              return (
                <tr key={v.id} className="border-b border-slate-50">
                  <td className="py-3">
                    <Plate value={v.patente} />
                  </td>
                  <td>
                    {v.marca} {v.modelo}
                    <span className="ml-2 text-xs text-slate-400">{v.tipo}</span>
                  </td>
                  <td>
                    {c?.nombre} {c?.apellido}
                  </td>
                  <td>{visits}</td>
                  <td>
                    {abono
                      ? `${abono.disponibles} disp. / ${abono.utilizados} usados`
                      : "—"}
                  </td>
                  <td>
                    {c?.inactivo ? (
                      <span className="text-orange-600">Inactivo</span>
                    ) : c?.frecuente ? (
                      <span className="text-emerald-600">Frecuente</span>
                    ) : (
                      <span className="text-slate-400">Regular</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
