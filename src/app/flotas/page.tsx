"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { Plate, StageBadge } from "@/components/ui/badges";
import { Card } from "@/components/ui/Card";
import { useApp } from "@/lib/store";
import { time } from "@/lib/format";
import { useLookups } from "@/lib/lookups";
import { LogOut } from "lucide-react";

export default function FlotasPage() {
  const { user, logout, flotas, atenciones, vehiculos } = useApp();
  const { cliente, vehiculo, serviciosDe } = useLookups();
  const router = useRouter();
  const [empresaId, setEmpresaId] = useState(flotas[0]?.id ?? "");
  const empresa = flotas.find((f) => f.id === empresaId) ?? flotas[0];

  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  if (!user) return null;

  const units = vehiculos.filter((v) => empresa?.vehiculoIds.includes(v.id));
  const atts = atenciones.filter((a) => empresa?.vehiculoIds.includes(a.vehiculoId));

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="flex w-[220px] flex-col bg-navy p-5 text-white">
        <Logo light />
        <nav className="mt-8 text-sm font-medium">
          <span className="block rounded-xl bg-white/12 px-3 py-2.5">Flotas</span>
        </nav>
        <button
          className="mt-auto flex items-center gap-2 text-sm text-white/60"
          onClick={() => {
            logout();
            router.push("/login");
          }}
        >
          <LogOut className="h-4 w-4" /> Salir
        </button>
      </aside>
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold">Flotas</h1>
        <p className="text-sm text-slate-500">
          Estado y tiempo estimado de cada unidad. Perfil separado del operador.
        </p>

        <div className="mt-5 grid gap-5 xl:grid-cols-[0.7fr_1.3fr]">
          <Card title="Empresas asociadas">
            <ul className="space-y-2">
              {flotas.map((f) => (
                <li key={f.id}>
                  <button
                    onClick={() => setEmpresaId(f.id)}
                    className={`w-full rounded-xl px-3 py-3 text-left ${
                      f.id === empresa?.id ? "bg-[#EDEBFF]" : "bg-slate-50"
                    }`}
                  >
                    <p className="font-semibold">{f.nombre}</p>
                    <p className="text-xs text-slate-500">
                      {f.vehiculoIds.length} vehículos · {f.estado}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card title={empresa ? `Detalle · ${empresa.nombre}` : "Detalle"}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {["Patente", "Unidad", "Servicio", "Estado", "Fin est."].map((h) => (
                    <th key={h} className="table-head pb-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {units.map((v) => {
                  const a = atts.find((x) => x.vehiculoId === v.id);
                  const c = cliente(v.clienteId);
                  return (
                    <tr key={v.id} className="border-b border-slate-50">
                      <td className="py-3">
                        <Plate value={v.patente} />
                      </td>
                      <td>
                        {v.marca} {v.modelo}
                        <p className="text-xs text-slate-400">{c?.nombre}</p>
                      </td>
                      <td>{a ? serviciosDe(a.servicioIds) : "Sin servicio"}</td>
                      <td>
                        {a ? (
                          <StageBadge estado={a.estado} />
                        ) : (
                          <span className="text-xs text-slate-400">En base</span>
                        )}
                      </td>
                      <td>{a ? time(a.horaEstimadaFin) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
              Configuración de lavado recurrente: todavía es un MVP visual. El
              alta de reglas semanales se conectará al backend.
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
