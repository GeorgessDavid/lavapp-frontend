"use client";

import { FormEvent, useMemo, useState } from "react";
import { Car, Clock, Droplets, Sparkles } from "lucide-react";
import { Card, KpiCard } from "@/components/ui/Card";
import { Plate, StageBadge } from "@/components/ui/badges";
import { useApp } from "@/lib/store";
import { useLookups } from "@/lib/lookups";
import { time } from "@/lib/format";
import { LlegadaConReserva } from "@/components/LlegadaConReserva";

export default function IngresosPage() {
  const { atenciones, vehiculos, clientes, servicios, boxes, checkIn, user } = useApp();
  const lavaderoId = user?.lavaderoId ?? Number(process.env.NEXT_PUBLIC_LAVADERO_ID ?? "1");
  const { cliente, vehiculo, serviciosDe } = useLookups();
  const [patente, setPatente] = useState("");
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState("");
  const [vehiculoSeleccionadoId, setVehiculoSeleccionadoId] = useState("");
  const found = useMemo(() => {
    const v = vehiculos.find(
      (x) =>
        x.patente.replace(/\s/g, "").toUpperCase() ===
        patente.replace(/\s/g, "").toUpperCase(),
    );
    if (!v) return null;
    return { v, c: clientes.find((c) => c.id === v.clienteId) };
  }, [patente, vehiculos, clientes]);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [servicioId, setServicioId] = useState(servicios[1]?.id ?? "s2");
  const [obs, setObs] = useState("");

  function onClienteSeleccionado(clienteId: string) {
    setClienteSeleccionadoId(clienteId);
    const seleccionado = clientes.find((item) => item.id === clienteId);

    if (vehiculoSeleccionadoId) {
      const vehiculoActual = vehiculos.find(
        (item) => item.id === vehiculoSeleccionadoId,
      );
      if (vehiculoActual?.clienteId !== clienteId) {
        setVehiculoSeleccionadoId("");
        setPatente("");
        setMarca("");
        setModelo("");
      }
    }

    setNombre(
      seleccionado
        ? `${seleccionado.nombre} ${seleccionado.apellido}`.trim()
        : "",
    );
    setTelefono(seleccionado?.telefono ?? "");
  }

  function onVehiculoSeleccionado(vehiculoId: string) {
    setVehiculoSeleccionadoId(vehiculoId);
    const seleccionado = vehiculos.find((item) => item.id === vehiculoId);
    if (!seleccionado) {
      setPatente("");
      setMarca("");
      setModelo("");
      return;
    }

    const propietario = clientes.find(
      (item) => item.id === seleccionado.clienteId,
    );
    setClienteSeleccionadoId(propietario?.id ?? "");
    setNombre(
      propietario
        ? `${propietario.nombre} ${propietario.apellido}`.trim()
        : "",
    );
    setTelefono(propietario?.telefono ?? "");
    setPatente(seleccionado.patente);
    setMarca(seleccionado.marca);
    setModelo(seleccionado.modelo);
  }

  function onPatente(value: string) {
    setPatente(value);
    const v = vehiculos.find(
      (x) =>
        x.patente.replace(/\s/g, "").toUpperCase() ===
        value.replace(/\s/g, "").toUpperCase(),
    );
    if (v) {
      const c = clientes.find((cli) => cli.id === v.clienteId);
      setVehiculoSeleccionadoId(v.id);
      setClienteSeleccionadoId(c?.id ?? "");
      setNombre(`${c?.nombre ?? ""} ${c?.apellido ?? ""}`.trim());
      setTelefono(c?.telefono ?? "");
      setMarca(v.marca);
      setModelo(v.modelo);
    } else if (vehiculoSeleccionadoId) {
      setVehiculoSeleccionadoId("");
      setClienteSeleccionadoId("");
      setNombre("");
      setTelefono("");
      setMarca("");
      setModelo("");
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    checkIn({
      patente,
      clienteNombre: nombre,
      telefono,
      marca,
      modelo,
      servicioId,
      observaciones: obs,
    });
    setPatente("");
    setClienteSeleccionadoId("");
    setVehiculoSeleccionadoId("");
    setNombre("");
    setTelefono("");
    setMarca("");
    setModelo("");
    setObs("");
  }

  const ocupacion = Math.round(
    (boxes.filter((b) => b.estado === "OCUPADO").length / boxes.length) * 100,
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Ingresos</h1>
        <p className="text-sm text-slate-500">
          Buscá la reserva del cliente y confirmá su llegada, o registrá un ingreso
          sin reserva por patente.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Ingresos del día"
          value={atenciones.length}
          tone="purple"
          icon={<Car className="h-5 w-5" />}
        />
        <KpiCard
          label="En espera"
          value={atenciones.filter((a) => a.estado === "EN_ESPERA").length}
          tone="orange"
          icon={<Clock className="h-5 w-5" />}
        />
        <KpiCard
          label="En proceso"
          value={
            atenciones.filter((a) =>
              ["LAVADO", "INTERIOR", "TERMINACIONES"].includes(a.estado),
            ).length
          }
          tone="teal"
          icon={<Droplets className="h-5 w-5" />}
        />
        <KpiCard
          label="Capacidad"
          value={`${boxes.filter((b) => b.estado === "OCUPADO").length}/${boxes.length}`}
          tone="green"
          icon={<Sparkles className="h-5 w-5" />}
        />
      </div>

      <LlegadaConReserva key={lavaderoId} lavaderoId={lavaderoId} />

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card title="Ingreso sin reserva">
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-4 rounded-2xl bg-slate-50 p-4 sm:col-span-2 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="cliente-registrado"
                  className="mb-1 block text-xs font-semibold text-slate-500"
                >
                  Cliente registrado (opcional)
                </label>
                <select
                  id="cliente-registrado"
                  className="field bg-white"
                  value={clienteSeleccionadoId}
                  onChange={(e) => onClienteSeleccionado(e.target.value)}
                >
                  <option value="">Cargar cliente nuevo</option>
                  {clientes
                    .filter((item) => !item.inactivo)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre} {item.apellido} · {item.telefono}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="vehiculo-registrado"
                  className="mb-1 block text-xs font-semibold text-slate-500"
                >
                  Vehículo registrado (opcional)
                </label>
                <select
                  id="vehiculo-registrado"
                  className="field bg-white"
                  value={vehiculoSeleccionadoId}
                  onChange={(e) => onVehiculoSeleccionado(e.target.value)}
                >
                  <option value="">Cargar vehículo nuevo</option>
                  {vehiculos.map((item) => {
                    const propietario = clientes.find(
                      (clienteActual) => clienteActual.id === item.clienteId,
                    );
                    return (
                      <option key={item.id} value={item.id}>
                        {item.patente} · {item.marca} {item.modelo}
                        {propietario
                          ? ` · ${propietario.nombre} ${propietario.apellido}`
                          : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
              <p className="text-xs text-slate-500 sm:col-span-2">
                Al elegir un registro se completan sus datos. También podés
                ingresar la patente para recuperar un vehículo existente.
              </p>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="patente-ingreso" className="mb-1 block text-xs font-semibold text-slate-500">
                Patente
              </label>
              <input
                id="patente-ingreso"
                className="field"
                placeholder="AB 123 CD"
                value={patente}
                onChange={(e) => onPatente(e.target.value)}
                required
              />
              {found && (
                <p className="mt-1 text-xs text-emerald-600">
                  Cliente frecuente encontrado. Se recuperó historial y datos del
                  vehículo.
                </p>
              )}
            </div>
            <div>
              <label htmlFor="cliente-ingreso" className="mb-1 block text-xs font-semibold text-slate-500">
                Cliente
              </label>
              <input
                id="cliente-ingreso"
                className="field"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  setClienteSeleccionadoId("");
                }}
                required
              />
            </div>
            <div>
              <label htmlFor="telefono-ingreso" className="mb-1 block text-xs font-semibold text-slate-500">
                Teléfono / WhatsApp
              </label>
              <input
                id="telefono-ingreso"
                className="field"
                value={telefono}
                onChange={(e) => {
                  setTelefono(e.target.value);
                  setClienteSeleccionadoId("");
                }}
                required
              />
            </div>
            <div>
              <label htmlFor="marca-ingreso" className="mb-1 block text-xs font-semibold text-slate-500">
                Marca
              </label>
              <input
                id="marca-ingreso"
                className="field"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="modelo-ingreso" className="mb-1 block text-xs font-semibold text-slate-500">
                Modelo
              </label>
              <input
                id="modelo-ingreso"
                className="field"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="servicio-ingreso" className="mb-1 block text-xs font-semibold text-slate-500">
                Servicio
              </label>
              <select
                id="servicio-ingreso"
                className="field"
                value={servicioId}
                onChange={(e) => setServicioId(e.target.value)}
              >
                {servicios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre} · {s.duracionMin} min
                  </option>
                ))}
              </select>
              {servicios.find((item) => item.id === servicioId) && (
                <p className="mt-1 text-xs text-slate-500">
                  {servicios.find((item) => item.id === servicioId)?.descripcion}
                  {" · "}
                  ${servicios.find((item) => item.id === servicioId)?.precio.toLocaleString("es-AR")}
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="observaciones-ingreso" className="mb-1 block text-xs font-semibold text-slate-500">
                Observaciones / evidencia
              </label>
              <textarea
                id="observaciones-ingreso"
                className="field min-h-20"
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Daños previos, pedido especial, foto pendiente..."
              />
            </div>
            <div className="sm:col-span-2">
              <button className="btn-primary">Confirmar ingreso</button>
            </div>
          </form>
        </Card>

        <div className="space-y-5">
          <Card title="Ocupación del playón">
            <div className="flex items-center gap-4">
              <div
                className="grid h-28 w-28 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(#6C5CE7 ${ocupacion}%, #EEF2FF ${ocupacion}%)`,
                }}
              >
                <div className="grid h-20 w-20 place-items-center rounded-full bg-white text-lg font-bold">
                  {ocupacion}%
                </div>
              </div>
              <p className="text-sm text-slate-500">
                Los vehículos listos siguen ocupando lugar hasta el retiro. El
                aviso de WhatsApp acelera esa rotación.
              </p>
            </div>
          </Card>
          <Card title="Ingresos del día">
            <ul className="max-h-72 space-y-2 overflow-auto">
              {atenciones.map((a) => {
                const v = vehiculo(a.vehiculoId);
                const c = cliente(a.clienteId);
                return (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2"
                  >
                    <div>
                      <Plate value={v?.patente ?? "—"} />
                      <p className="mt-1 text-xs text-slate-500">
                        {c?.nombre} · {serviciosDe(a.servicioIds)} ·{" "}
                        {time(a.fechaIngreso)}
                      </p>
                    </div>
                    <StageBadge estado={a.estado} />
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
