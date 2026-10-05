"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CalendarClock, CheckCircle2, LoaderCircle, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Plate, ReservaBadge } from "@/components/ui/badges";
import {
  ApiError, buscarReservasActivas, confirmarLlegadaReserva, obtenerReserva, type ReservaApi,
} from "@/lib/api";

const activa = (r: ReservaApi) => r.ordenTrabajoId === null &&
  (r.estado === "PENDIENTE" || r.estado === "MODIFICADA");

function Horario({ reserva }: { reserva: ReservaApi }) {
  return <span>{new Date(reserva.inicio).toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  })} a {new Date(reserva.fin).toLocaleTimeString("es-AR", {
    hour: "2-digit", minute: "2-digit", hour12: false,
  })}</span>;
}

export function LlegadaConReserva({ lavaderoId }: { lavaderoId: number }) {
  const [dato, setDato] = useState("");
  const [resultados, setResultados] = useState<ReservaApi[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [confirmando, setConfirmando] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sinCoincidencias, setSinCoincidencias] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [llegada, setLlegada] = useState<ReservaApi | null>(null);
  const controller = useRef<AbortController | null>(null);
  const revision = useRef(0);
  const submitting = useRef(false);
  const mounted = useRef(true);
  const busy = buscando || confirmando !== null;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; controller.current?.abort(); };
  }, []);

  async function buscar(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    const valor = dato.trim();
    if (!valor || valor.length > 120) {
      setError("Ingresá un nombre, patente o código de reserva de hasta 120 caracteres.");
      return;
    }
    if (!Number.isSafeInteger(lavaderoId) || lavaderoId <= 0) {
      setError("No se pudo identificar el lavadero. Revisá la configuración del establecimiento.");
      return;
    }
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const actual = ++revision.current;
    setBuscando(true);
    setError(null);
    setSinCoincidencias(false);
    setResultados([]);
    setLlegada(null);
    setBusqueda(valor);
    try {
      const reservas = await buscarReservasActivas(lavaderoId, valor, abort.signal);
      if (!mounted.current || actual !== revision.current) return;
      const disponibles = reservas.filter(activa);
      setResultados(disponibles);
      setSinCoincidencias(disponibles.length === 0);
    } catch (e) {
      if (!mounted.current || abort.signal.aborted || actual !== revision.current) return;
      // El endpoint también devuelve 404 cuando el lavadero no existe.
      if (e instanceof ApiError && e.status === 404 && e.message.includes("No se encontraron reservas activas")) {
        setSinCoincidencias(true);
      } else {
        setError(e instanceof ApiError ? e.message : "No se pudo conectar. Verificá la conexión y volvé a buscar.");
      }
    } finally {
      if (mounted.current && actual === revision.current) setBuscando(false);
    }
  }

  function llegadaConfirmada(r: ReservaApi) {
    setLlegada(r);
    setResultados((prev) => prev.filter((item) => item.id !== r.id));
    window.dispatchEvent(new Event("lavapp:reservas-updated"));
  }

  async function confirmar(reserva: ReservaApi) {
    if (submitting.current || buscando || !activa(reserva)) return;
    submitting.current = true;
    setConfirmando(reserva.id);
    setError(null);
    setLlegada(null);
    try {
      const r = await confirmarLlegadaReserva(lavaderoId, reserva.id);
      if (mounted.current) llegadaConfirmada(r);
    } catch (e) {
      if (!mounted.current) return;
      setError(e instanceof ApiError ? e.message : "No se pudo verificar la llegada. Estamos consultando el estado de la reserva.");
      // Una respuesta perdida puede haber confirmado el ingreso. Consultar antes de permitir otro intento.
      try {
        const actual = await obtenerReserva(lavaderoId, reserva.id);
        if (!mounted.current) return;
        if (actual.estado === "CONFIRMADA" && actual.ordenTrabajoId !== null) {
          llegadaConfirmada(actual);
          setError(null);
        } else if (!activa(actual)) {
          setResultados((prev) => prev.filter((item) => item.id !== actual.id));
        } else {
          setResultados((prev) => prev.map((item) => item.id === actual.id ? actual : item));
        }
      } catch {
        if (mounted.current) {
          setResultados([]);
          setError("No se pudo consultar el estado actual. Volvé a buscar la reserva antes de confirmar su llegada.");
        }
      }
    } finally {
      submitting.current = false;
      if (mounted.current) setConfirmando(null);
    }
  }

  return <Card title="Llegada con reserva" action={<CalendarClock className="h-5 w-5 text-brand" aria-hidden="true" />}>
    <p className="mb-4 text-sm text-slate-500">Buscá la reserva con el nombre del cliente, la patente o el código que te indique al llegar.</p>
    <form onSubmit={buscar} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1">
        <label htmlFor="dato-reserva" className="mb-1 block text-xs font-semibold text-slate-500">Nombre, patente o código de reserva</label>
        <input id="dato-reserva" className="field" placeholder="Ej.: Martina, AA 123 BB o código de reserva" value={dato}
          maxLength={120} required disabled={confirmando !== null} aria-describedby="ayuda-busqueda-reserva"
          onChange={(e) => {
            revision.current++; controller.current?.abort(); setBuscando(false);
            setDato(e.target.value); setResultados([]); setError(null); setSinCoincidencias(false); setLlegada(null);
          }} />
      </div>
      <button type="submit" className="btn-primary disabled:cursor-not-allowed disabled:opacity-60" disabled={busy || !dato.trim()}>
        {buscando ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Search className="h-4 w-4" aria-hidden="true" />}
        {buscando ? "Buscando…" : "Buscar reserva"}
      </button>
    </form>
    <p id="ayuda-busqueda-reserva" className="mt-2 text-xs text-slate-500">Podés ingresar parte del nombre. Para patente o código, ingresá el dato completo.</p>
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {sinCoincidencias && <p role="status" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">No se encontraron reservas activas para “{busqueda}”. Revisá el dato con el cliente y volvé a buscar.</p>}
    {llegada && <div role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
      <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5" aria-hidden="true" />Llegada confirmada</p>
      <p className="mt-2">{llegada.clienteNombre} · {llegada.patente} · {llegada.servicioNombre}</p>
      <p className="mt-1">Turno original: <Horario reserva={llegada} /> · {llegada.puestoNombre}</p>
      <p className="mt-1">Reserva #{llegada.id} vinculada al ingreso #{llegada.ordenTrabajoId}. El vehículo quedó en espera.</p>
      <Link href="/reservas" className="mt-3 inline-block font-semibold underline">Ver agenda de reservas</Link>
    </div>}
    {resultados.length > 0 && <div className="mt-5" aria-busy={confirmando !== null}>
      <p role="status" className="mb-3 text-sm text-slate-500">{resultados.length} {resultados.length === 1 ? "reserva activa encontrada" : "reservas activas encontradas"}. Verificá el vehículo y el turno antes de confirmar.</p>
      <ul className="grid gap-3 lg:grid-cols-2">
        {resultados.map((r) => <li key={r.id} className="rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><Plate value={r.patente} /><ReservaBadge estado={r.estado} /></div>
          <p className="mt-3 font-semibold">{r.clienteNombre}</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div><dt className="text-xs text-slate-500">Servicio reservado</dt><dd>{r.servicioNombre}</dd></div>
            <div><dt className="text-xs text-slate-500">Fecha y horario</dt><dd><Horario reserva={r} /></dd></div>
            <div><dt className="text-xs text-slate-500">Puesto</dt><dd>{r.puestoNombre}</dd></div>
            <div><dt className="text-xs text-slate-500">Código de reserva</dt><dd className="break-all font-mono text-xs">{r.codigo}</dd></div>
          </dl>
          <button type="button" className="btn-primary mt-4 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy || !activa(r)} aria-label={`Confirmar llegada de ${r.clienteNombre}, patente ${r.patente}`}
            onClick={() => void confirmar(r)}>
            {confirmando === r.id && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {confirmando === r.id ? "Confirmando llegada…" : "Confirmar llegada"}
          </button>
        </li>)}
      </ul>
    </div>}
  </Card>;
}
