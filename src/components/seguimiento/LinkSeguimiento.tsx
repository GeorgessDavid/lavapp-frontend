"use client";

import { useEffect, useId, useState } from "react";
import { Copy, LoaderCircle } from "lucide-react";
import { obtenerLinkSeguimiento } from "@/lib/api-seguimiento";

type EstadoLink = { tipo: "cargando" } | { tipo: "listo"; url: string } | { tipo: "error" };

/**
 * El link de seguimiento de una orden, para que el coordinador se lo pase al cliente (HU-43). Si no
 * se puede obtener lo avisa sin romper el panel que lo contiene: el ingreso ya quedó registrado.
 */
export function LinkSeguimiento({ ordenId }: { ordenId: number }) {
  const [link, setLink] = useState<EstadoLink>({ tipo: "cargando" });
  const [copia, setCopia] = useState<"copiado" | "error" | null>(null);
  const tituloId = useId();

  useEffect(() => {
    let vigente = true;
    obtenerLinkSeguimiento(ordenId)
      .then(({ codigoSeguimiento }) => {
        if (vigente) {
          setLink({
            tipo: "listo",
            url: `${window.location.origin}/seguimiento/${encodeURIComponent(codigoSeguimiento)}`,
          });
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

  return (
    <div className="mt-3 border-t border-emerald-200 pt-3">
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
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              className="field font-mono text-xs"
              aria-labelledby={tituloId}
              value={link.url}
              onFocus={(e) => e.currentTarget.select()}
            />
            <button type="button" className="btn-ghost shrink-0" onClick={() => void copiar(link.url)}>
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copiar link
            </button>
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
