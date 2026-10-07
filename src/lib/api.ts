import type {
  Atencion,
  CapacidadActual,
  EstadoOrdenApi,
  OrdenColaApi,
  OrdenTrabajoApi,
  PlanActual,
  Role,
  User,
} from "./types";
import { NEXT_STAGE, users, atenciones as seedAtenciones } from "./mock-data";
import { planes } from "./plans";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const USE_MOCK =
  process.env.NEXT_PUBLIC_USE_MOCK !== "false";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Callback que registra el store para cerrar la sesión local cuando el backend responde 401
 * (sesión expirada en Redis, usuario desactivado, etc.). No aplica al login, donde el 401
 * significa credenciales inválidas.
 */
let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(handler: (() => void) | null) {
  onUnauthorized = handler;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // La autenticación es por cookie de sesión (LAVAPP_SESSION, HttpOnly): el navegador la manda
  // solo si la request va con credentials: "include" y el origen está habilitado en el backend.
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    let message = `No se pudo completar la solicitud (${res.status})`;
    try {
      const problem = (await res.json()) as { detail?: string; message?: string };
      message = problem.detail ?? problem.message ?? message;
    } catch {
      // La API puede responder sin cuerpo en errores de infraestructura.
    }
    if (res.status === 401 && !path.startsWith("/auth/authenticate")) {
      onUnauthorized?.();
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface ReservaCliente {
  id: number;
  lavaderoId: number;
  nombre: string;
  telefono: string;
}

export interface ReservaVehiculo {
  id: number;
  clienteId: number;
  patente: string;
  marca: string | null;
  modelo: string | null;
}

export interface ReservaServicio {
  id: number;
  nombre: string;
  duracionMin: number;
  precio: number;
}

export interface ReservaPuesto {
  id: number;
  nombre: string;
}

export interface ReservaApi {
  id: number;
  lavaderoId: number;
  clienteId: number;
  clienteNombre: string;
  vehiculoId: number;
  patente: string;
  servicioId: number;
  servicioNombre: string;
  puestoId: number;
  puestoNombre: string;
  inicio: string;
  fin: string;
  estado: "PENDIENTE" | "MODIFICADA" | "CONFIRMADA" | "CANCELADA";
  ordenTrabajoId: number | null;
  codigo: string;
}

export function listarClientesReserva(lavaderoId: number) {
  return request<ReservaCliente[]>(`/lavaderos/${lavaderoId}/clientes`);
}

export function crearClienteReserva(
  lavaderoId: number,
  payload: { nombre: string; telefono: string },
) {
  return request<ReservaCliente>(`/lavaderos/${lavaderoId}/clientes`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listarVehiculosReserva(lavaderoId: number, clienteId: number) {
  return request<ReservaVehiculo[]>(
    `/lavaderos/${lavaderoId}/clientes/${clienteId}/vehiculos`,
  );
}

export function crearVehiculoReserva(
  lavaderoId: number,
  clienteId: number,
  payload: { patente: string; marca?: string; modelo?: string },
) {
  return request<ReservaVehiculo>(
    `/lavaderos/${lavaderoId}/clientes/${clienteId}/vehiculos`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export function listarServiciosReserva(lavaderoId: number) {
  return request<ReservaServicio[]>(`/lavaderos/${lavaderoId}/servicios`);
}

export function listarPuestosReserva(lavaderoId: number) {
  return request<ReservaPuesto[]>(`/lavaderos/${lavaderoId}/puestos`);
}

export function listarReservas(lavaderoId: number, soloActivas = true) {
  return request<ReservaApi[]>(`/lavaderos/${lavaderoId}/reservas?soloActivas=${soloActivas}`, { cache: "no-store" });
}

export function obtenerReserva(lavaderoId: number, id: number) {
  return request<ReservaApi>(`/lavaderos/${lavaderoId}/reservas/${id}`, { cache: "no-store" });
}

export function buscarReservasActivas(lavaderoId: number, dato: string, signal?: AbortSignal) {
  return request<ReservaApi[]>(
    `/lavaderos/${lavaderoId}/reservas/buscar?${new URLSearchParams({ dato: dato.trim() })}`,
    { cache: "no-store", signal },
  );
}

export function confirmarLlegadaReserva(lavaderoId: number, id: number) {
  return request<ReservaApi>(`/lavaderos/${lavaderoId}/reservas/${id}/confirmar-llegada`, {
    method: "POST",
  });
}

export function actualizarReserva(lavaderoId: number, id: number, payload: { servicioId: number; fechaHorario: string }) {
  return request<ReservaApi>(`/lavaderos/${lavaderoId}/reservas/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export function cancelarReserva(lavaderoId: number, id: number) {
  return request<ReservaApi>(`/lavaderos/${lavaderoId}/reservas/${id}/cancelar`, { method: "POST" });
}

export function crearReservaApi(
  lavaderoId: number,
  payload: {
    clienteId: number;
    vehiculoId: number;
    servicioId: number;
    puestoId: number;
    fechaHorario: string;
  },
) {
  return request<ReservaApi>(`/lavaderos/${lavaderoId}/reservas`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ----------------------------------------------------------------------------
// Autenticación (backend: POST /auth/authenticate, GET /auth/me, POST /auth/logout)
// ----------------------------------------------------------------------------

type RolApi = "ADMIN_LAVAPP" | "DUENO_LAVADERO" | "ENCARGADO" | "EMPLEADO";

/** Usuario tal como lo devuelve el backend en /auth/authenticate y /auth/me. */
export interface UsuarioApi {
  id: number;
  email: string;
  rol: RolApi;
  lavaderoId: number | null;
}

/**
 * Los roles del backend se proyectan sobre los del front: dueño y admin de LavApp ven la
 * app completa; encargados y empleados operan. FLOTA no existe en el backend (solo demo).
 */
const ROL_API_A_ROLE: Record<RolApi, Role> = {
  ADMIN_LAVAPP: "DUENO",
  DUENO_LAVADERO: "DUENO",
  ENCARGADO: "OPERADOR",
  EMPLEADO: "OPERADOR",
};

/** El backend todavía no guarda el nombre: se arma uno legible a partir del email. */
function nombreDesdeEmail(email: string) {
  const local = email.split("@")[0] ?? email;
  const nombre = local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((parte) => parte[0].toUpperCase() + parte.slice(1))
    .join(" ");
  return nombre || email;
}

export function toUser(usuario: UsuarioApi): User {
  return {
    id: String(usuario.id),
    nombre: nombreDesdeEmail(usuario.email),
    email: usuario.email,
    rol: ROL_API_A_ROLE[usuario.rol] ?? "OPERADOR",
    lavaderoId: usuario.lavaderoId ?? undefined,
  };
}

export async function loginRequest(
  email: string,
  password: string,
): Promise<User> {
  if (USE_MOCK) {
    const found = users.find(
      (u) => u.email === email && u.password === password,
    );
    if (!found) throw new Error("Credenciales inválidas");
    return {
      id: found.id,
      nombre: found.nombre,
      email: found.email,
      rol: found.rol,
      lavaderoId: found.lavaderoId,
    };
  }
  const usuario = await request<UsuarioApi>("/auth/authenticate", {
    method: "POST",
    body: JSON.stringify({ email: email.trim(), password }),
  });
  return toUser(usuario);
}

/**
 * Usuario de la sesión actual según el backend. Devuelve null si no hay sesión válida (401).
 * En modo mock no se usa: el store restaura el usuario desde localStorage.
 */
export async function fetchMe(): Promise<User | null> {
  try {
    return toUser(await request<UsuarioApi>("/auth/me"));
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

export async function logoutRequest(): Promise<void> {
  if (USE_MOCK) return;
  await request<void>("/auth/logout", { method: "POST" });
}

export async function fetchAtenciones(): Promise<Atencion[]> {
  if (USE_MOCK) return structuredClone(seedAtenciones);
  return request<Atencion[]>("/api/atenciones");
}

/** Las órdenes del lavadero en un estado. Las EN_ESPERA vienen ya priorizadas por el backend. */
export async function fetchOrdenes(
  lavaderoId: number,
  estado: EstadoOrdenApi,
): Promise<OrdenColaApi[]> {
  return request<OrdenColaApi[]>(
    `/lavaderos/${lavaderoId}/ordenes?estado=${estado}`,
  );
}

/**
 * Finaliza el lavado de una orden (HU-34): EN_PROGRESO -> LISTO, con el momento en finLavado.
 * El backend responde 409 si la orden no está en lavado (por ejemplo, si ya fue finalizada).
 */
export async function finalizarServicioApi(
  ordenId: number,
): Promise<OrdenTrabajoApi> {
  return request<OrdenTrabajoApi>(`/ordenes/${ordenId}/finalizar-servicio`, {
    method: "PATCH",
  });
}

export async function patchEstado(
  id: string,
  estado: Atencion["estado"],
  boxId?: string,
): Promise<Atencion> {
  if (USE_MOCK) {
    const current = seedAtenciones.find((a) => a.id === id);
    if (!current) throw new Error("Atención no encontrada");
    return { ...current, estado, boxId: boxId ?? current.boxId };
  }
  return request<Atencion>(`/api/atenciones/${id}/estado`, {
    method: "PATCH",
    body: JSON.stringify({ estado, boxId }),
  });
}

export async function fetchCapacidad(
  lavaderoId: number,
  ocupadosEnDemo: number,
): Promise<CapacidadActual> {
  if (USE_MOCK) {
    const capacidadMaxima = Number(
      localStorage.getItem(`lavapp_demo_capacidad_${lavaderoId}`) ?? 10,
    );
    const diferencia = capacidadMaxima - ocupadosEnDemo;
    return {
      lavaderoId,
      capacidadMaxima,
      lugaresOcupados: ocupadosEnDemo,
      lugaresDisponibles: Math.max(0, diferencia),
      sobreCapacidad: diferencia < 0,
    };
  }
  return request<CapacidadActual>(`/lavaderos/${lavaderoId}/capacidad`);
}

export async function updateCapacidad(
  lavaderoId: number,
  capacidadMaxima: number,
  ocupadosEnDemo: number,
): Promise<CapacidadActual> {
  if (USE_MOCK) {
    if (!Number.isInteger(capacidadMaxima) || capacidadMaxima <= 0) {
      throw new Error("La capacidad máxima debe ser un entero mayor que cero.");
    }
    if (capacidadMaxima < ocupadosEnDemo) {
      throw new Error(
        `La capacidad no puede ser menor a los ${ocupadosEnDemo} vehículos ingresados.`,
      );
    }
    localStorage.setItem(
      `lavapp_demo_capacidad_${lavaderoId}`,
      String(capacidadMaxima),
    );
    window.dispatchEvent(new Event("lavapp:capacity-updated"));
    return fetchCapacidad(lavaderoId, ocupadosEnDemo);
  }
  return request<CapacidadActual>(`/lavaderos/${lavaderoId}/capacidad`, {
    method: "PATCH",
    body: JSON.stringify({ capacidadMaxima }),
  });
}

export async function fetchPlanActual(lavaderoId: number): Promise<PlanActual> {
  if (USE_MOCK) {
    const selectedName =
      typeof window !== "undefined"
        ? localStorage.getItem(`lavapp_demo_plan_${lavaderoId}`) ?? "Pro"
        : "Pro";
    const selectedPlan = planes.find((plan) => plan.nombre === selectedName);
    if (!selectedPlan) throw new Error("El plan de demostración no es válido");
    return {
      lavaderoId,
      planId: planes.indexOf(selectedPlan) + 1,
      nombre: selectedPlan.nombre,
      precioMensual: selectedPlan.precioMensual,
      moneda: "ARS",
      periodicidad: "MENSUAL",
      funcionalidades: selectedPlan.permisos,
      volumenLavadosReferenciaMensual: selectedPlan.volumenReferencia,
      aclaracionVolumen:
        "Volumen orientativo; no bloquea el uso ni genera cargos por lavado.",
    };
  }
  return request<PlanActual>(`/lavaderos/${lavaderoId}/plan`);
}

export async function simulatePlanChange(
  lavaderoId: number,
  nombrePlan: PlanActual["nombre"],
): Promise<PlanActual> {
  if (!USE_MOCK) {
    throw new Error(
      "El cambio de plan real requiere el catálogo de planes y autorización del backend.",
    );
  }
  if (!planes.some((plan) => plan.nombre === nombrePlan)) {
    throw new Error("El plan seleccionado no existe.");
  }

  localStorage.setItem(`lavapp_demo_plan_${lavaderoId}`, nombrePlan);
  window.dispatchEvent(new Event("lavapp:plan-updated"));
  return fetchPlanActual(lavaderoId);
}

export function nextStageOf(estado: Atencion["estado"]) {
  return NEXT_STAGE[estado];
}

export function homeForRole(rol: Role) {
  if (rol === "FLOTA") return "/flotas";
  return "/dashboard";
}

export const apiConfig = { API_URL, USE_MOCK };

export type EstadoOrdenPuesto =
  | "EN_ESPERA"
  | "EN_PROGRESO"
  | "LISTO"
  | "ENTREGADO"
  | "CANCELADO";

export interface OrdenParaPuesto {
  ordenId: number;
  estado: EstadoOrdenPuesto;
  patente: string;
  modelo: string | null;
  clienteNombre: string;
  servicioNombre: string;
  puestoId: number | null;
}

export async function listarOrdenesParaPuestos(lavaderoId: number) {
  const estados: EstadoOrdenPuesto[] = [
    "EN_ESPERA",
    "EN_PROGRESO",
    "LISTO",
  ];

  const resultados = await Promise.all(
    estados.map((estado) =>
      request<OrdenParaPuesto[]>(
        `/lavaderos/${lavaderoId}/ordenes?estado=${estado}`,
      ),
    ),
  );

  return resultados.flat();
}

export function asignarPuestoApi(ordenId: number, puestoId: number) {
  return request<{ id: number; puestoId: number | null }>(
    `/ordenes/${ordenId}/asignar-puesto`,
    {
      method: "PATCH",
      body: JSON.stringify({ puestoId }),
    },
  );
}
