"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, Car, Clock, Droplets, Sparkles } from "lucide-react";
import { Card, KpiCard } from "@/components/ui/Card";
import { Plate, StageBadge } from "@/components/ui/badges";
import { useApp } from "@/lib/store";
import { useLookups } from "@/lib/lookups";
import { time } from "@/lib/format";
import { tienePuestoAsignado } from "@/lib/box-assignment";
import { apiConfig, fetchColaPrioritaria } from "@/lib/api";
import {
  fechaHoraReserva,
  obtenerReservaConfirmada,
  priorizarAtencionesEnEspera,
} from "@/lib/queue-priority";
import type { Atencion, OrdenColaApi } from "@/lib/types";

type FilaCola =
  | { tipo: "local"; atencion: Atencion }
  | { tipo: "backend"; orden: OrdenColaApi; atencion?: Atencion };

export default function ColaPage() {
  const {
    atenciones,
    boxes,
    avanzar,
    iniciarLavado,
    asignarBox,
    retirar,
    user,
    servicios,
    vehiculos,
    clientes,
    reservas,
  } = useApp();
  const { serviciosDe } = useLookups();
  const [colaBackend, setColaBackend] = useState<OrdenColaApi[] | null>(null);
  const [errorBackend, setErrorBackend] = useState("");
  const [cargandoBackend, setCargandoBackend] = useState(false);
  const lavaderoId = user?.lavaderoId;
  const libres = boxes.filter((b) => b.estado === "DISPONIBLE");
  const activas = atenciones.filter((a) => a.estado !== "RETIRADO");
  const enEsperaLocal = useMemo(
    () =>
      priorizarAtencionesEnEspera(
        activas.filter((atencion) => atencion.estado === "EN_ESPERA"),
        servicios,
        reservas,
      ),
    [activas, reservas, servicios],
  );
  const cargarColaBackend = useCallback(async () => {
    if (apiConfig.USE_MOCK) return;
    if (!lavaderoId) {
      setErrorBackend("No se pudo identificar el lavadero para consultar la cola.");
      return;
    }

    setCargandoBackend(true);
    try {
      setColaBackend(await fetchColaPrioritaria(lavaderoId));
      setErrorBackend("");
    } catch (error) {
      setErrorBackend(
        error instanceof Error ? error.message : "No se pudo actualizar la cola priorizada.",
      );
    } finally {
      setCargandoBackend(false);
    }
  }, [lavaderoId]);

  useEffect(() => {
    if (apiConfig.USE_MOCK) return;
    const initialTimeoutId = window.setTimeout(() => void cargarColaBackend(), 0);
    const intervalId = window.setInterval(() => void cargarColaBackend(), 10_000);
    window.addEventListener("focus", cargarColaBackend);
    return () => {
      window.clearTimeout(initialTimeoutId);
      window.clearInterval(intervalId);
      window.removeEventListener("focus", cargarColaBackend);
    };
  }, [cargarColaBackend]);
  const filas = useMemo<FilaCola[]>(() => {
    if (apiConfig.USE_MOCK) {
      return [
        ...enEsperaLocal.map((atencion) => ({ tipo: "local" as const, atencion })),
        ...activas
          .filter((atencion) => atencion.estado !== "EN_ESPERA")
          .map((atencion) => ({ tipo: "local" as const, atencion })),
      ];
    }
    if (colaBackend === null) return [];

    const esperaBackend = colaBackend.map((orden) => {
      const vehiculo = vehiculos.find(
        (item) => item.patente.replace(/\s/g, "").toUpperCase() === orden.patente.replace(/\s/g, "").toUpperCase(),
      );
      const atencion = vehiculo
        ? activas.find(
            (item) =>
              item.vehiculoId === vehiculo.id && item.estado === "EN_ESPERA",
          )
        : undefined;
      return { tipo: "backend" as const, orden, atencion };
    });

    return [
      ...esperaBackend,
      ...activas
        .filter((atencion) => atencion.estado !== "EN_ESPERA")
        .map((atencion) => ({ tipo: "local" as const, atencion })),
    ];
  }, [activas, colaBackend, enEsperaLocal, vehiculos]);

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
          value={
            !apiConfig.USE_MOCK && colaBackend !== null
              ? colaBackend.length
              : activas.filter((a) => a.estado === "EN_ESPERA").length
          }
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
                {[
                  "Orden",
                  "Origen",
                  "Patente",
                  "Cliente",
                  "Servicio",
                  "Turno / ingreso",
                  "Estado",
                  "Acción",
                ].map(
                  (h) => (
                    <th key={h} className="table-head pb-3">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filas.map((fila, i) => {
                const esBackend = fila.tipo === "backend";
                const a = fila.atencion;
                const orden = esBackend ? fila.orden : null;
                const v = a
                  ? vehiculos.find((vehiculo) => vehiculo.id === a.vehiculoId)
                  : null;
                const c = a
                  ? clientes.find((cliente) => cliente.id === a.clienteId)
                  : null;
                const reservaConfirmada = a
                  ? obtenerReservaConfirmada(a, reservas)
                  : null;
                const origen =
                  orden?.tipoIngreso ??
                  (reservaConfirmada ? "RESERVA" : "ESPONTANEO");
                const horarioReserva =
                  orden?.horarioReserva ??
                  (reservaConfirmada
                    ? new Date(fechaHoraReserva(reservaConfirmada)).toISOString()
                    : null);
                const ingreso = orden?.ingreso ?? a?.fechaIngreso;
                const rowId = orden ? String(orden.ordenId) : a?.id ?? `fila-${i}`;
                const estado = a?.estado ?? "EN_ESPERA";
                const puestoAsignado = a ? tienePuestoAsignado(a, boxes) : false;
                return (
                  <tr key={rowId} className="border-b border-slate-50">
                    <td className="py-3 font-semibold text-slate-400">{i + 1}</td>
                    <td>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          origen === "RESERVA"
                            ? "bg-violet-100 text-violet-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {origen === "RESERVA" ? (
                          <CalendarClock className="h-3.5 w-3.5" />
                        ) : (
                          <Car className="h-3.5 w-3.5" />
                        )}
                        {origen === "RESERVA" ? "Reserva" : "Espontáneo"}
                      </span>
                    </td>
                    <td>
                      <Plate value={orden?.patente ?? v?.patente ?? "—"} />
                    </td>
                    <td>
                      {orden?.clienteNombre ??
                        (`${c?.nombre ?? ""} ${c?.apellido ?? ""}`.trim() || "—")}
                    </td>
                    <td className="text-slate-500">
                      {orden?.servicioNombre ?? (a ? serviciosDe(a.servicioIds) : "—")}
                    </td>
                    <td>
                      {horarioReserva ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-violet-700">
                          <CalendarClock className="h-3.5 w-3.5" />
                          {time(horarioReserva)}
                        </span>
                      ) : ingreso ? (
                        <span className="text-slate-500">Ingresó {time(ingreso)}</span>
                      ) : "—"}
                    </td>
                    <td>
                      <StageBadge estado={estado} />
                    </td>
                    <td className="space-x-2">
                      {a?.estado === "EN_ESPERA" && (
                        <>
                          {!puestoAsignado && libres[0] && (
                            <button
                              className="text-xs font-semibold text-[#6C5CE7]"
                              onClick={() => asignarBox(a.id, libres[0].id)}
                            >
                              Asignar puesto
                            </button>
                          )}
                          <button
                            className="text-xs font-semibold text-[#6C5CE7] disabled:cursor-not-allowed disabled:text-slate-400"
                            disabled={!puestoAsignado}
                            title={
                              puestoAsignado
                                ? "Iniciar el lavado del vehículo asignado"
                                : "Asigná un puesto al vehículo antes de iniciar el lavado"
                            }
                            onClick={() => iniciarLavado(a.id)}
                          >
                            Iniciar lavado
                          </button>
                        </>
                      )}
                      {a && a.estado !== "EN_ESPERA" && a.estado !== "LISTO" && (
                        <button
                          className="text-xs font-semibold text-[#6C5CE7]"
                          onClick={() => avanzar(a.id)}
                        >
                          Siguiente etapa
                        </button>
                      )}
                      {a?.estado === "LISTO" && (
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

        <Card
          title="Próximos servicios"
          action={
            cargandoBackend ? (
              <span className="text-xs text-slate-400">Actualizando...</span>
            ) : null
          }
        >
          {errorBackend && (
            <p role="alert" className="mb-3 flex items-center gap-2 text-xs text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {errorBackend}
            </p>
          )}
          <ul className="space-y-3">
            {filas
              .filter((fila) => fila.tipo === "backend" || fila.atencion.estado === "EN_ESPERA")
              .map((fila) => {
                const orden = fila.tipo === "backend" ? fila.orden : null;
                const a = fila.atencion;
                const v = a ? vehiculos.find((vehiculo) => vehiculo.id === a.vehiculoId) : null;
                const reservaConfirmada = a
                  ? obtenerReservaConfirmada(a, reservas)
                  : null;
                const origen =
                  orden?.tipoIngreso ?? (reservaConfirmada ? "RESERVA" : "ESPONTANEO");
                const horario =
                  orden?.horarioReserva ??
                  (reservaConfirmada
                    ? new Date(fechaHoraReserva(reservaConfirmada)).toISOString()
                    : a?.horaEstimadaInicio);
                return (
                  <li
                    key={orden ? `orden-${orden.ordenId}` : a?.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {orden?.modelo ?? `${v?.marca ?? ""} ${v?.modelo ?? ""}`.trim()}
                      </p>
                      <p className="text-xs text-slate-500">
                        {orden?.patente ?? v?.patente} · {origen === "RESERVA" ? "Reserva confirmada" : "Sin turno"}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[#6C5CE7]">
                      {horario ? time(horario) : "En espera"}
                    </span>
                  </li>
                );
              })}
            {filas.length === 0 && (
              <li className="rounded-xl bg-slate-50 px-3 py-4 text-sm text-slate-500">
                No hay vehículos esperando.
              </li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
