"use client";

import { FormEvent, useState } from "react";
import { CalendarDays, Clock, Users } from "lucide-react";
import { Card, KpiCard } from "@/components/ui/Card";
import { Plate, ReservaBadge } from "@/components/ui/badges";
import { useApp } from "@/lib/store";
import { useLookups } from "@/lib/lookups";

export default function ReservasPage() {
  const { reservas, clientes, vehiculos, servicios, crearReserva } = useApp();
  const { cliente, vehiculo, servicio } = useLookups();
  const [clienteId, setClienteId] = useState(clientes[0]?.id ?? "");
  const vehOfClient = vehiculos.filter((v) => v.clienteId === clienteId);
  const [vehiculoId, setVehiculoId] = useState(vehOfClient[0]?.id ?? "");
  const [servicioId, setServicioId] = useState(servicios[0]?.id ?? "");
  const [fecha, setFecha] = useState("2026-05-21");
  const [horario, setHorario] = useState("10:00");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    crearReserva({ clienteId, vehiculoId, servicioId, fecha, horario });
  }

  const hoy = reservas.filter((r) => r.fecha === "2026-05-20");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Reservas</h1>
        <p className="text-sm text-slate-500">
          Conviven con los ingresos espontáneos dentro de la misma cola.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Reservas de hoy"
          value={hoy.length}
          tone="purple"
          icon={<CalendarDays className="h-5 w-5" />}
        />
        <KpiCard
          label="Confirmadas"
          value={reservas.filter((r) => r.estado === "CONFIRMADA").length}
          tone="green"
          icon={<Users className="h-5 w-5" />}
        />
        <KpiCard
          label="Lista de espera"
          value={reservas.filter((r) => r.estado === "LISTA_ESPERA").length}
          tone="orange"
          icon={<Clock className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.9fr]">
        <Card title="Agenda">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["Horario", "Cliente", "Vehículo", "Servicio", "Estado"].map((h) => (
                  <th key={h} className="table-head pb-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...reservas]
                .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horario.localeCompare(b.horario))
                .map((r) => {
                  const c = cliente(r.clienteId);
                  const v = vehiculo(r.vehiculoId);
                  return (
                    <tr key={r.id} className="border-b border-slate-50">
                      <td className="py-3">
                        {r.fecha} · {r.horario}
                      </td>
                      <td>
                        {c?.nombre} {c?.apellido}
                      </td>
                      <td>
                        <Plate value={v?.patente ?? "—"} />
                      </td>
                      <td>{servicio(r.servicioId)?.nombre}</td>
                      <td>
                        <ReservaBadge estado={r.estado} />
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </Card>

        <Card title="Nueva reserva">
          <form onSubmit={onSubmit} className="space-y-3">
            <select
              className="field"
              value={clienteId}
              onChange={(e) => {
                setClienteId(e.target.value);
                const first = vehiculos.find((v) => v.clienteId === e.target.value);
                if (first) setVehiculoId(first.id);
              }}
            >
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.apellido}
                </option>
              ))}
            </select>
            <select
              className="field"
              value={vehiculoId}
              onChange={(e) => setVehiculoId(e.target.value)}
            >
              {vehiculos
                .filter((v) => v.clienteId === clienteId)
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.patente} · {v.marca} {v.modelo}
                  </option>
                ))}
            </select>
            <select
              className="field"
              value={servicioId}
              onChange={(e) => setServicioId(e.target.value)}
            >
              {servicios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                className="field"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
              <input
                type="time"
                className="field"
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
              />
            </div>
            <button className="btn-primary w-full">Confirmar reserva</button>
          </form>
        </Card>
      </div>
    </div>
  );
}
