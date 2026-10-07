"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, Car, Clock, Droplets, Sparkles } from "lucide-react";
import { Card, KpiCard } from "@/components/ui/Card";
import { Plate, StageBadge } from "@/components/ui/badges";
import { useApp } from "@/lib/store";
import { useLookups } from "@/lib/lookups";
import { time, timeWithSeconds } from "@/lib/format";
import { tienePuestoAsignado } from "@/lib/box-assignment";
import { ApiError, apiConfig, fetchOrdenes, finalizarServicioApi } from "@/lib/api";
import { estaEnLavado, tieneEtapaIntermedia } from "@/lib/etapas";
import {
  armarFilasBackend,
  armarFilasLocales,
  contarCola,
  esperando,
  idDeFila,
  type FilaCola,
  type OrdenesBackend,
} from "@/lib/cola";
import {
  fechaHoraReserva,
  obtenerReservaConfirmada,
  priorizarAtencionesEnEspera,
} from "@/lib/queue-priority";

// Cada cuánto se vuelve a pedir la cola al backend mientras la pestaña está visible. Es la red
// de seguridad: los cambios hechos desde esta pantalla se reflejan al instante, los que hacen
// otros operadores u otras pantallas llegan en el próximo sondeo.
const INTERVALO_SONDEO_MS = 10_000;

