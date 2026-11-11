"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Plate } from "@/components/ui/badges";
import { useApp } from "@/lib/store";
import { ApiError, apiConfig, listarClientesReserva, listarVehiculosReserva } from "@/lib/api";
import { coincideBusqueda, type FilaVehiculo } from "@/lib/panel";

export default function VehiculosPage() {
  const consulta = useSearchParams().get("q") ?? "";
  if (apiConfig.USE_MOCK) return <VehiculosDemo consulta={consulta} />;
  return <VehiculosReales consulta={consulta} />;
}

function VehiculosDemo({ consulta }: { consulta: string }) {
  const { vehiculos, clientes, abonos } = useApp();
  const filas = vehiculos
    .map((vehiculo) => {
      const cliente = clientes.find((item) => item.id === vehiculo.clienteId);
      return {
        vehiculo,
        cliente,
        abono: abonos.find((item) => item.vehiculoId === vehiculo.id),
        busqueda: {
          patente: vehiculo.patente,
          vehiculo: `${vehiculo.marca} ${vehiculo.modelo}`,
          cliente: `${cliente?.nombre ?? ""} ${cliente?.apellido ?? ""}`,
          telefono: cliente?.telefono ?? "",
        },
      };
    })
    .filter((fila) => coincideBusqueda(fila.busqueda, consulta));

  return (
    <div className="space-y-5">
      <Encabezado consulta={consulta} />
      <Card>
        <Tabla
          filas={filas.map((fila) => ({
            id: fila.vehiculo.id,
            patente: fila.vehiculo.patente,
            vehiculo: `${fila.vehiculo.marca} ${fila.vehiculo.modelo}`,
            extra: fila.vehiculo.tipo,
            cliente: `${fila.cliente?.nombre ?? ""} ${fila.cliente?.apellido ?? ""}`.trim(),
            detalle: fila.abono
              ? `${fila.abono.disponibles} disp. / ${fila.abono.utilizados} usados`
              : "—",
            estado: fila.cliente?.inactivo
              ? "Inactivo"
              : fila.cliente?.frecuente
                ? "Frecuente"
                : "Regular",
          }))}
          columnas={["Patente", "Vehículo", "Cliente", "Abono", "Estado"]}
          vacio={consulta ? "Ningún vehículo coincide con la búsqueda." : "No hay vehículos."}
        />
      </Card>
    </div>
  );
}

function VehiculosReales({ consulta }: { consulta: string }) {
  const { user } = useApp();
  const lavaderoId = user?.lavaderoId;
  const [filas, setFilas] = useState<FilaVehiculo[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (lavaderoId === undefined) return;
    let vigente = true;
    void (async () => {
      try {
        const clientes = await listarClientesReserva(lavaderoId);
        const grupos = await Promise.all(
          clientes.map(async (cliente) => {
            const vehiculos = await listarVehiculosReserva(lavaderoId, cliente.id).catch(() => []);
            return vehiculos.map((vehiculo) => ({
              patente: vehiculo.patente,
              vehiculo: [vehiculo.marca, vehiculo.modelo].filter(Boolean).join(" ") || "Sin marca",
              cliente: cliente.nombre,
              telefono: cliente.telefono,
            }));
          }),
        );
        if (vigente) {
          setFilas(grupos.flat());
          setError("");
        }
      } catch (causa) {
        if (vigente) {
          setError(
            causa instanceof ApiError
              ? causa.message
              : "No se pudieron cargar los vehículos del lavadero.",
          );
        }
      }
    })();
    return () => {
      vigente = false;
    };
  }, [lavaderoId]);

  const visibles = (filas ?? []).filter((fila) => coincideBusqueda(fila, consulta));

  return (
    <div className="space-y-5">
      <Encabezado consulta={consulta} />
      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <Card>
        {filas === null && !error ? (
          <p className="text-sm text-slate-500">Cargando vehículos…</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["Patente", "Vehículo", "Cliente", "Teléfono"].map((titulo) => (
                  <th key={titulo} className="table-head pb-3">
                    {titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-sm text-slate-500">
                    {consulta
                      ? "Ningún vehículo coincide con la búsqueda."
                      : "Todavía no hay vehículos cargados en este lavadero."}
                  </td>
                </tr>
              ) : (
                visibles.map((fila) => (
                  <tr key={`${fila.patente}-${fila.cliente}`} className="border-b border-slate-50">
                    <td className="py-3">
                      <Plate value={fila.patente} />
                    </td>
                    <td>{fila.vehiculo}</td>
                    <td>{fila.cliente}</td>
                    <td>{fila.telefono || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function Encabezado({ consulta }: { consulta: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold">Vehículos y clientes</h1>
      <p className="text-sm text-slate-500">
        {consulta
          ? `Resultados para “${consulta}”.`
          : "Los clientes y los vehículos cargados en este lavadero."}
      </p>
    </div>
  );
}

function Tabla({
  filas,
  columnas,
  vacio,
}: {
  filas: {
    id: string;
    patente: string;
    vehiculo: string;
    extra?: string;
    cliente: string;
    detalle: string;
    estado: string;
  }[];
  columnas: string[];
  vacio: string;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-100">
          {columnas.map((titulo) => (
            <th key={titulo} className="table-head pb-3">
              {titulo}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filas.length === 0 ? (
          <tr>
            <td colSpan={columnas.length} className="py-6 text-sm text-slate-500">
              {vacio}
            </td>
          </tr>
        ) : (
          filas.map((fila) => (
            <tr key={fila.id} className="border-b border-slate-50">
              <td className="py-3">
                <Plate value={fila.patente} />
              </td>
              <td>
                {fila.vehiculo}
                {fila.extra ? <span className="ml-2 text-xs text-slate-400">{fila.extra}</span> : null}
              </td>
              <td>{fila.cliente}</td>
              <td>{fila.detalle}</td>
              <td>
                <span
                  className={
                    fila.estado === "Inactivo"
                      ? "text-orange-600"
                      : fila.estado === "Frecuente"
                        ? "text-emerald-600"
                        : "text-slate-400"
                  }
                >
                  {fila.estado}
                </span>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
