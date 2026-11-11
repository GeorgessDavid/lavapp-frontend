"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Car, Clock, Droplets, Sparkles } from "lucide-react";
import { Card, KpiCard } from "@/components/ui/Card";
import { Plate, StageBadge } from "@/components/ui/badges";
import { CapacidadResumen } from "@/components/capacity/CapacidadResumen";
import { useApp } from "@/lib/store";
import { time } from "@/lib/format";
import { etapaDeOrden } from "@/lib/etapas";
import {
  ApiError,
  listarOrdenesParaPuestos,
  listarPuestosReserva,
  type OrdenParaPuesto,
  type ReservaPuesto,
} from "@/lib/api";
import { fetchTiemposCola, type TiempoEstimadoApi } from "@/lib/api-cola";
import { contarPuestosOcupados, textoPuestos } from "@/lib/panel";

function horaEstimada(tiempo: TiempoEstimadoApi | undefined) {
  if (!tiempo) return "—";
  const hora = tiempo.estado === "EN_PROGRESO" ? tiempo.finEstimado : tiempo.inicioEstimado;
  if (!hora) return "Sin estimar";
  return time(hora);
}

export function PanelOperativo() {
  const { user } = useApp();
  const lavaderoId = user?.lavaderoId;
  const [ordenes, setOrdenes] = useState<OrdenParaPuesto[] | null>(null);
  const [puestos, setPuestos] = useState<ReservaPuesto[]>([]);
  const [tiempos, setTiempos] = useState<Map<number, TiempoEstimadoApi>>(() => new Map());
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    if (lavaderoId === undefined) return;
    try {
      const [ordenesApi, puestosApi, tiemposApi] = await Promise.all([
        listarOrdenesParaPuestos(lavaderoId),
        listarPuestosReserva(lavaderoId),
        fetchTiemposCola(lavaderoId).catch(() => [] as TiempoEstimadoApi[]),
      ]);
      setOrdenes(ordenesApi);
      setPuestos(puestosApi);
      setTiempos(new Map(tiemposApi.map((tiempo) => [tiempo.ordenId, tiempo])));
      setError("");
    } catch (causa) {
      setError(
        causa instanceof ApiError
          ? causa.message
          : "No se pudo cargar el panel del lavadero.",
      );
    }
  }, [lavaderoId]);

  useEffect(() => {
    const id = window.setTimeout(() => void cargar(), 0);
    return () => window.clearTimeout(id);
  }, [cargar]);

  if (lavaderoId === undefined) {
    return <p role="alert">La cuenta no tiene un lavadero asociado.</p>;
  }

  const activas = ordenes ?? [];
  const espera = activas.filter((orden) => orden.estado === "EN_ESPERA");
  const proceso = activas.filter((orden) => orden.estado === "EN_PROGRESO");
  const listos = activas.filter((orden) => orden.estado === "LISTO");
  const ocupados = contarPuestosOcupados(activas);
  const demoras = activas.flatMap((orden) => {
    const tiempo = tiempos.get(orden.ordenId);
    if (!tiempo || tiempo.demoraMin <= 0) return [];
    return [{ orden, minutos: tiempo.demoraMin }];
  });
  const ordenPorPuesto = new Map<number, OrdenParaPuesto>();
  for (const orden of activas) {
    if (orden.puestoId != null && !ordenPorPuesto.has(orden.puestoId)) {
      ordenPorPuesto.set(orden.puestoId, orden);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Panel operativo</h1>
        <p className="text-sm text-slate-500">
          Vista general del playón, la cola y las demoras del día.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="En espera"
          value={ordenes === null ? "—" : espera.length}
          hint="Cola digital"
          tone="purple"
          icon={<Clock className="h-5 w-5" />}
        />
        <KpiCard
          label="En proceso"
          value={ordenes === null ? "—" : proceso.length}
          hint="Lavado en curso"
          tone="teal"
          icon={<Droplets className="h-5 w-5" />}
        />
        <KpiCard
          label="Listos para retirar"
          value={ordenes === null ? "—" : listos.length}
          hint="Ocupan playón hasta el retiro"
          tone="green"
          icon={<Sparkles className="h-5 w-5" />}
        />
        <KpiCard
          label="Puestos ocupados"
          value={ordenes === null ? "—" : textoPuestos(ocupados, puestos.length)}
          hint="Puestos de lavado"
          tone="orange"
          icon={<Car className="h-5 w-5" />}
        />
      </div>

      <CapacidadResumen compacto />

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card
          title="Cola de atención"
          action={
            <Link href="/cola" className="text-xs font-semibold text-[#6C5CE7]">
              Ver cola
            </Link>
          }
        >
          {ordenes !== null && activas.length === 0 ? (
            <p className="text-sm text-slate-500">No hay vehículos en la cola.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {["Patente", "Cliente", "Servicio", "Estimado", "Estado"].map((h) => (
                      <th key={h} className="table-head pb-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activas.map((orden) => (
                    <tr key={orden.ordenId} className="border-b border-slate-50">
                      <td className="py-3">
                        <Plate value={orden.patente} />
                      </td>
                      <td>{orden.clienteNombre}</td>
                      <td className="text-slate-500">{orden.servicioNombre}</td>
                      <td>{horaEstimada(tiempos.get(orden.ordenId))}</td>
                      <td>
                        <StageBadge estado={etapaDeOrden(orden.estado)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card title="Puestos del playón">
            {puestos.length === 0 ? (
              <p className="text-sm text-slate-500">Este lavadero no tiene puestos cargados.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {puestos.map((puesto) => {
                  const orden = ordenPorPuesto.get(puesto.id);
                  return (
                    <div key={puesto.id} className="rounded-2xl border border-slate-100 p-3">
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="font-semibold text-navy">{puesto.nombre}</span>
                        <span className={orden ? "text-orange-500" : "text-emerald-600"}>
                          {orden ? "Ocupado" : "Libre"}
                        </span>
                      </div>
                      {orden ? (
                        <div className="grid h-24 place-items-center rounded-2xl bg-slate-50 text-center text-xs text-navy">
                          <span>
                            <span className="font-semibold">{orden.patente}</span>
                            {orden.modelo ? <span className="mt-1 block text-slate-500">{orden.modelo}</span> : null}
                          </span>
                        </div>
                      ) : (
                        <div className="grid h-24 place-items-center rounded-2xl bg-slate-50 text-xs text-slate-400">
                          Disponible
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card title="Alertas">
            {demoras.length === 0 ? (
              <p className="text-sm text-slate-500">Sin demoras relevantes.</p>
            ) : (
              <ul className="space-y-2">
                {demoras.map(({ orden, minutos }) => (
                  <li
                    key={orden.ordenId}
                    className="flex items-start gap-2 rounded-xl bg-orange-50 px-3 py-2 text-sm text-orange-800"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    {orden.patente} tiene {minutos} min de demora. El cliente ya puede verlo en el
                    link de seguimiento.
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
