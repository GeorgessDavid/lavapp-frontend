"use client";

import { FormEvent, useMemo, useState } from "react";
import { Car, Clock, Droplets, Sparkles } from "lucide-react";
import { Card, KpiCard } from "@/components/ui/Card";
import { Plate, StageBadge } from "@/components/ui/badges";
import { useApp } from "@/lib/store";
import { useLookups } from "@/lib/lookups";
import { money, time } from "@/lib/format";
import { LlegadaConReserva } from "@/components/LlegadaConReserva";

type CampoIngreso =
  | "vehiculo"
  | "patente"
  | "cliente"
  | "nombre"
  | "telefono"
  | "marca"
  | "modelo"
  | "servicioId";

type ErroresIngreso = Partial<Record<CampoIngreso, string>>;

export default function IngresosPage() {
  const { atenciones, vehiculos, clientes, servicios, boxes, checkIn, user } = useApp();
  const lavaderoId = user?.lavaderoId ?? Number(process.env.NEXT_PUBLIC_LAVADERO_ID ?? "1");
  const { cliente, vehiculo, serviciosDe } = useLookups();
  const [modoVehiculo, setModoVehiculo] = useState<"existente" | "nuevo">("existente");
  const [busquedaVehiculo, setBusquedaVehiculo] = useState("");
  const [vehiculoId, setVehiculoId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [nuevoCliente, setNuevoCliente] = useState(false);
  const [patente, setPatente] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [servicioId, setServicioId] = useState("");
  const [obs, setObs] = useState("");
  const [errores, setErrores] = useState<ErroresIngreso>({});
  const [errorEnvio, setErrorEnvio] = useState("");
  const [exito, setExito] = useState("");

  function limpiarMensajeCampo(campo: CampoIngreso) {
    setErrores((actuales) => {
      if (!(campo in actuales)) return actuales;
      const siguientes = { ...actuales };
      delete siguientes[campo];
      return siguientes;
    });
    setErrorEnvio("");
    setExito("");
  }

  const servicioSeleccionado = servicios.find((servicio) => servicio.id === servicioId);

  const vehiculoSeleccionado = vehiculos.find((v) => v.id === vehiculoId);
  const clienteDelVehiculo = vehiculoSeleccionado
    ? clientes.find((c) => c.id === vehiculoSeleccionado.clienteId)
    : undefined;
  const vehiculosFiltrados = useMemo(() => {
    const query = busquedaVehiculo.trim().toLocaleLowerCase();
    return vehiculos
      .filter((v) => {
        const owner = clientes.find((c) => c.id === v.clienteId);
        const details =
          `${v.patente} ${v.marca} ${v.modelo} ${owner?.nombre ?? ""} ${owner?.apellido ?? ""} ${owner?.telefono ?? ""}`;
        return !query || details.toLocaleLowerCase().includes(query);
      })
      .slice(0, 8);
  }, [busquedaVehiculo, clientes, vehiculos]);
  const vehiculoConPatente = modoVehiculo === "nuevo"
    ? vehiculos.find(
        (v) =>
          v.patente.replace(/\s/g, "").toUpperCase() ===
          patente.replace(/\s/g, "").toUpperCase(),
      )
    : undefined;

  function limpiarFormulario() {
    setModoVehiculo("existente");
    setBusquedaVehiculo("");
    setVehiculoId("");
    setClienteId("");
    setNuevoCliente(false);
    setPatente("");
    setNombre("");
    setTelefono("");
    setMarca("");
    setModelo("");
    setServicioId("");
    setObs("");
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrores({});
    setErrorEnvio("");
    setExito("");

    const patenteFinal = (vehiculoSeleccionado?.patente ?? patente).trim().toUpperCase();
    const patenteCompacta = patenteFinal.replace(/\s/g, "");
    const clienteActual = vehiculoSeleccionado
      ? clienteDelVehiculo
      : clientes.find((c) => c.id === clienteId);
    const nombreFinal = nuevoCliente
      ? nombre.trim()
      : clienteActual
        ? `${clienteActual.nombre} ${clienteActual.apellido}`.trim()
        : "";
    const telefonoFinal = nuevoCliente ? telefono.trim() : clienteActual?.telefono ?? "";
    const marcaFinal = vehiculoSeleccionado?.marca ?? marca.trim();
    const modeloFinal = vehiculoSeleccionado?.modelo ?? modelo.trim();
    const nuevosErrores: ErroresIngreso = {};
    const hayVehiculo = modoVehiculo === "nuevo" || Boolean(vehiculoSeleccionado);
    const hayCliente = nuevoCliente || Boolean(clienteActual);

    if (modoVehiculo === "existente" && !vehiculoSeleccionado) {
      nuevosErrores.vehiculo = "Buscá y seleccioná un vehículo registrado.";
    }
    if (hayVehiculo) {
      if (!patenteFinal) {
        nuevosErrores.patente = "Ingresá la patente del vehículo.";
      } else if (!/^(?:[A-Z]{2}\d{3}[A-Z]{2}|[A-Z]{3}\d{3})$/.test(patenteCompacta)) {
        nuevosErrores.patente = "Ingresá una patente válida (por ejemplo, AB 123 CD o ABC 123).";
      }
    }
    if (modoVehiculo === "nuevo" && !clienteActual && !nuevoCliente) {
      nuevosErrores.cliente = "Seleccioná el cliente propietario.";
    }
    if (hayCliente && !nombreFinal) {
      nuevosErrores.nombre = "Ingresá el nombre del cliente.";
    }
    const digitosTelefono = telefonoFinal.replace(/\D/g, "");
    if (hayCliente && !telefonoFinal) {
      nuevosErrores.telefono = "Ingresá el teléfono de contacto.";
    } else if (hayCliente && (
      !/^\+?[\d\s().-]+$/.test(telefonoFinal) ||
      digitosTelefono.length < 8 ||
      digitosTelefono.length > 15
    )) {
      nuevosErrores.telefono = "Ingresá un teléfono válido con entre 8 y 15 dígitos.";
    }
    if (hayVehiculo) {
      if (!marcaFinal) {
        nuevosErrores.marca = "Ingresá la marca del vehículo.";
      }
      if (!modeloFinal) {
        nuevosErrores.modelo = "Ingresá el modelo del vehículo.";
      }
    }
    if (!servicioId || !servicios.some((servicio) => servicio.id === servicioId)) {
      nuevosErrores.servicioId = "Seleccioná un servicio válido.";
    }

    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;
    if (modoVehiculo === "nuevo" && vehiculoConPatente) {
      setErrorEnvio("Esta patente ya está registrada. Buscá y seleccioná el vehículo existente.");
      return;
    }

    try {
      checkIn({
        patente: patenteFinal,
        vehiculoId: vehiculoSeleccionado?.id,
        clienteId: vehiculoSeleccionado?.clienteId ?? (nuevoCliente ? undefined : clienteId),
        clienteNombre: nombreFinal,
        telefono: telefonoFinal,
        marca: marcaFinal,
        modelo: modeloFinal,
        servicioId,
        observaciones: obs,
      });
      limpiarFormulario();
      setExito(`Ingreso registrado correctamente para ${patenteFinal}.`);
    } catch (error) {
      setErrorEnvio(
        error instanceof Error
          ? error.message
          : "No se pudo registrar el ingreso. Revisá los datos e intentá nuevamente.",
      );
    }
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
          <form noValidate onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
            {errorEnvio && (
              <p
                role="alert"
                className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {errorEnvio}
              </p>
            )}
            {exito && (
              <p
                role="status"
                className="sm:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
              >
                {exito}
              </p>
            )}
            <div className="sm:col-span-2">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-500">Vehículo</label>
                <button
                  type="button"
                  className="text-xs font-semibold text-brand"
                  onClick={() => {
                    setModoVehiculo((modo) =>
                      modo === "existente" ? "nuevo" : "existente",
                    );
                    setVehiculoId("");
                    setBusquedaVehiculo("");
                    setPatente("");
                    setMarca("");
                    setModelo("");
                    setClienteId("");
                    setNuevoCliente(false);
                    setErrores({});
                    setErrorEnvio("");
                    setExito("");
                  }}
                >
                  {modoVehiculo === "existente" ? "+ Registrar nuevo" : "Buscar existente"}
                </button>
              </div>
              {modoVehiculo === "existente" ? (
                vehiculoSeleccionado ? (
                  <div className="rounded-xl bg-violet-50 px-3 py-3 text-sm">
                    <p className="font-semibold">
                      {vehiculoSeleccionado.patente} · {vehiculoSeleccionado.marca}{" "}
                      {vehiculoSeleccionado.modelo}
                    </p>
                    <p className="mt-1 text-slate-600">
                      Cliente: {clienteDelVehiculo
                        ? `${clienteDelVehiculo.nombre} ${clienteDelVehiculo.apellido} · ${clienteDelVehiculo.telefono}`
                        : "No disponible"}
                    </p>
                    <button
                      type="button"
                      className="mt-2 text-xs font-semibold text-brand"
                      onClick={() => {
                        setVehiculoId("");
                        setBusquedaVehiculo("");
                        limpiarMensajeCampo("vehiculo");
                      }}
                    >
                      Cambiar vehículo
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      className="field"
                      type="search"
                      aria-label="Buscar vehículo existente"
                      placeholder="Patente, marca, modelo o cliente"
                      value={busquedaVehiculo}
                      onChange={(e) => setBusquedaVehiculo(e.target.value)}
                    />
                    <ul
                      aria-label="Vehículos encontrados"
                      className="mt-2 max-h-48 space-y-1 overflow-auto rounded-xl border border-slate-200 p-1"
                    >
                      {vehiculosFiltrados.length ? (
                        vehiculosFiltrados.map((v) => {
                          const propietario = clientes.find((c) => c.id === v.clienteId);
                          return (
                            <li key={v.id}>
                              <button
                                type="button"
                                className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
                                onClick={() => {
                                  setVehiculoId(v.id);
                                  limpiarMensajeCampo("vehiculo");
                                }}
                              >
                                <span className="font-semibold">
                                  {v.patente} · {v.marca} {v.modelo}
                                </span>
                                <span className="block text-xs text-slate-500">
                                  {propietario
                                    ? `${propietario.nombre} ${propietario.apellido} · ${propietario.telefono}`
                                    : "Cliente no disponible"}
                                </span>
                              </button>
                            </li>
                          );
                        })
                      ) : (
                        <li className="px-3 py-2 text-sm text-slate-500">
                          No encontramos vehículos. Podés registrar uno nuevo.
                        </li>
                      )}
                    </ul>
                  </>
                )
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label htmlFor="patente-ingreso" className="mb-1 block text-xs font-semibold text-slate-500">
                      Patente
                    </label>
                    <input
                      id="patente-ingreso"
                      className="field uppercase"
                      placeholder="AB 123 CD"
                      value={patente}
                      onChange={(e) => {
                        setPatente(e.target.value);
                        limpiarMensajeCampo("patente");
                      }}
                      aria-invalid={Boolean(errores.patente)}
                      aria-describedby={errores.patente ? "patente-error" : undefined}
                      required
                    />
                    {errores.patente && <p id="patente-error" className="mt-1 text-xs text-red-700">{errores.patente}</p>}
                  </div>
                  <div>
                    <label htmlFor="marca-ingreso" className="mb-1 block text-xs font-semibold text-slate-500">
                      Marca
                    </label>
                    <input
                      id="marca-ingreso"
                      className="field"
                      value={marca}
                      onChange={(e) => {
                        setMarca(e.target.value);
                        limpiarMensajeCampo("marca");
                      }}
                      aria-invalid={Boolean(errores.marca)}
                      aria-describedby={errores.marca ? "marca-error" : undefined}
                      required
                    />
                    {errores.marca && <p id="marca-error" className="mt-1 text-xs text-red-700">{errores.marca}</p>}
                  </div>
                  <div>
                    <label htmlFor="modelo-ingreso" className="mb-1 block text-xs font-semibold text-slate-500">
                      Modelo
                    </label>
                    <input
                      id="modelo-ingreso"
                      className="field"
                      value={modelo}
                      onChange={(e) => {
                        setModelo(e.target.value);
                        limpiarMensajeCampo("modelo");
                      }}
                      aria-invalid={Boolean(errores.modelo)}
                      aria-describedby={errores.modelo ? "modelo-error" : undefined}
                      required
                    />
                    {errores.modelo && <p id="modelo-error" className="mt-1 text-xs text-red-700">{errores.modelo}</p>}
                  </div>
                </div>
              )}
            </div>
            {modoVehiculo === "nuevo" && (
              <div className="sm:col-span-2">
                {nuevoCliente ? (
                  <>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <label className="text-xs font-semibold text-slate-500">
                        Nuevo cliente propietario
                      </label>
                      <button
                        type="button"
                        className="text-xs font-semibold text-brand"
                        onClick={() => {
                          setNuevoCliente(false);
                          setNombre("");
                          setTelefono("");
                          limpiarMensajeCampo("nombre");
                          limpiarMensajeCampo("telefono");
                        }}
                      >
                        Elegir existente
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        className="field"
                        aria-label="Nombre y apellido del cliente"
                        placeholder="Nombre y apellido"
                        value={nombre}
                        onChange={(e) => {
                          setNombre(e.target.value);
                          limpiarMensajeCampo("nombre");
                        }}
                        aria-invalid={Boolean(errores.nombre)}
                        aria-describedby={errores.nombre ? "nombre-error" : undefined}
                        required
                      />
                      {errores.nombre && <p id="nombre-error" className="mt-1 text-xs text-red-700">{errores.nombre}</p>}
                      <input
                        className="field"
                        type="tel"
                        aria-label="Teléfono del cliente"
                        placeholder="Teléfono / WhatsApp"
                        value={telefono}
                        onChange={(e) => {
                          setTelefono(e.target.value);
                          limpiarMensajeCampo("telefono");
                        }}
                        aria-invalid={Boolean(errores.telefono)}
                        aria-describedby={errores.telefono ? "telefono-error" : undefined}
                        required
                      />
                      {errores.telefono && <p id="telefono-error" className="mt-1 text-xs text-red-700">{errores.telefono}</p>}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <label
                        htmlFor="cliente-vehiculo"
                        className="text-xs font-semibold text-slate-500"
                      >
                        Cliente propietario
                      </label>
                      <button
                        type="button"
                        className="text-xs font-semibold text-brand"
                        onClick={() => {
                          setNuevoCliente(true);
                          setClienteId("");
                          setNombre("");
                          setTelefono("");
                          limpiarMensajeCampo("cliente");
                        }}
                      >
                        + Registrar cliente nuevo
                      </button>
                    </div>
                    <select
                      id="cliente-vehiculo"
                      className="field"
                      value={clienteId}
                      onChange={(e) => {
                        setClienteId(e.target.value);
                        limpiarMensajeCampo("cliente");
                      }}
                      aria-invalid={Boolean(errores.cliente)}
                      aria-describedby={errores.cliente ? "cliente-error" : undefined}
                      required
                    >
                      <option value="">Seleccionar cliente</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre} {c.apellido} · {c.telefono}
                        </option>
                      ))}
                    </select>
                    {errores.cliente && <p id="cliente-error" className="mt-1 text-xs text-red-700">{errores.cliente}</p>}
                  </>
                )}
              </div>
            )}
            {vehiculoConPatente && (
              <div className="sm:col-span-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                <p>
                  Esta patente ya pertenece a un vehículo registrado. Seleccionalo
                  para conservar su cliente asociado.
                </p>
                <button
                  type="button"
                  className="mt-2 font-semibold underline"
                  onClick={() => {
                    setModoVehiculo("existente");
                    setBusquedaVehiculo(vehiculoConPatente.patente);
                    setVehiculoId("");
                    limpiarMensajeCampo("vehiculo");
                  }}
                >
                  Buscar {vehiculoConPatente.patente}
                </button>
              </div>
            )}
            {errores.vehiculo && (
              <p role="alert" className="sm:col-span-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {errores.vehiculo}
              </p>
            )}
            {modoVehiculo === "existente" && errores.cliente && (
              <p role="alert" className="sm:col-span-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {errores.cliente}
              </p>
            )}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Servicio
              </label>
              <select
                className="field"
                value={servicioId}
                onChange={(e) => {
                  setServicioId(e.target.value);
                  limpiarMensajeCampo("servicioId");
                }}
                aria-invalid={Boolean(errores.servicioId)}
                aria-describedby={errores.servicioId ? "servicio-error" : undefined}
                required
              >
                <option value="">Seleccionar servicio</option>
                {servicios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre} · {s.duracionMin} min · {money(s.precio)}
                  </option>
                ))}
              </select>
              {errores.servicioId && <p id="servicio-error" className="mt-1 text-xs text-red-700">{errores.servicioId}</p>}
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
