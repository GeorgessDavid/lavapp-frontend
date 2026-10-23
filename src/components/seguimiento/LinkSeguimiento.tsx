"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { Copy, LoaderCircle, MessageCircle, Share2 } from "lucide-react";
import { obtenerLinkSeguimiento } from "@/lib/api-seguimiento";
import {
  linkWhatsApp,
  mensajeSeguimiento,
  urlSeguimiento,
  type DestinatarioSeguimiento,
} from "@/lib/seguimiento";

type EstadoLink = { tipo: "cargando" } | { tipo: "listo"; url: string } | { tipo: "error" };

// navigator.share no existe en el servidor ni en muchos navegadores de escritorio. Se lee como un
// valor externo que no cambia: en el servidor da false y el navegador lo corrige al hidratar.
const sinSuscripcion = () => () => {};
const hayShare = () => typeof navigator.share === "function";
const sinShare = () => false;

/**
 * El link de seguimiento de una orden, para que el coordinador se lo pase al cliente (HU-43 y
 * HU-53): se puede copiar, mandar por WhatsApp con el mensaje armado y, donde el navegador lo
 * permite (sobre todo en el celular), compartir con el menú del sistema. Si no se puede obtener lo
 * avisa sin romper el panel que lo contiene.
 */
export function LinkSeguimiento({
  ordenId,
  destinatario,
}: {
  ordenId: number;
  destinatario: DestinatarioSeguimiento;
}) {
  const [link, setLink] = useState<EstadoLink>({ tipo: "cargando" });
  const [copia, setCopia] = useState<"copiado" | "error" | null>(null);
  const puedeCompartir = useSyncExternalStore(sinSuscripcion, hayShare, sinShare);
  const tituloId = useId();

  useEffect(() => {
    let vigente = true;
    obtenerLinkSeguimiento(ordenId)
      .then(({ codigoSeguimiento }) => {
        if (vigente) {
          setLink({ tipo: "listo", url: urlSeguimiento(window.location.origin, codigoSeguimiento) });
        }
      })
      .catch(() => {
        if (vigente) setLink({ tipo: "error" });
      });
    return () => {
      vigente = false;
    };
  }, [ordenId]);

  async function copiar(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopia("copiado");
    } catch {
      // Sin permiso, o fuera de HTTPS, el navegador no deja escribir en el portapapeles.
      setCopia("error");
    }
  }

  async function compartir(url: string) {
    try {
      await navigator.share({
        title: "Seguimiento de tu vehículo",
        text: mensajeSeguimiento(destinatario, url),
      });
    } catch {
      // El coordinador cerró el menú sin elegir nada: no hay nada que avisar.
    }
  }

  return (
    <div>
      <p id={tituloId} className="font-semibold">
        Link de seguimiento para el cliente
      </p>
      {link.tipo === "cargando" && (
        <p className="mt-1 flex items-center gap-2">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          Generando el link…
        </p>
      )}
      {link.tipo === "error" && (
        <p className="mt-1">No se pudo obtener el link de seguimiento. El ingreso quedó registrado igual.</p>
      )}
      {link.tipo === "listo" && (
        <>
          <input
            readOnly
            className="field mt-2 font-mono text-xs"
            aria-labelledby={tituloId}
            value={link.url}
            onFocus={(e) => e.currentTarget.select()}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="btn-ghost" onClick={() => void copiar(link.url)}>
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copiar link
            </button>
            <a
              className="btn-ghost"
              href={linkWhatsApp(destinatario, link.url)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Enviar por WhatsApp
            </a>
            {puedeCompartir && (
              <button type="button" className="btn-ghost" onClick={() => void compartir(link.url)}>
                <Share2 className="h-4 w-4" aria-hidden="true" />
                Compartir
              </button>
            )}
          </div>
          {copia === "copiado" && (
            <p className="mt-1 text-xs">Link copiado. Ya se lo podés mandar al cliente.</p>
          )}
          {copia === "error" && (
            <p className="mt-1 text-xs">No se pudo copiar. Seleccioná el link y copialo a mano.</p>
          )}
        </>
      )}
    </div>
  );
}
