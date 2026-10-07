"use client";

import { FormEvent, useMemo, useState } from "react";
import { Car, Clock, Droplets, Sparkles } from "lucide-react";
import { Card, KpiCard } from "@/components/ui/Card";
import { Plate, StageBadge } from "@/components/ui/badges";
import { useApp } from "@/lib/store";
import { useLookups } from "@/lib/lookups";
import { money, time } from "@/lib/format";
import { LlegadaConReserva } from "@/components/LlegadaConReserva";

export default function IngresosPage() {
  const { atenciones, vehiculos, clientes, servicios, boxes, checkIn, user } = useApp();
  const lavaderoId = user?.lavaderoId ?? Number(process.env.NEXT_PUBLIC_LAVADERO_ID ?? "1");
  const { cliente, vehiculo, serviciosDe } = useLookups();
  const [patente, setPatente] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const found = useMemo(() => {
    const v = vehiculos.find(
      (x) =>
        x.patente.replace(/\s/g, "").toUpperCase() ===
        patente.replace(/\s/g, "").toUpperCase(),
    );
    if (!v) return null;
    return { v, c: clientes.find((c) => c.id === v.clienteId) };
  }, [patente, vehiculos, clientes]);
  const clientesFiltrados = useMemo(() => {
    const query = busquedaCliente.trim().toLocaleLowerCase();
    if (!query) return [];
    return clientes
      .filter((c) =>
        `${c.nombre} ${c.apellido} ${c.telefono}`
          .toLocaleLowerCase()
          .includes(query),
      )
      .slice(0, 6);
  }, [busquedaCliente, clientes]);
  const clienteSeleccionado = clientes.find((c) => c.id === clienteId);

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [servicioId, setServicioId] = useState("");
  const [obs, setObs] = useState("");
  const servicioSeleccionado = servicios.find((servicio) => servicio.id === servicioId);

  function onPatente(value: string) {
    setPatente(value);
    const v = vehiculos.find(
      (x) =>
        x.patente.replace(/\s/g, "").toUpperCase() ===
        value.replace(/\s/g, "").toUpperCase(),
    );
    if (v) {
      const c = clientes.find((cli) => cli.id === v.clienteId);
      setClienteId(c?.id ?? "");
      setBusquedaCliente(c ? `${c.nombre} ${c.apellido}` : "");
      setNombre(`${c?.nombre ?? ""} ${c?.apellido ?? ""}`.trim());
      setTelefono(c?.telefono ?? "");
      setMarca(v.marca);
      setModelo(v.modelo);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    checkIn({
      patente,
      clienteId: clienteSeleccionado?.id,
      clienteNombre: nombre,
      telefono,
      marca,
      modelo,
      servicioId,
      observaciones: obs,
    });
    setPatente("");
    setClienteId("");
    setBusquedaCliente("");
    setNombre("");
    setTelefono("");
    setMarca("");
    setModelo("");
    setServicioId("");
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
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Patente
              </label>
              <input
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
            <div className="sm:col-span-2">
              <label
                htmlFor="buscar-cliente"
                className="mb-1 block text-xs font-semibold text-slate-500"
              >
                Buscar cliente existente
              </label>
              <input
                id="buscar-cliente"
                className="field"
                type="search"
                placeholder="Nombre, apellido o teléfono"
                value={busquedaCliente}
                onChange={(e) => {
                  setBusquedaCliente(e.target.value);
                  if (clienteId) {
                    setClienteId("");
                    setNombre("");
                    setTelefono("");
                  }
                }}
              />
              {clienteSeleccionado ? (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-violet-50 px-3 py-2 text-sm">
                  <span>
                    Cliente seleccionado:{" "}
                    <strong>
                      {clienteSeleccionado.nombre} {clienteSeleccionado.apellido}
                    </strong>{" "}
                    · {clienteSeleccionado.telefono}
                  </span>
                  <button
                    type="button"
                    className="text-xs font-semibold text-brand"
                    onClick={() => {
                      setClienteId("");
                      setBusquedaCliente("");
                      setNombre("");
                      setTelefono("");
                    }}
                  >
                    Cambiar cliente
                  </button>
                </div>
              ) : (
                <>
                  {busquedaCliente.trim() && (
                    <ul
                      aria-label="Clientes encontrados"
                      className="mt-2 max-h-40 space-y-1 overflow-auto rounded-xl border border-slate-200 p-1"
                    >
                      {clientesFiltrados.length ? (
                        clientesFiltrados.map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
                              onClick={() => {
                                setClienteId(c.id);
                                setNombre(`${c.nombre} ${c.apellido}`);
                                setTelefono(c.telefono);
                                setBusquedaCliente(`${c.nombre} ${c.apellido}`);
                              }}
                            >
                              <span className="font-semibold">
                                {c.nombre} {c.apellido}
                              </span>
                              <span className="ml-2 text-slate-500">
                                {c.telefono}
                              </span>
                            </button>
                          </li>
                        ))
                      ) : (
                        <li className="px-3 py-2 text-sm text-slate-500">
                          No encontramos clientes con esos datos. Podés
                          registrarlo como nuevo.
                        </li>
                      )}
                    </ul>
                  )}
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="nombre-cliente"
                        className="mb-1 block text-xs font-semibold text-slate-500"
                      >
                        Nombre y apellido del nuevo cliente
                      </label>
                      <input
                        id="nombre-cliente"
                        className="field"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="telefono-cliente"
                        className="mb-1 block text-xs font-semibold text-slate-500"
                      >
                        Teléfono / WhatsApp
                      </label>
                      <input
                        id="telefono-cliente"
                        className="field"
                        type="tel"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Marca
              </label>
              <input
                className="field"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Modelo
              </label>
              <input
                className="field"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Servicio
              </label>
              <select
                className="field"
                value={servicioId}
                onChange={(e) => setServicioId(e.target.value)}
                required
              >
                <option value="">Seleccionar servicio</option>
                {servicios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre} · {s.duracionMin} min · {money(s.precio)}
                  </option>
                ))}
              </select>
              {servicioSeleccionado && (
                <div
                  aria-live="polite"
                  className="mt-2 rounded-xl bg-violet-50 px-3 py-2 text-sm"
                >
                  <p className="font-semibold text-navy">
                    {money(servicioSeleccionado.precio)} ·{" "}
                    {servicioSeleccionado.duracionMin} min estimados
                  </p>
                  <p className="mt-1 text-slate-600">
                    {servicioSeleccionado.descripcion}
                  </p>
                </div>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Observaciones / evidencia
              </label>
              <textarea
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
