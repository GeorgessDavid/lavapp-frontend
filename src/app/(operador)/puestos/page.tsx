"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import {
  ApiError,
  asignarPuestoApi,
  listarOrdenesParaPuestos,
  listarPuestosReserva,
  type OrdenParaPuesto,
  type ReservaPuesto,
} from "@/lib/api";

async function consultar(lavaderoId: number) {
  const [puestos, ordenes] = await Promise.all([
    listarPuestosReserva(lavaderoId),
    listarOrdenesParaPuestos(lavaderoId),
  ]);

  return { puestos, ordenes };
}

export default function PuestosPage() {
  const { user } = useApp();
  const lavaderoId = user?.lavaderoId;

  if (lavaderoId === undefined) {
    return (
      <p role="alert">
        La cuenta no tiene un lavadero asociado.
      </p>
    );
  }

  return <PanelPuestos key={lavaderoId} lavaderoId={lavaderoId} />;
}

function PanelPuestos({ lavaderoId }: { lavaderoId: number }) {
  const [datos, setDatos] = useState<{
    puestos: ReservaPuesto[];
    ordenes: OrdenParaPuesto[];
  } | null>(null);
  const [seleccion, setSeleccion] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const ocupado = useRef(false);

  useEffect(() => {
    let vigente = true;

    consultar(lavaderoId)
      .then((resultado) => {
        if (vigente) setDatos(resultado);
      })
      .catch((err: unknown) => {
        if (vigente) {
          setError(
            err instanceof ApiError ? err.message : "No se pudieron cargar los puestos.",
          );
        }
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [lavaderoId]);

  async function actualizar() {
    if (ocupado.current) return;
    ocupado.current = true;
    setCargando(true);
    setError("");
    setMensaje("");

    try {
      setDatos(await consultar(lavaderoId));
      setSeleccion("");
    } catch (err) {
      setDatos(null);
      setError(
        err instanceof ApiError ? err.message : "No se pudieron actualizar los puestos.",
      );
    } finally {
      ocupado.current = false;
      setCargando(false);
    }
  }

  async function asignar(puestoId: number) {
    if (!seleccion || ocupado.current || cargando || !datos) return;

    ocupado.current = true;
    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      await asignarPuestoApi(Number(seleccion), puestoId);
      setMensaje("Puesto asignado correctamente. La orden sigue en espera.");
      setSeleccion("");
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? "No se pudo asignar: la orden o el puesto ya no están disponibles."
          : err instanceof ApiError
            ? err.message
            : "No se pudo completar la asignación.",
      );
    }

    // Consultamos nuevamente incluso si hubo conflicto con otro operador.
    try {
      setDatos(await consultar(lavaderoId));
    } catch {
      setDatos(null);
      setError((anterior) =>
        `${anterior ? `${anterior} ` : ""}No se pudo actualizar la pantalla. Pulsá Actualizar.`,
      );
    } finally {
      ocupado.current = false;
      setGuardando(false);
    }
  }

  const pendientes =
    datos?.ordenes.filter(
      (orden) => orden.estado === "EN_ESPERA" && orden.puestoId === null,
    ) ?? [];

  const seleccionValida = pendientes.some(
    (orden) => String(orden.ordenId) === seleccion,
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Puestos y lavados</h1>
          <p className="text-sm text-slate-500">
            Elegí una orden en espera y asignala a un puesto disponible.
          </p>
        </div>
        <button
          className="btn-ghost"
          onClick={actualizar}
          disabled={cargando || guardando}
        >
          Actualizar
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
          {error}
        </p>
      )}

      {mensaje && (
        <p role="status" className="rounded-xl bg-green-50 p-4 text-green-700">
          {mensaje}
        </p>
      )}

      {cargando && <p role="status">Cargando puestos…</p>}

      {!cargando && datos && (
        <>
          <section className="card space-y-3 p-5">
            <label htmlFor="orden-puesto" className="block font-semibold">
              Orden en espera
            </label>
            <select
              id="orden-puesto"
              className="field w-full"
              value={seleccionValida ? seleccion : ""}
              onChange={(event) => setSeleccion(event.target.value)}
              disabled={guardando || pendientes.length === 0}
            >
              <option value="">Seleccioná un vehículo</option>
              {pendientes.map((orden) => (
                <option key={orden.ordenId} value={orden.ordenId}>
                  {orden.patente} · {orden.clienteNombre} · {orden.servicioNombre}
                </option>
              ))}
            </select>
            {pendientes.length === 0 && (
              <p className="text-sm text-slate-500">
                No hay órdenes en espera sin puesto asignado.
              </p>
            )}
          </section>

          {datos.puestos.length === 0 && (
            <p>No hay puestos habilitados en este lavadero.</p>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {datos.puestos.map((puesto) => {
              const orden = datos.ordenes.find(
                (item) => item.puestoId === puesto.id,
              );

              return (
                <article key={puesto.id} className="card space-y-4 p-5">
                  <h2 className="font-semibold">{puesto.nombre}</h2>
                  <p
                    className={
                      orden ? "text-orange-600" : "text-emerald-600"
                    }
                  >
                    {orden ? "Ocupado" : "Disponible"}
                  </p>

                  {orden ? (
                    <div className="space-y-2">
                      <p className="font-bold">{orden.patente}</p>
                      <p className="text-sm">{orden.clienteNombre}</p>
                      <p className="text-sm text-slate-500">
                        {orden.servicioNombre}
                      </p>
                      <p className="text-sm">
                        {orden.estado === "EN_ESPERA"
                          ? "En espera"
                          : orden.estado === "EN_PROGRESO"
                            ? "En proceso"
                            : "Listo para retirar"}
                      </p>
                    </div>
                  ) : (
                    <button
                      className="btn-primary w-full"
                      disabled={!seleccionValida || guardando}
                      onClick={() => asignar(puesto.id)}
                    >
                      {guardando ? "Procesando…" : "Asignar vehículo"}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}