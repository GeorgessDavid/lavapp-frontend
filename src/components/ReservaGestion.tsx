"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, actualizarReserva, cancelarReserva, obtenerReserva, type ReservaApi, type ReservaServicio } from "@/lib/api";
import { Plate, ReservaBadge } from "@/components/ui/badges";

export const reservaEditable = (r: ReservaApi) => !r.ordenTrabajoId && (r.estado === "PENDIENTE" || r.estado === "MODIFICADA");
export type ReservaAccion = "detalle" | "editar" | "cancelar";

function localDate(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function ReservaGestion({ reserva, accion, lavaderoId, servicios, onClose, onSaved }: {
  reserva: ReservaApi; accion: ReservaAccion; lavaderoId: number; servicios: ReservaServicio[];
  onClose: () => void; onSaved: (r: ReservaApi) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [detalle, setDetalle] = useState<ReservaApi | null>(null);
  const [mode, setMode] = useState(accion);
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [servicio, setServicio] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);

  useEffect(() => {
    dialog.current?.showModal();
    let active = true;
    obtenerReserva(lavaderoId, reserva.id).then((r) => {
      if (!active) return;
      setDetalle(r);
      const date = new Date(r.inicio);
      setFecha(localDate(date));
      setHora(`${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`);
      setServicio(String(r.servicioId));
    }).catch((e) => active && setError(e instanceof ApiError ? e.message : "No se pudo consultar la reserva. Cerrá y volvé a intentarlo."));
    return () => { active = false; };
  }, [lavaderoId, reserva.id]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!detalle || !reservaEditable(detalle) || submitting.current) return;
    setError(null);
    const [hours, minutes] = hora.split(":");
    const validTime = /^\d{1,2}$/.test(hours ?? "") && /^\d{1,2}$/.test(minutes ?? "") && Number(hours) <= 23 && Number(minutes) <= 59;
    const inicio = new Date(`${fecha}T${hours?.padStart(2, "0")}:${minutes?.padStart(2, "0")}:00`);
    if (mode === "editar" && (!validTime || !Number(servicio) || !Number.isFinite(inicio.getTime()) || inicio.getTime() <= Date.now())) {
      setError("Seleccioná un servicio y una fecha y horario futuros.");
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      const updated = mode === "cancelar"
        ? await cancelarReserva(lavaderoId, detalle.id)
        : await actualizarReserva(lavaderoId, detalle.id, { servicioId: Number(servicio), fechaHorario: inicio.toISOString() });
      onSaved(updated);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo conectar. Verificá la conexión e intentá nuevamente.");
      // Consultar el estado actual por si otro operador confirmó el ingreso.
      try { setDetalle(await obtenerReserva(lavaderoId, reserva.id)); } catch { /* Mantener el error original. */ }
    } finally { setBusy(false); submitting.current = false; }
  }

  return <dialog ref={dialog} onCancel={(e) => { e.preventDefault(); if (!busy) onClose(); }} aria-labelledby="reserva-title" className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-navy shadow-xl backdrop:bg-slate-900/40">
    <div className="mb-5 flex items-center justify-between gap-3">
      <h2 id="reserva-title" className="text-lg font-bold">{mode === "editar" ? "Editar" : mode === "cancelar" ? "Cancelar" : "Detalle de"} reserva #{reserva.id}</h2>
      <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>Cerrar</button>
    </div>
    {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {!detalle ? <p role="status">{error ? "El detalle no está disponible." : "Consultando reserva…"}</p> : <>
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div><dt className="text-slate-500">Cliente</dt><dd className="font-semibold">{detalle.clienteNombre}</dd></div>
        <div><dt className="text-slate-500">Vehículo</dt><dd><Plate value={detalle.patente} /></dd></div>
        <div><dt className="text-slate-500">Servicio</dt><dd>{detalle.servicioNombre}</dd></div>
        <div><dt className="text-slate-500">Puesto</dt><dd>{detalle.puestoNombre}</dd></div>
        <div><dt className="text-slate-500">Fecha y horario</dt><dd>{new Date(detalle.inicio).toLocaleString("es-AR")} a {new Date(detalle.fin).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</dd></div>
        <div><dt className="text-slate-500">Estado</dt><dd><ReservaBadge estado={detalle.estado} /></dd></div>
      </dl>
      {!reservaEditable(detalle) && <p className="mt-5 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{detalle.estado === "CANCELADA" ? "Esta reserva está cancelada." : "El ingreso ya fue confirmado."} No se puede editar ni cancelar.</p>}
      {mode === "detalle" && reservaEditable(detalle) && <div className="mt-6 flex flex-wrap gap-3">
        <button className="btn-primary" onClick={() => { setMode("editar"); setError(null); }}>Editar reserva</button>
        <button className="btn-ghost text-red-700" onClick={() => { setMode("cancelar"); setError(null); }}>Cancelar reserva</button>
      </div>}
      {mode !== "detalle" && reservaEditable(detalle) && <form onSubmit={submit} className="mt-6 space-y-4">
        <fieldset disabled={busy} className="space-y-4">
          {mode === "editar" ? <>
            <label className="block text-sm">Servicio<select className="field mt-1" value={servicio} onChange={(e) => setServicio(e.target.value)} required>
              <option value="">Seleccionar servicio</option>
              {!servicios.some((s) => s.id === detalle.servicioId) && <option value={detalle.servicioId} disabled>{detalle.servicioNombre} (no disponible)</option>}
              {servicios.map((s) => <option key={s.id} value={s.id}>{s.nombre} · {s.duracionMin} min</option>)}
            </select></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">Fecha<input className="field mt-1" type="date" min={localDate(new Date())} value={fecha} onChange={(e) => setFecha(e.target.value)} required /></label>
              <div>
                <span id="horario-label" className="text-sm">Horario (24 horas)</span>
                <div role="group" aria-labelledby="horario-label" className="mt-1 flex items-center gap-2">
                  <input aria-label="Hora" className="field min-w-0 text-center" type="number" inputMode="numeric" min={0} max={23} step={1} placeholder="HH" value={hora.split(":")[0] ?? ""} onChange={(e) => setHora(`${e.target.value}:${hora.split(":")[1] ?? ""}`)} required />
                  <span aria-hidden="true" className="font-semibold">:</span>
                  <input aria-label="Minutos" className="field min-w-0 text-center" type="number" inputMode="numeric" min={0} max={59} step={1} placeholder="MM" value={hora.split(":")[1] ?? ""} onChange={(e) => setHora(`${hora.split(":")[0] ?? ""}:${e.target.value}`)} required />
                </div>
                <p className="mt-1 text-xs text-slate-500">Hora de 0 a 23 · Minutos de 0 a 59</p>
              </div>
            </div>
            <p className="text-xs text-slate-500">La disponibilidad del puesto se valida al guardar, según la duración del servicio.</p>
          </> : <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">¿Querés cancelar esta reserva? Se quitará de la agenda activa y se conservará en el historial.</p>}
          <div className="flex flex-wrap gap-3">
            <button className="btn-primary" type="submit">{busy ? "Guardando…" : mode === "editar" ? "Guardar cambios" : "Confirmar cancelación"}</button>
            <button className="btn-ghost" type="button" onClick={() => { setMode("detalle"); setError(null); }}>Volver</button>
          </div>
        </fieldset>
      </form>}
    </>}
  </dialog>;
}
