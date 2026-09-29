"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Clock, Percent, RefreshCcw } from "lucide-react";
import { Card, KpiCard } from "@/components/ui/Card";
import { reportes } from "@/lib/mock-data";
import { money } from "@/lib/format";
import { useApp } from "@/lib/store";

export default function ReportesPage() {
  const { user } = useApp();
  const router = useRouter();
  useEffect(() => {
    if (user && user.rol !== "DUENO") router.replace("/dashboard");
  }, [user, router]);

  const max = Math.max(...reportes.vehiculosPorDia.map((d) => d.cantidad));
  const lineMax = Math.max(...reportes.tiempoPorSemana.map((d) => d.minutos));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Reportes</h1>
        <p className="text-sm text-slate-500">
          Vista general del rendimiento del lavadero para el dueño.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Vehículos atendidos"
          value={reportes.vehiculosAtendidos}
          tone="purple"
          icon={<BarChart3 className="h-5 w-5" />}
        />
        <KpiCard
          label="Tiempo promedio"
          value={`${reportes.tiempoPromedioMin} min`}
          tone="teal"
          icon={<Clock className="h-5 w-5" />}
        />
        <KpiCard
          label="Servicios reagendados"
          value={reportes.serviciosReagendados}
          tone="orange"
          icon={<RefreshCcw className="h-5 w-5" />}
        />
        <KpiCard
          label="Ocupación promedio"
          value={`${reportes.ocupacionPromedio}%`}
          tone="green"
          icon={<Percent className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card title="Vehículos atendidos por día" className="xl:col-span-1">
          <div className="flex h-44 items-end gap-2">
            {reportes.vehiculosPorDia.map((d) => (
              <div key={d.dia} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-lg bg-[#6C5CE7]"
                  style={{ height: `${(d.cantidad / max) * 100}%` }}
                />
                <span className="text-[10px] text-slate-400">{d.dia}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Reservas vs. espontáneos">
          <div className="flex items-center gap-4">
            <div
              className="h-36 w-36 rounded-full"
              style={{
                background: `conic-gradient(#6C5CE7 ${reportes.reservasVsEspontaneos.reservas}%, #2EC4B6 0)`,
              }}
            />
            <ul className="text-sm">
              <li className="mb-2">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#6C5CE7]" />
                Reservas {reportes.reservasVsEspontaneos.reservas}%
              </li>
              <li>
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#2EC4B6]" />
                Espontáneos {reportes.reservasVsEspontaneos.espontaneos}%
              </li>
            </ul>
          </div>
        </Card>

        <Card title="Tiempo promedio por semana">
          <svg viewBox="0 0 280 140" className="w-full">
            {(() => {
              const pts = reportes.tiempoPorSemana.map((d, i) => {
                const x = 20 + i * 40;
                const y = 120 - (d.minutos / lineMax) * 90;
                return `${x},${y}`;
              });
              return (
                <>
                  <polyline
                    fill="none"
                    stroke="#2EC4B6"
                    strokeWidth="3"
                    points={pts.join(" ")}
                  />
                  {reportes.tiempoPorSemana.map((d, i) => (
                    <text
                      key={d.dia}
                      x={20 + i * 40}
                      y="135"
                      fontSize="10"
                      fill="#94a3b8"
                      textAnchor="middle"
                    >
                      {d.dia}
                    </text>
                  ))}
                </>
              );
            })()}
          </svg>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.9fr]">
        <Card title="Servicios más solicitados">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["Servicio", "Cantidad", "% del total", "Ingreso"].map((h) => (
                  <th key={h} className="table-head pb-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportes.serviciosMasSolicitados.map((s) => (
                <tr key={s.servicio} className="border-b border-slate-50">
                  <td className="py-3">{s.servicio}</td>
                  <td>{s.cantidad}</td>
                  <td>{s.porcentaje}%</td>
                  <td>{money(s.ingreso)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="Insights del período">
          <ul className="space-y-3">
            {reportes.insights.map((i) => (
              <li
                key={i.texto}
                className={`rounded-xl px-3 py-3 text-sm ${
                  i.tipo === "ok"
                    ? "bg-emerald-50 text-emerald-800"
                    : i.tipo === "warn"
                      ? "bg-orange-50 text-orange-800"
                      : "bg-sky-50 text-sky-800"
                }`}
              >
                {i.texto}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
