"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, LoaderCircle, MessageCircle } from "lucide-react";
import { Plate } from "@/components/ui/badges";
import { ApiError } from "@/lib/api";
import {
  confirmarAvisoListo,
  consultarAvisoListo,
  type AvisoListoApi,
} from "@/lib/api-aviso";
import {
  linkWhatsApp,
  mensajeAvisoListo,
  telefonoWhatsApp,
  urlSeguimiento,
} from "@/lib/seguimiento";

type Props = {
  ordenId: number;
  onClose: () => void;
  onConfirmado: (aviso: AvisoListoApi) => void;
};

/**
 * HU-36: el aviso manual de vehículo listo. Muestra el mensaje ya armado, abre WhatsApp con
 * ese texto y recién después de que el operador lo envía permite registrar la confirmación.
 */
export function AvisoListoDialog({ ordenId, onClose, onConfirmado }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [aviso, setAviso] = useState<AvisoListoApi | null>(null);
  const [cargando, setCargando] = useState(true);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    dialogo.current?.showModal();
  }, []);

  useEffect(() => {
    let vigente = true;
    consultarAvisoListo(ordenId)
      .then((datos) => {
        if (vigente) setAviso(datos);
      })
      .catch((e) => {
        if (!vigente) return;
        setError(
          e instanceof ApiError
            ? e.message
            : "No se pudieron obtener los datos del aviso. Verificá la conexión e intentá de nuevo.",
        );
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [ordenId, intento]);

  const reintentar = () => {
    setCargando(true);
    setError(null);
    setIntento((valor) => valor + 1);
  };

  const confirmar = async () => {
    if (!aviso || confirmando || aviso.confirmadoEl) return;
    setConfirmando(true);
    setError(null);
    try {
      const confirmado = await confirmarAvisoListo(ordenId);
      setAviso(confirmado);
      onConfirmado(confirmado);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "No se pudo confirmar el aviso. Verificá la conexión e intentá de nuevo.",
      );
    } finally {
      setConfirmando(false);
    }
  };

  const url = aviso ? urlSeguimiento(window.location.origin, aviso.codigoSeguimiento) : "";
  const destinatario = aviso
    ? {
        nombre: aviso.clienteNombre,
        patente: aviso.patente,
        telefono: aviso.telefono,
      }
    : null;
  const mensaje =
    aviso && destinatario ? mensajeAvisoListo(destinatario, aviso.servicioNombre, url) : "";
  const telefonoReconocido = aviso ? Boolean(telefonoWhatsApp(aviso.telefono)) : false;

  return (
    <dialog
      ref={dialogo}
      onCancel={(e) => {
        e.preventDefault();
        if (!confirmando) onClose();
      }}
      aria-labelledby="aviso-listo-titulo"
      className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-navy shadow-xl backdrop:bg-slate-900/40"
    >
      <h2 id="aviso-listo-titulo" className="text-lg font-bold">
        Avisar que está listo
      </h2>

      {cargando && (
        <p className="mt-5 flex items-center gap-2 text-sm text-slate-500">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          Preparando el aviso…
        </p>
      )}

      {!cargando && error && (
        <div role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <p className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
          {!aviso && (
            <button
              type="button"
              className="mt-2 font-semibold underline"
              onClick={reintentar}
            >
              Reintentar
            </button>
          )}
        </div>
      )}

      {aviso && destinatario && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span>{aviso.clienteNombre}</span>
            <span aria-hidden="true">·</span>
            <Plate value={aviso.patente} />
            <span aria-hidden="true">·</span>
            <span>{aviso.servicioNombre}</span>
          </div>

          <div>
            <label htmlFor="aviso-listo-mensaje" className="mb-1 block text-xs font-semibold text-slate-500">
              Mensaje para enviar
            </label>
            <textarea
              id="aviso-listo-mensaje"
              className="field min-h-28 resize-none text-sm"
              readOnly
              value={mensaje}
            />
          </div>

          {aviso.confirmadoEl ? (
            <div role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
              <p className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Aviso confirmado
              </p>
              <p className="mt-1 text-xs">
                Registrado el {new Date(aviso.confirmadoEl).toLocaleString("es-AR")}.
              </p>
            </div>
          ) : (
            <>
              <a
                className="btn-primary inline-flex items-center gap-2"
                href={linkWhatsApp(destinatario, url, mensaje)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Abrir WhatsApp
              </a>
              <p className="text-xs text-slate-500">
                WhatsApp se abre con el mensaje listo. Envialo manualmente y después volvé para
                confirmar que ya lo mandaste.
              </p>
              {!telefonoReconocido && (
                <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                  No se pudo reconocer el teléfono del cliente. WhatsApp se abrirá sin destinatario
                  para que elijas el contacto.
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={confirmando}
                  onClick={() => void confirmar()}
                >
                  {confirmando ? "Confirmando…" : "Ya lo envié, confirmar aviso"}
                </button>
                <span className="text-xs text-slate-400">Abrir WhatsApp todavía no confirma nada.</span>
              </div>
            </>
          )}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button type="button" className="btn-ghost" onClick={onClose} disabled={confirmando}>
          Cerrar
        </button>
      </div>
    </dialog>
  );
}