export default function ColaPage() {
  const {
    atenciones,
    boxes,
    avanzar,
    iniciarLavado,
    asignarBox,
    retirar,
    finalizarServicio,
    notificar,
    user,
    servicios,
    vehiculos,
    clientes,
    reservas,
  } = useApp();
  const { serviciosDe } = useLookups();
  const [ordenesBackend, setOrdenesBackend] = useState<OrdenesBackend | null>(null);
  const [actualizadoEl, setActualizadoEl] = useState<string | null>(null);
  const [finalizando, setFinalizando] = useState<string | null>(null);
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

  // Si una consulta falla se conserva lo último que se vio y se avisa: una cola vieja con un
  // cartel es mejor que una cola vacía que parece real.
  const cargarColaBackend = useCallback(async () => {
    if (apiConfig.USE_MOCK) return;
    if (!lavaderoId) {
      setErrorBackend("No se pudo identificar el lavadero para consultar la cola.");
      return;
    }

    setCargandoBackend(true);
    try {
      const [enEspera, enLavado, listas] = await Promise.all([
        fetchOrdenes(lavaderoId, "EN_ESPERA"),
        fetchOrdenes(lavaderoId, "EN_PROGRESO"),
        fetchOrdenes(lavaderoId, "LISTO"),
      ]);
      setOrdenesBackend({ enEspera, enLavado, listas });
      setActualizadoEl(new Date().toISOString());
      setErrorBackend("");
    } catch (error) {
      // Un ApiError trae el detalle del backend; cualquier otra cosa es que no se pudo llegar
      // a él (red caída, servidor apagado) y el "Failed to fetch" del navegador no le dice
      // nada al operador.
      setErrorBackend(
        error instanceof ApiError
          ? error.message
          : "No se pudo conectar con el servidor para consultar la cola.",
      );
    } finally {
      setCargandoBackend(false);
    }
  }, [lavaderoId]);

  // HU-13: la cola se mantiene al día sola. Se pide al entrar, cada INTERVALO_SONDEO_MS mientras
  // la pestaña está visible, y apenas se vuelve a ella (foco o visibilidad): una pestaña oculta
  // no pide nada y se pone al día en cuanto el operador la mira.
  useEffect(() => {
    if (apiConfig.USE_MOCK) return;
    const siEstaVisible = () => {
      if (document.visibilityState === "visible") void cargarColaBackend();
    };
    const initialTimeoutId = window.setTimeout(() => void cargarColaBackend(), 0);
    const intervalId = window.setInterval(siEstaVisible, INTERVALO_SONDEO_MS);
    window.addEventListener("focus", siEstaVisible);
    document.addEventListener("visibilitychange", siEstaVisible);
    return () => {
      window.clearTimeout(initialTimeoutId);
      window.clearInterval(intervalId);
      window.removeEventListener("focus", siEstaVisible);
      document.removeEventListener("visibilitychange", siEstaVisible);
    };
  }, [cargarColaBackend]);

  // HU-34: la acción existe en toda fila activa pero solo se habilita En lavado. Para una orden
  // del backend llama al endpoint y vuelve a cargar la cola, también tras un error: si otro
  // operador la finalizó antes (409), la fila tiene que pasar a reflejar el estado real.
  const finalizar = async (fila: FilaCola) => {
    if (fila.tipo === "local") {
      finalizarServicio(fila.atencion.id);
      return;
    }
    const { ordenId, patente } = fila.orden;
    setFinalizando(idDeFila(fila));
    try {
      await finalizarServicioApi(ordenId);
      notificar(`Servicio finalizado: ${patente} quedó listo para retirar.`);
    } catch (error) {
      notificar(
        error instanceof ApiError && error.status === 409
          ? `No se pudo finalizar ${patente}: ya no está en lavado.`
          : error instanceof Error
            ? error.message
            : "No se pudo finalizar el servicio.",
      );
    } finally {
      setFinalizando(null);
      void cargarColaBackend();
    }
  };

  // En modo real la cola es lo que dice el backend y nada más; los datos de demo quedan para el
  // modo mock. Así la posición de cada vehículo es la que ve cualquier otro operador.
  const filas = useMemo<FilaCola[]>(() => {
    if (apiConfig.USE_MOCK) {
      return armarFilasLocales(
        enEsperaLocal,
        activas.filter((atencion) => atencion.estado !== "EN_ESPERA"),
      );
    }
    return ordenesBackend ? armarFilasBackend(ordenesBackend) : [];
  }, [activas, ordenesBackend, enEsperaLocal]);
  const totales = contarCola(filas);
  const enEspera = filas.filter(esperando);
  const esperandoPrimeraCarga = !apiConfig.USE_MOCK && ordenesBackend === null && !errorBackend;
  const mensajeVacio = esperandoPrimeraCarga
    ? "Consultando la cola..."
    : filas.length === 0
      ? "La cola está vacía: no hay vehículos esperando."
      : null;

  // Lo que se muestra de cada fila, igual en la tabla y en las tarjetas del celular: una orden
  // del backend ya trae todo; una atención local se completa con los catálogos de la demo.
  const describir = (fila: FilaCola) => {
    const a = fila.tipo === "local" ? fila.atencion : null;
    const orden = fila.tipo === "backend" ? fila.orden : null;
    const v = a ? vehiculos.find((vehiculo) => vehiculo.id === a.vehiculoId) : null;
    const c = a ? clientes.find((cliente) => cliente.id === a.clienteId) : null;
    const reservaConfirmada = a ? obtenerReservaConfirmada(a, reservas) : null;
    return {
      id: idDeFila(fila),
      posicion: fila.posicion,
      estado: fila.estado,
      origen: orden?.tipoIngreso ?? (reservaConfirmada ? "RESERVA" : "ESPONTANEO"),
      horarioReserva:
        orden?.horarioReserva ??
        (reservaConfirmada
          ? new Date(fechaHoraReserva(reservaConfirmada)).toISOString()
          : null),
      ingreso: orden?.ingreso ?? a?.fechaIngreso ?? null,
      horaEstimada: a?.horaEstimadaInicio ?? null,
      patente: orden?.patente ?? v?.patente ?? "—",
      modelo: orden?.modelo ?? `${v?.marca ?? ""} ${v?.modelo ?? ""}`.trim(),
      cliente:
        orden?.clienteNombre ?? (`${c?.nombre ?? ""} ${c?.apellido ?? ""}`.trim() || "—"),
      servicio: orden?.servicioNombre ?? (a ? serviciosDe(a.servicioIds) : "—"),
    };
  };

  const etiquetaOrigen = (origen: string) => (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        origen === "RESERVA" ? "bg-violet-100 text-violet-800" : "bg-slate-100 text-slate-600"
      }`}
    >
      {origen === "RESERVA" ? (
        <CalendarClock className="h-3.5 w-3.5" />
      ) : (
        <Car className="h-3.5 w-3.5" />
      )}
      {origen === "RESERVA" ? "Reserva" : "Espontáneo"}
    </span>
  );

  const turnoOIngreso = (horarioReserva: string | null, ingreso: string | null) =>
    horarioReserva ? (
      <span className="inline-flex items-center gap-1 font-semibold text-violet-700">
        <CalendarClock className="h-3.5 w-3.5" />
        {time(horarioReserva)}
      </span>
    ) : ingreso ? (
      <span className="text-slate-500">Ingresó {time(ingreso)}</span>
    ) : (
      "—"
    );

  const acciones = (fila: FilaCola) => {
    const a = fila.tipo === "local" ? fila.atencion : null;
    const orden = fila.tipo === "backend" ? fila.orden : null;
    const rowId = idDeFila(fila);
    const { estado } = fila;
    return (
      <>
        {a?.estado === "EN_ESPERA" && (
          <>
            {!tienePuestoAsignado(a, boxes) && libres[0] && (
              <button
                className="text-xs font-semibold text-[#6C5CE7]"
                onClick={() => asignarBox(a.id, libres[0].id)}
              >
                Asignar puesto
              </button>
            )}
            <button
              type="button"
              className="text-xs font-semibold text-[#6C5CE7] disabled:cursor-not-allowed disabled:text-slate-400"
              disabled={!tienePuestoAsignado(a, boxes)}
              title={
                tienePuestoAsignado(a, boxes)
                  ? "Iniciar el lavado del vehículo asignado"
                  : "Asigná un puesto al vehículo antes de iniciar el lavado"
              }
              onClick={() => iniciarLavado(a.id)}
            >
              Iniciar lavado
            </button>
          </>
        )}
        {a && tieneEtapaIntermedia(a.estado) && (
          <button
            className="text-xs font-semibold text-[#6C5CE7]"
            onClick={() => avanzar(a.id)}
          >
            Siguiente etapa
          </button>
        )}
        {estado !== "LISTO" && estado !== "RETIRADO" && (
          <button
            type="button"
            className="text-xs font-semibold text-emerald-600 disabled:cursor-not-allowed disabled:text-slate-300"
            disabled={!estaEnLavado(estado) || finalizando === rowId}
            title={
              estaEnLavado(estado)
                ? "Marca el lavado como terminado: el vehículo queda listo para retirar"
                : "Solo se puede finalizar un vehículo que está en lavado"
            }
            onClick={() => void finalizar(fila)}
          >
            {finalizando === rowId ? "Finalizando..." : "Finalizar servicio"}
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
        {orden?.estado === "LISTO" && (
          <span className="text-xs text-slate-400">Esperando retiro</span>
        )}
      </>
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Cola</h1>
        <p className="text-sm text-slate-500">
          Visualizá y organizá los vehículos en espera, en lavado y listos.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard
          label="En espera"
          value={totales.enEspera}
          tone="purple"
          icon={<Clock className="h-5 w-5" />}
        />
        <KpiCard
          label="En lavado"
          value={totales.enLavado}
          tone="teal"
          icon={<Droplets className="h-5 w-5" />}
        />
        <KpiCard
          label="Listos para retirar"
          value={totales.listos}
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
        <Card
          title="Cola de vehículos"
          action={
            apiConfig.USE_MOCK ? null : (
              <div className="flex items-center gap-3 text-xs text-slate-400">
                {cargandoBackend ? (
                  <span>Actualizando...</span>
                ) : actualizadoEl ? (
                  <span>Actualizado {timeWithSeconds(actualizadoEl)}</span>
                ) : null}
                <button
                  type="button"
                  className="font-semibold text-[#6C5CE7] disabled:text-slate-300"
                  disabled={cargandoBackend}
                  onClick={() => void cargarColaBackend()}
                >
                  Actualizar
                </button>
              </div>
            )
          }
        >
          {errorBackend && (
            <p
              role="alert"
              className="mb-3 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="flex-1">
                {errorBackend}
                {ordenesBackend ? " Se muestra la última cola consultada." : ""}
              </span>
              <button
                type="button"
                className="font-semibold underline disabled:opacity-50"
                disabled={cargandoBackend}
                onClick={() => void cargarColaBackend()}
              >
                Reintentar
              </button>
            </p>
          )}
          {/* Escritorio: la tabla. Celular: una tarjeta por vehículo con los mismos datos. */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {[
                    "Posición",
                    "Origen",
                    "Patente",
                    "Cliente",
                    "Servicio",
                    "Turno / ingreso",
                    "Estado",
                    "Acción",
                  ].map((h) => (
                    <th key={h} className="table-head pb-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mensajeVacio && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-sm text-slate-500">
                      {mensajeVacio}
                    </td>
                  </tr>
                )}
                {filas.map((fila) => {
                  const d = describir(fila);
                  return (
                    <tr key={d.id} className="border-b border-slate-50">
                      <td className="py-3 font-semibold text-slate-400">{d.posicion ?? "—"}</td>
                      <td>{etiquetaOrigen(d.origen)}</td>
                      <td>
                        <Plate value={d.patente} />
                      </td>
                      <td>{d.cliente}</td>
                      <td className="text-slate-500">{d.servicio}</td>
                      <td>{turnoOIngreso(d.horarioReserva, d.ingreso)}</td>
                      <td>
                        <StageBadge estado={d.estado} />
                      </td>
                      <td className="space-x-2">{acciones(fila)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ul className="space-y-3 md:hidden">
            {mensajeVacio && (
              <li className="rounded-xl bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
                {mensajeVacio}
              </li>
            )}
            {filas.map((fila) => {
              const d = describir(fila);
              return (
                <li
                  key={d.id}
                  data-cola-tarjeta
                  className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-slate-500"
                        title={d.posicion ? `Posición ${d.posicion} en la cola` : "No está en la cola"}
                      >
                        {d.posicion ?? "—"}
                      </span>
                      <Plate value={d.patente} />
                    </div>
                    <StageBadge estado={d.estado} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                    <div>
                      <dt className="text-slate-400">Cliente</dt>
                      <dd className="font-medium text-slate-700">{d.cliente}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Servicio</dt>
                      <dd className="font-medium text-slate-700">{d.servicio}</dd>
                    </div>
                    <div>{etiquetaOrigen(d.origen)}</div>
                    <div className="self-center">{turnoOIngreso(d.horarioReserva, d.ingreso)}</div>
                  </dl>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">{acciones(fila)}</div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title="Próximos servicios">
          <ul className="space-y-3">
            {enEspera.map((fila) => {
              const d = describir(fila);
              const horario = d.horarioReserva ?? d.horaEstimada;
              return (
                <li
                  key={d.id}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold">{d.modelo}</p>
                    <p className="text-xs text-slate-500">
                      {d.patente} · {d.origen === "RESERVA" ? "Reserva confirmada" : "Sin turno"}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#6C5CE7]">
                    {horario ? time(horario) : "En espera"}
                  </span>
                </li>
              );
            })}
            {!esperandoPrimeraCarga && enEspera.length === 0 && (
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
