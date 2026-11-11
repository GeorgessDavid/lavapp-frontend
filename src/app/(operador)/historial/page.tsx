"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AlertTriangle, LoaderCircle, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Plate, StageBadge } from "@/components/ui/badges";
import { useApp } from "@/lib/store";
import { useLookups } from "@/lib/lookups";
import { time } from "@/lib/format";
import { ApiError, apiConfig } from "@/lib/api";
import { buscarHistorial, type HistorialAtencionApi } from "@/lib/api-historial";
import {
  MAXIMO_RESULTADOS,
  agruparEnFichas,
  claveDeFicha,
  describirVehiculo,
  resumirHistorial,
  validarBusqueda,
  type FichaHistorial,
  type ModoBusqueda,
  type ResumenHistorial,
} from "@/lib/historial";

export default function HistorialPage() {
  // El modo demo sigue con los datos mock; con la API real se consulta el historial del backend.
  return apiConfig.USE_MOCK ? <HistorialMock /> : <HistorialReal />;
}

function HistorialMock() {
  const { atenciones, abonos } = useApp();
  const { cliente, vehiculo, serviciosDe } = useLookups();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return atenciones.filter((a) => {
      const c = cliente(a.clienteId);
      const v = vehiculo(a.vehiculoId);
      const blob = `${c?.nombre} ${c?.apellido} ${v?.patente} ${v?.marca} ${v?.modelo}`.toLowerCase();
      return blob.includes(term);
    });
  }, [q, atenciones, cliente, vehiculo]);

  const selected = filtered[0];
  const selectedCliente = selected ? cliente(selected.clienteId) : undefined;
  const selectedVehiculo = selected ? vehiculo(selected.vehiculoId) : undefined;
  const abono = abonos.find((a) => a.clienteId === selectedCliente?.id);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Historial de servicios</h1>
        <p className="text-sm text-slate-500">
          Buscá por cliente o patente. También aplica a vehículos de flota.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
        <Card
          title="Resultados"
          action={
            <input
              className="field max-w-xs"
              placeholder="Cliente, patente o modelo"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          }
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["Fecha", "Patente", "Cliente", "Servicio", "Estado"].map((h) => (
                  <th key={h} className="table-head pb-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const c = cliente(a.clienteId);
                const v = vehiculo(a.vehiculoId);
                return (
                  <tr key={a.id} className="border-b border-slate-50">
                    <td className="py-3">{time(a.fechaIngreso)}</td>
                    <td>
                      <Plate value={v?.patente ?? "—"} />
                    </td>
                    <td>
                      {c?.nombre} {c?.apellido}
                    </td>
                    <td>{serviciosDe(a.servicioIds)}</td>
                    <td>
                      <StageBadge estado={a.estado} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <Card title="Ficha del cliente">
          {selectedCliente && selectedVehiculo ? (
            <div className="space-y-3 text-sm">
              <p className="text-lg font-semibold">
                {selectedCliente.nombre} {selectedCliente.apellido}
              </p>
              <p className="text-slate-500">{selectedCliente.telefono}</p>
              <Plate value={selectedVehiculo.patente} />
              <p>
                {selectedVehiculo.marca} {selectedVehiculo.modelo}
              </p>
              <p className="text-xs text-slate-400">
                Última visita: {selectedCliente.fechaUltimaVisita}
              </p>
              {selectedCliente.frecuente && (
                <span className="inline-flex rounded-full bg-[#EDEBFF] px-2 py-1 text-[11px] font-semibold text-[#5B4CDB]">
                  Cliente frecuente
                </span>
              )}
              {selectedCliente.inactivo && (
                <span className="inline-flex rounded-full bg-orange-50 px-2 py-1 text-[11px] font-semibold text-orange-700">
                  Inactivo +30 días
                </span>
              )}
              {abono && (
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Abono</p>
                  <p className="font-semibold">{abono.tipo}</p>
                  <p className="text-xs">
                    {abono.utilizados} usados · {abono.disponibles} disponibles
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Sin resultados.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Modo real (HU-39): GET /lavaderos/{id}/historial, a pedido y sin sondeo.
// ----------------------------------------------------------------------------

const MODOS: { valor: ModoBusqueda; etiqueta: string }[] = [
  { valor: "patente", etiqueta: "Patente" },
  { valor: "cliente", etiqueta: "Cliente" },
];

/** Fecha y hora local de una atención, por ejemplo "03/10/2026, 10:10". */
function fechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

const cantidadDe = (cantidad: number, singular: string, plural: string) =>
  `${cantidad} ${cantidad === 1 ? singular : plural}`;

/** Lo que devolvió la última búsqueda, junto con lo que se buscó, para los mensajes. */
interface Resultado {
  dato: string;
  atenciones: HistorialAtencionApi[];
}

function HistorialReal() {
  const { user } = useApp();
  const lavaderoId = user?.lavaderoId;
  const [modo, setModo] = useState<ModoBusqueda>("patente");
  const [texto, setTexto] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  // Con varias fichas (dos clientes o dos vehículos) se puede ver la tabla de una sola.
  const [fichaElegida, setFichaElegida] = useState<string | null>(null);
  const pedido = useRef<AbortController | null>(null);

  // Una búsqueda en curso se cancela al salir de la pantalla.
  useEffect(() => () => pedido.current?.abort(), []);

  const fichas = useMemo(
    () => (resultado ? agruparEnFichas(resultado.atenciones) : []),
    [resultado],
  );
  const resumen = useMemo(
    () => (resultado ? resumirHistorial(resultado.atenciones) : null),
    [resultado],
  );
  const ficha = fichas.find((f) => f.clave === fichaElegida) ?? null;
  const filas = !resultado
    ? []
    : ficha
      ? resultado.atenciones.filter((a) => claveDeFicha(a) === ficha.clave)
      : resultado.atenciones;

  async function buscar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lavaderoId === undefined) return;
    const busqueda = validarBusqueda(modo, texto);
    if (!busqueda.ok) {
      setError(busqueda.error);
      return;
    }

    // Si había otra búsqueda en vuelo se cancela: solo vale la respuesta de la última.
    pedido.current?.abort();
    const actual = new AbortController();
    pedido.current = actual;
    setBuscando(true);
    setError(null);
    try {
      const atenciones = await buscarHistorial(lavaderoId, busqueda.criterio, actual.signal);
      if (actual.signal.aborted) return;
      setResultado({ dato: busqueda.dato, atenciones });
      setFichaElegida(null);
    } catch (causa) {
      if (actual.signal.aborted) return;
      // No quedan a la vista resultados de una búsqueda anterior: se confundirían con esta.
      setResultado(null);
      setError(
        causa instanceof ApiError
          ? causa.message
          : "No se pudo conectar con el servidor para consultar el historial.",
      );
    } finally {
      if (pedido.current === actual) {
        pedido.current = null;
        setBuscando(false);
      }
    }
  }

  const cantidad = resultado?.atenciones.length ?? 0;
  const estado = buscando
    ? "buscando"
    : !resultado
      ? "inicial"
      : cantidad === 0
        ? "vacio"
        : "con-datos";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Historial de servicios</h1>
        <p className="text-sm text-slate-500">
          Consultá los servicios ya realizados y retirados, por patente o por cliente.
        </p>
      </div>

      <Card>
        <form onSubmit={buscar} className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <fieldset>
            <legend className="mb-1 block text-xs font-semibold text-slate-500">Buscar por</legend>
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
              {MODOS.map((opcion) => (
                <label
                  key={opcion.valor}
                  className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#6C5CE7]/40 ${
                    modo === opcion.valor
                      ? "bg-white text-[#5B4CDB] shadow-sm"
                      : "text-slate-500 hover:text-navy"
                  }`}
                >
                  <input
                    type="radio"
                    name="criterio-historial"
                    value={opcion.valor}
                    className="sr-only"
                    checked={modo === opcion.valor}
                    onChange={() => {
                      setModo(opcion.valor);
                      setError(null);
                    }}
                  />
                  {opcion.etiqueta}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="min-w-0 flex-1">
            <label
              htmlFor="dato-historial"
              className="mb-1 block text-xs font-semibold text-slate-500"
            >
              {modo === "patente" ? "Patente" : "Nombre del cliente"}
            </label>
            <input
              id="dato-historial"
              className={`field ${
                modo === "patente" ? "uppercase placeholder:normal-case" : ""
              }`}
              placeholder={modo === "patente" ? "Ej.: AB 123 CD" : "Ej.: Ana Pérez"}
              value={texto}
              maxLength={120}
              autoComplete="off"
              autoCapitalize={modo === "patente" ? "characters" : "words"}
              spellCheck={false}
              enterKeyHint="search"
              aria-describedby="ayuda-historial"
              onChange={(e) => {
                setTexto(e.target.value);
                setError(null);
              }}
            />
          </div>
          <button
            type="submit"
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
            disabled={buscando || lavaderoId === undefined || !texto.trim()}
          >
            {buscando ? (
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="h-4 w-4" aria-hidden="true" />
            )}
            {buscando ? "Buscando…" : "Buscar"}
          </button>
        </form>
        <p id="ayuda-historial" className="mt-2 text-xs text-slate-500">
          {modo === "patente"
            ? "La patente se busca completa; podés escribirla con o sin espacios y guiones."
            : "Podés ingresar parte del nombre, desde 2 letras."}
        </p>
        {lavaderoId === undefined && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            No se pudo identificar el lavadero de esta cuenta para consultar el historial.
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
        <Card title="Servicios anteriores">
          <div aria-busy={buscando}>
            <p
              role="status"
              className={
                estado === "vacio"
                  ? "rounded-xl bg-amber-50 p-3 text-sm text-amber-800"
                  : estado === "con-datos"
                    ? "mb-3 text-sm text-slate-500"
                    : "py-6 text-center text-sm text-slate-500"
              }
            >
              {estado === "buscando"
                ? "Buscando servicios…"
                : estado === "inicial"
                  ? "Buscá por patente o por nombre de cliente para ver los servicios anteriores."
                  : estado === "vacio"
                    ? `No hay servicios registrados para “${resultado?.dato}”.`
                    : `${cantidadDe(cantidad, "servicio", "servicios")} para “${resultado?.dato}”.${
                        cantidad >= MAXIMO_RESULTADOS
                          ? ` Se muestran los ${MAXIMO_RESULTADOS} más recientes.`
                          : ""
                      }`}
            </p>
            {estado === "con-datos" && resultado && (
              <>
                {ficha && (
                  <p className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-[#EDEBFF] px-3 py-2 text-xs text-[#5B4CDB]">
                    <span>
                      Mostrando solo los servicios de {ficha.clienteNombre} con {ficha.patente}.
                    </span>
                    <button
                      type="button"
                      className="font-semibold underline"
                      onClick={() => setFichaElegida(null)}
                    >
                      Ver todos
                    </button>
                  </p>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <caption className="sr-only">
                      Servicios anteriores para “{resultado.dato}”, del más reciente al más
                      antiguo
                    </caption>
                    <thead>
                      <tr className="border-b border-slate-100">
                        {["Fecha", "Patente", "Vehículo", "Cliente", "Servicio"].map((h) => (
                          <th key={h} scope="col" className="table-head pb-3">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filas.map((a) => (
                        <tr key={a.ordenId} className="border-b border-slate-50">
                          <td className="whitespace-nowrap py-3">
                            <time dateTime={a.fecha}>{fechaHora(a.fecha)}</time>
                          </td>
                          <td>
                            <Plate value={a.patente} />
                          </td>
                          <td className="text-slate-500">{describirVehiculo(a) ?? "—"}</td>
                          <td>{a.clienteNombre}</td>
                          <td>{a.servicioNombre}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </Card>

        <Card title="Ficha">
          <FichaHistorialPanel
            resumen={estado === "con-datos" ? resumen : null}
            buscado={estado === "vacio"}
            fichas={fichas}
            elegida={fichaElegida}
            onElegir={setFichaElegida}
          />
        </Card>
      </div>
    </div>
  );
}

/**
 * El resumen de lo encontrado. Con un solo cliente y vehículo es su ficha; con varios (una
 * búsqueda por nombre puede traer a dos "Ana") cada uno tiene la suya, para no mezclarlos.
 */
function FichaHistorialPanel({
  resumen,
  buscado,
  fichas,
  elegida,
  onElegir,
}: {
  resumen: ResumenHistorial | null;
  buscado: boolean;
  fichas: FichaHistorial[];
  elegida: string | null;
  onElegir: (clave: string | null) => void;
}) {
  if (!resumen?.ultima) {
    return (
      <p className="text-sm text-slate-400">
        {buscado
          ? "Sin registros para mostrar."
          : "Acá vas a ver el resumen del cliente o del vehículo que busques."}
      </p>
    );
  }

  const unica = fichas.length === 1 ? fichas[0] : null;
  return (
    <div className="space-y-4 text-sm">
      {unica && (
        <div className="space-y-2">
          <p className="text-lg font-semibold">{unica.clienteNombre}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Plate value={unica.patente} />
            {unica.vehiculo && <span className="text-slate-500">{unica.vehiculo}</span>}
          </div>
        </div>
      )}
      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs text-slate-500">Servicios registrados</dt>
          <dd className="text-2xl font-bold text-navy">{resumen.servicios}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs text-slate-500">Último servicio</dt>
          <dd className="font-semibold">{resumen.ultima.servicioNombre}</dd>
          <dd className="text-xs text-slate-500">
            <time dateTime={resumen.ultima.fecha}>{fechaHora(resumen.ultima.fecha)}</time>
          </dd>
        </div>
      </dl>
      {!unica && (
        <>
          <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
            Hay {cantidadDe(resumen.clientes, "cliente", "clientes")} y{" "}
            {cantidadDe(resumen.vehiculos, "vehículo", "vehículos")} distintos en los resultados:
            cada ficha muestra los suyos por separado.
          </p>
          <ul className="space-y-3">
            {fichas.map((f) => (
              <li
                key={f.clave}
                className={`rounded-xl border p-3 ${
                  elegida === f.clave ? "border-[#6C5CE7] bg-[#F6F5FF]" : "border-slate-200"
                }`}
              >
                <p className="font-semibold">{f.clienteNombre}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Plate value={f.patente} />
                  {f.vehiculo && <span className="text-slate-500">{f.vehiculo}</span>}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {cantidadDe(f.servicios, "servicio", "servicios")} · último:{" "}
                  {f.ultima.servicioNombre},{" "}
                  <time dateTime={f.ultima.fecha}>{fechaHora(f.ultima.fecha)}</time>
                </p>
                <button
                  type="button"
                  aria-pressed={elegida === f.clave}
                  className="mt-2 text-xs font-semibold text-[#6C5CE7]"
                  onClick={() => onElegir(elegida === f.clave ? null : f.clave)}
                >
                  Ver solo estos servicios
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
