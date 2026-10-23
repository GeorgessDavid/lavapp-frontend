"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  Car,
  ChevronDown,
  ChevronUp,
  Clock,
  Droplets,
  Sparkles,
  Timer,
} from "lucide-react";
import { Card, KpiCard } from "@/components/ui/Card";
import { Plate, StageBadge } from "@/components/ui/badges";
import { useApp } from "@/lib/store";
import { useLookups } from "@/lib/lookups";
import { time, timeWithSeconds } from "@/lib/format";
import { tienePuestoAsignado } from "@/lib/box-assignment";
import { ApiError, apiConfig, fetchOrdenes, finalizarServicioApi } from "@/lib/api";
import {
  fetchTiemposCola,
  moverEnCola,
  registrarDemora,
  type TiempoEstimadoApi,
} from "@/lib/api-cola";
import {
  DEMORA_MAX,
  DEMORA_MIN,
  MOTIVO_MAX,
  indexarTiempos,
  lecturaTiempo,
  mensajeDemora,
  posicionDestino,
  validarDemora,
} from "@/lib/cola-operativa";
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
  // HU-28: tiempos estimados por orden. Si esa consulta falla, la cola se muestra igual sin ellos.
  const [tiempos, setTiempos] = useState<Map<number, TiempoEstimadoApi>>(() => new Map());
  // HU-16: la fila que se está moviendo; mientras tanto no se acepta otro movimiento.
  const [moviendo, setMoviendo] = useState<string | null>(null);
  // HU-28: la orden a la que se le está registrando una demora (abre el diálogo).
  const [demoraPara, setDemoraPara] = useState<{ ordenId: number; patente: string } | null>(null);
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
      const [enEspera, enLavado, listas, tiemposApi] = await Promise.all([
        fetchOrdenes(lavaderoId, "EN_ESPERA"),
        fetchOrdenes(lavaderoId, "EN_PROGRESO"),
        fetchOrdenes(lavaderoId, "LISTO"),
        fetchTiemposCola(lavaderoId).catch(() => null),
      ]);
      setOrdenesBackend({ enEspera, enLavado, listas });
      setTiempos(indexarTiempos(tiemposApi ?? []));
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

  // HU-16: sube o baja un vehículo en espera. El backend devuelve la cola resultante y se muestra al
  // instante; si el movimiento rompe la prioridad de una reserva próxima responde 409 con el motivo.
  const totalEnEspera = ordenesBackend?.enEspera.length ?? 0;
  const mover = async (fila: FilaCola, delta: -1 | 1) => {
    if (fila.tipo !== "backend") return;
    const destino = posicionDestino(fila.posicion, delta, totalEnEspera);
    if (destino === null) return;
    const { ordenId, patente } = fila.orden;
    setMoviendo(idDeFila(fila));
    try {
      const enEspera = await moverEnCola(ordenId, destino);
      setOrdenesBackend((actual) => (actual ? { ...actual, enEspera } : actual));
      notificar(`Cola actualizada: ${patente} quedó en la posición ${destino}.`);
    } catch (error) {
      notificar(error instanceof Error ? error.message : "No se pudo cambiar el orden de la cola.");
    } finally {
      setMoviendo(null);
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
      tiempo: orden ? (tiempos.get(orden.ordenId) ?? null) : null,
    };
  };

  // HU-28: hora estimada de inicio (en espera) o de fin (en lavado), y la demora acumulada.
  const estimado = (tiempo: TiempoEstimadoApi | null) => {
    if (!tiempo) return <span className="text-slate-300">—</span>;
    const lectura = lecturaTiempo(tiempo);
    return (
      <span className="inline-flex flex-col gap-0.5">
        {lectura.tipo === "estimado" ? (
          <>
            <span className="font-semibold text-slate-700">
              {lectura.etiqueta} ~{time(lectura.hora)}
            </span>
            {lectura.esperaMin !== null && (
              <span className="text-[11px] text-slate-400">
                {lectura.esperaMin > 0 ? `Espera ${lectura.esperaMin} min` : "Puede empezar ya"}
              </span>
            )}
          </>
        ) : (
          <>
            <span className="font-semibold text-slate-500">Sin estimar</span>
            <span className="text-[11px] text-slate-400">{lectura.motivo}</span>
          </>
        )}
        {tiempo.demoraMin > 0 && (
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
            <Timer className="h-3 w-3" />+{tiempo.demoraMin} min de demora
          </span>
        )}
      </span>
    );
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
        {orden?.estado === "EN_ESPERA" && (
          <span className="inline-flex gap-1 align-middle">
            <button
              type="button"
              aria-label={`Subir ${orden.patente} en la cola`}
              title="Subir en la cola"
              className="rounded-lg border border-slate-200 p-1 text-slate-500 hover:text-[#6C5CE7] disabled:cursor-not-allowed disabled:opacity-30"
              disabled={moviendo !== null || posicionDestino(fila.posicion, -1, totalEnEspera) === null}
              onClick={() => void mover(fila, -1)}
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label={`Bajar ${orden.patente} en la cola`}
              title="Bajar en la cola"
              className="rounded-lg border border-slate-200 p-1 text-slate-500 hover:text-[#6C5CE7] disabled:cursor-not-allowed disabled:opacity-30"
              disabled={moviendo !== null || posicionDestino(fila.posicion, 1, totalEnEspera) === null}
              onClick={() => void mover(fila, 1)}
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </span>
        )}
        {(orden?.estado === "EN_ESPERA" || orden?.estado === "EN_PROGRESO") && (
          <button
            type="button"
            className="text-xs font-semibold text-orange-600"
            title="Registrar una demora: se recalculan los tiempos y, si hace falta, la cola"
            onClick={() => setDemoraPara({ ordenId: orden.ordenId, patente: orden.patente })}
          >
            Demora
          </button>
        )}
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
        {a && a.estado !== "RETIRADO" && (
          <button
            type="button"
            className="text-xs font-semibold text-emerald-600 disabled:cursor-not-allowed disabled:text-slate-400"
            disabled={a.estado !== "LISTO"}
            title={
              a.estado === "LISTO"
                ? "Registrar el retiro del vehículo finalizado"
                : "El retiro se habilita cuando el vehículo está finalizado"
            }
            onClick={() => retirar(a.id)}
          >
            Registrar retiro
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
                    ...(apiConfig.USE_MOCK ? [] : ["Estimado"]),
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
                    <td
                      colSpan={apiConfig.USE_MOCK ? 8 : 9}
                      className="py-8 text-center text-sm text-slate-500"
                    >
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
                      {!apiConfig.USE_MOCK && <td className="text-xs">{estimado(d.tiempo)}</td>}
                      <td>
                        <StageBadge estado={d.estado} />
                      </td>
                      <td>
                        {/* Con las flechas y "Demora" las acciones ya no entran en una línea. */}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">{acciones(fila)}</div>
                      </td>
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
                    {!apiConfig.USE_MOCK && d.tiempo && (
                      <div className="col-span-2">{estimado(d.tiempo)}</div>
                    )}
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
              const horario = d.horarioReserva ?? d.tiempo?.inicioEstimado ?? d.horaEstimada;
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

      {demoraPara && (
        <DemoraDialog
          ordenId={demoraPara.ordenId}
          patente={demoraPara.patente}
          onClose={() => setDemoraPara(null)}
          onGuardada={(mensaje) => {
            notificar(mensaje);
            setDemoraPara(null);
            void cargarColaBackend();
          }}
        />
      )}
    </div>
  );
}

/**
 * HU-28: registrar una demora sobre una atención activa. El backend recalcula los tiempos y, si la
 * demora obliga a adelantar una reserva próxima, reorganiza la cola; la pantalla la vuelve a pedir.
 */
function DemoraDialog({
  ordenId,
  patente,
  onClose,
  onGuardada,
}: {
  ordenId: number;
  patente: string;
  onClose: () => void;
  onGuardada: (mensaje: string) => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [minutos, setMinutos] = useState("10");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    dialogo.current?.showModal();
  }, []);

  const guardar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (guardando) return;
    const cantidad = Number(minutos);
    const invalido = validarDemora(cantidad, motivo);
    if (invalido) {
      setError(invalido);
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const demora = await registrarDemora(ordenId, {
        minutos: cantidad,
        motivo: motivo.trim() || undefined,
      });
      onGuardada(mensajeDemora(patente, demora.minutos, demora.colaReordenada));
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "No se pudo registrar la demora. Verificá la conexión e intentá de nuevo.",
      );
      setGuardando(false);
    }
  };

  return (
    <dialog
      ref={dialogo}
      onCancel={(e) => {
        e.preventDefault();
        if (!guardando) onClose();
      }}
      aria-labelledby="demora-titulo"
      className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-navy shadow-xl backdrop:bg-slate-900/40"
    >
      <h2 id="demora-titulo" className="text-lg font-bold">
        Registrar demora
      </h2>
      <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
        Vehículo <Plate value={patente} />
      </div>
      <form onSubmit={(e) => void guardar(e)} className="mt-5">
        <fieldset disabled={guardando} className="space-y-4">
          <label className="block text-sm">
            Minutos de demora
            <input
              className="field mt-1"
              type="number"
              inputMode="numeric"
              min={DEMORA_MIN}
              max={DEMORA_MAX}
              step={1}
              value={minutos}
              onChange={(e) => setMinutos(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            Motivo (opcional)
            <input
              className="field mt-1"
              maxLength={MOTIVO_MAX}
              placeholder="Ej.: tapizado muy sucio"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </label>
          <p className="text-xs text-slate-500">
            Se recalculan los tiempos estimados y, si hace falta, la cola se reorganiza respetando las
            reservas próximas. Los vehículos en lavado no cambian de lugar.
          </p>
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button className="btn-primary" type="submit">
              {guardando ? "Registrando…" : "Registrar demora"}
            </button>
            <button className="btn-ghost" type="button" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </fieldset>
      </form>
    </dialog>
  );
}
