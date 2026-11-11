"use client";

import { useEffect, useState } from "react";
import { request } from "@/lib/api";
import { linkWhatsApp, mensajeListoSeguimiento, urlSeguimiento } from "@/lib/seguimiento";

type Aviso = {
  ordenId: number;
  clienteNombre: string;
  telefono: string | null;
  patente: string;
  servicioNombre: string;
  codigoSeguimiento: string;
  generadoEl: string;
  confirmadoEl: string | null;
  confirmadoPor: number | null;
};

/** HU-36: abrir el mensaje no confirma su envío. El operador lo declara por separado. */
export function AvisoListo({ ordenId }: { ordenId: number }) {
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [error, setError] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let vigente = true;
    request<Aviso>(`/ordenes/${ordenId}/aviso-listo`)
      .then((valor) => { if (vigente) { setAviso(valor); setError(""); } })
      .catch(() => { if (vigente) setError("No se pudo consultar el aviso. El seguimiento sigue actualizado."); });
    return () => { vigente = false; };
  }, [ordenId, revision]);

  async function confirmar() {
    setEnviando(true);
    setError("");
    try {
      setAviso(await request<Aviso>(`/ordenes/${ordenId}/aviso-listo/confirmar`, { method: "POST" }));
    } catch {
      setError("No se pudo registrar la confirmación. Podés reintentar sin volver a enviar el mensaje.");
    } finally {
      setEnviando(false);
    }
  }

  const destinatario = aviso && { nombre: aviso.clienteNombre, telefono: aviso.telefono, patente: aviso.patente };
  const url = aviso ? urlSeguimiento(window.location.origin, aviso.codigoSeguimiento) : "";
  const mensaje = aviso && destinatario
    ? mensajeListoSeguimiento(destinatario, aviso.servicioNombre, url)
    : "";

  return (
    <div className="space-y-2 rounded-xl bg-emerald-50 p-3 text-xs" aria-label="Aviso de vehículo listo">
      {!aviso && !error && <p>Cargando aviso…</p>}
      {aviso?.confirmadoEl ? (
        <p role="status">Envío manual confirmado el {new Date(aviso.confirmadoEl).toLocaleString("es-AR")} por el operador #{aviso.confirmadoPor}. No acredita entrega al cliente.</p>
      ) : aviso && destinatario ? (
        <>
          <p className="font-semibold">Pendiente de aviso por WhatsApp</p>
          <p>{aviso.patente} · {aviso.servicioNombre} · {aviso.clienteNombre}</p>
          <a className="btn-ghost" target="_blank" rel="noopener noreferrer"
            href={linkWhatsApp(destinatario, url, mensaje)} onClick={() => setAbierto(true)}>
            Avisar por WhatsApp
          </a>
          <p>Revisá el destinatario y enviá el mensaje en WhatsApp. Si no se envía, el aviso queda pendiente y el vehículo sigue listo para retirar.</p>
          {abierto && (
            <button type="button" className="btn-ghost" disabled={enviando} onClick={() => void confirmar()}>
              {enviando ? "Registrando…" : "Confirmar que envié el mensaje"}
            </button>
          )}
        </>
      ) : null}
      {error && <p role="alert">{error}</p>}
      {error && <button type="button" className="btn-ghost" onClick={() => setRevision((valor) => valor + 1)}>Actualizar aviso</button>}
    </div>
  );
}
