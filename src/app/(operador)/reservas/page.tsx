"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Car,
  CheckCircle2,
  Clock,
  LoaderCircle,
  Plus,
  RefreshCw,
  UserPlus,
} from "lucide-react";
import { Card, KpiCard } from "@/components/ui/Card";
import { Plate, ReservaBadge } from "@/components/ui/badges";
import {
  ApiError,
  crearClienteReserva,
  crearReservaApi,
  crearVehiculoReserva,
  listarClientesReserva,
  listarPuestosReserva,
  listarReservas,
  listarServiciosReserva,
  listarVehiculosReserva,
  type ReservaApi,
  type ReservaCliente,
  type ReservaPuesto,
  type ReservaServicio,
  type ReservaVehiculo,
} from "@/lib/api";

const LAVADERO_ID = Number(process.env.NEXT_PUBLIC_LAVADERO_ID ?? "1");
const DEFAULT_RESERVATION_DATE = new Date(Date.now() + 86_400_000);

function inputDate(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function readableDate(iso: string) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date(iso));
}

function readableTime(iso: string) {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return "No se pudo conectar con el backend. Verificá que esté iniciado.";
}

export default function ReservasPage() {
  const [clientes, setClientes] = useState<ReservaCliente[]>([]);
  const [vehiculos, setVehiculos] = useState<ReservaVehiculo[]>([]);
  const [servicios, setServicios] = useState<ReservaServicio[]>([]);
  const [puestos, setPuestos] = useState<ReservaPuesto[]>([]);
  const [reservas, setReservas] = useState<ReservaApi[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [vehiculoId, setVehiculoId] = useState("");
  const [servicioId, setServicioId] = useState("");
  const [puestoId, setPuestoId] = useState("");
  const [fecha, setFecha] = useState(inputDate(DEFAULT_RESERVATION_DATE));
  const [horario, setHorario] = useState("10:00");
  const [nuevoCliente, setNuevoCliente] = useState(false);
  const [nuevoVehiculo, setNuevoVehiculo] = useState(false);
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [patente, setPatente] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextClientes, nextServicios, nextPuestos, nextReservas] =
        await Promise.all([
          listarClientesReserva(LAVADERO_ID),
          listarServiciosReserva(LAVADERO_ID),
          listarPuestosReserva(LAVADERO_ID),
          listarReservas(LAVADERO_ID),
        ]);
      setClientes(nextClientes);
      setServicios(nextServicios);
      setPuestos(nextPuestos);
      setReservas(nextReservas);
      setClienteId((current) => current || String(nextClientes[0]?.id ?? ""));
      setServicioId((current) => current || String(nextServicios[0]?.id ?? ""));
      setPuestoId((current) => current || String(nextPuestos[0]?.id ?? ""));
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadPage(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadPage]);

  useEffect(() => {
    if (!clienteId || nuevoCliente) return;
    let active = true;
    listarVehiculosReserva(LAVADERO_ID, Number(clienteId))
      .then((items) => {
        if (!active) return;
        setVehiculos(items);
        setVehiculoId(String(items[0]?.id ?? ""));
        setNuevoVehiculo(items.length === 0);
      })
      .catch((loadError) => active && setError(errorMessage(loadError)));
    return () => {
      active = false;
    };
  }, [clienteId, nuevoCliente]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      let resolvedClienteId = Number(clienteId);
      if (nuevoCliente) {
        const created = await crearClienteReserva(LAVADERO_ID, {
          nombre: clienteNombre.trim(),
          telefono: clienteTelefono.trim(),
        });
        resolvedClienteId = created.id;
        setClientes((current) => [...current, created]);
        setClienteId(String(created.id));
        setNuevoCliente(false);
        setClienteNombre("");
        setClienteTelefono("");
      }

      let resolvedVehiculoId = Number(vehiculoId);
      if (nuevoCliente || nuevoVehiculo) {
        const created = await crearVehiculoReserva(
          LAVADERO_ID,
          resolvedClienteId,
          { patente: patente.trim(), marca: marca.trim(), modelo: modelo.trim() },
        );
        resolvedVehiculoId = created.id;
        setVehiculos((current) => [...current, created]);
        setVehiculoId(String(created.id));
        setNuevoVehiculo(false);
        setPatente("");
        setMarca("");
        setModelo("");
      }

      const fechaHorario = new Date(`${fecha}T${horario}:00`).toISOString();
      const created = await crearReservaApi(LAVADERO_ID, {
        clienteId: resolvedClienteId,
        vehiculoId: resolvedVehiculoId,
        servicioId: Number(servicioId),
        puestoId: Number(puestoId),
        fechaHorario,
      });

      setReservas((current) =>
        [created, ...current].sort(
          (a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime(),
        ),
      );
      setSuccess(`Reserva #${created.id} registrada correctamente.`);
      setClienteId(String(resolvedClienteId));
      const refreshedVehicles = await listarVehiculosReserva(
        LAVADERO_ID,
        resolvedClienteId,
      );
      setVehiculos(refreshedVehicles);
      setVehiculoId(String(resolvedVehiculoId));
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  const today = inputDate(new Date());
  const reservasHoy = useMemo(
    () => reservas.filter((reserva) => inputDate(new Date(reserva.inicio)) === today),
    [reservas, today],
  );
  const selectedService = servicios.find(
    (servicio) => servicio.id === Number(servicioId),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reservas</h1>
          <p className="text-sm text-slate-500">
            Organizá la agenda y asigná cada turno a un puesto disponible.
          </p>
        </div>
        <button className="btn-ghost" onClick={() => void loadPage()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar agenda
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> {success}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Reservas de hoy" value={reservasHoy.length} tone="purple" icon={<CalendarDays className="h-5 w-5" />} />
        <KpiCard label="Pendientes" value={reservas.filter((r) => r.estado === "PENDIENTE").length} tone="orange" icon={<Clock className="h-5 w-5" />} />
        <KpiCard label="Puestos habilitados" value={puestos.length} tone="green" icon={<Car className="h-5 w-5" />} />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[1.25fr_0.9fr]">
        <Card title="Agenda de próximas reservas">
          {loading ? (
            <div className="grid min-h-48 place-items-center text-sm text-slate-400">
              <LoaderCircle className="mb-2 h-6 w-6 animate-spin" />
              Cargando agenda…
            </div>
          ) : reservas.length === 0 ? (
            <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-slate-200 text-center">
              <div>
                <CalendarDays className="mx-auto mb-2 h-7 w-7 text-slate-300" />
                <p className="text-sm font-semibold text-navy">La agenda está vacía</p>
                <p className="text-xs text-slate-400">La primera reserva aparecerá acá.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Fecha y hora', 'Cliente', 'Vehículo', 'Servicio', 'Puesto', 'Estado'].map((heading) => (
                      <th key={heading} className="table-head pb-3">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reservas.map((reserva) => (
                    <tr key={reserva.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-3.5 font-medium text-navy">
                        <span className="block capitalize">{readableDate(reserva.inicio)}</span>
                        <span className="text-xs font-normal text-slate-400">
                          {readableTime(reserva.inicio)}–{readableTime(reserva.fin)}
                        </span>
                      </td>
                      <td>{reserva.clienteNombre}</td>
                      <td><Plate value={reserva.patente} /></td>
                      <td>{reserva.servicioNombre}</td>
                      <td>{reserva.puestoNombre}</td>
                      <td><ReservaBadge estado={reserva.estado} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Nueva reserva" className="xl:sticky xl:top-5">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-500">Cliente</label>
                <button type="button" className="text-xs font-semibold text-brand" onClick={() => {
                  setNuevoCliente((current) => !current);
                  setNuevoVehiculo(true);
                }}>
                  {nuevoCliente ? "Elegir existente" : "+ Registrar nuevo"}
                </button>
              </div>
              {nuevoCliente ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <input className="field" placeholder="Nombre y apellido" value={clienteNombre} onChange={(event) => setClienteNombre(event.target.value)} required />
                  <input className="field" type="tel" placeholder="Teléfono / WhatsApp" value={clienteTelefono} onChange={(event) => setClienteTelefono(event.target.value)} required />
                </div>
              ) : (
                <select className="field" value={clienteId} onChange={(event) => {
                  setClienteId(event.target.value);
                  setVehiculos([]);
                  setVehiculoId("");
                }} required>
                  <option value="">Seleccionar cliente</option>
                  {clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nombre} · {cliente.telefono}</option>)}
                </select>
              )}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-500">Vehículo</label>
                {!nuevoCliente && clienteId && (
                  <button type="button" className="text-xs font-semibold text-brand" onClick={() => setNuevoVehiculo((current) => !current)}>
                    {nuevoVehiculo ? "Elegir existente" : "+ Registrar nuevo"}
                  </button>
                )}
              </div>
              {nuevoCliente || nuevoVehiculo ? (
                <div className="grid gap-2 sm:grid-cols-3">
                  <input className="field uppercase" placeholder="Patente" value={patente} onChange={(event) => setPatente(event.target.value.toUpperCase())} maxLength={10} required />
                  <input className="field" placeholder="Marca" value={marca} onChange={(event) => setMarca(event.target.value)} />
                  <input className="field" placeholder="Modelo" value={modelo} onChange={(event) => setModelo(event.target.value)} />
                </div>
              ) : (
                <select className="field" value={vehiculoId} onChange={(event) => setVehiculoId(event.target.value)} required>
                  <option value="">Seleccionar vehículo</option>
                  {vehiculos.map((vehiculo) => <option key={vehiculo.id} value={vehiculo.id}>{vehiculo.patente} · {vehiculo.marca} {vehiculo.modelo}</option>)}
                </select>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500">Servicio</label>
                <select className="field" value={servicioId} onChange={(event) => setServicioId(event.target.value)} required>
                  <option value="">Seleccionar servicio</option>
                  {servicios.map((servicio) => <option key={servicio.id} value={servicio.id}>{servicio.nombre} · {servicio.duracionMin} min</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500">Puesto</label>
                <select className="field" value={puestoId} onChange={(event) => setPuestoId(event.target.value)} required>
                  <option value="">Seleccionar puesto</option>
                  {puestos.map((puesto) => <option key={puesto.id} value={puesto.id}>{puesto.nombre}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500">Fecha</label>
                <input type="date" className="field" min={inputDate(new Date())} value={fecha} onChange={(event) => setFecha(event.target.value)} required />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500">Horario</label>
                <input type="time" className="field" value={horario} onChange={(event) => setHorario(event.target.value)} required />
              </div>
            </div>

            {selectedService && (
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Duración estimada: <strong className="text-navy">{selectedService.duracionMin} minutos</strong>. La disponibilidad se validará al guardar.
              </p>
            )}

            <button className="btn-primary w-full" disabled={saving || loading}>
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : nuevoCliente ? <UserPlus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {saving ? "Guardando…" : "Registrar reserva"}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
