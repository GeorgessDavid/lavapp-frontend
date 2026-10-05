import type {
  Atencion,
  CapacidadActual,
  LoginResponse,
  OrdenColaApi,
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("lavapp_token") : null;
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    throw new ApiError(res.status, message);
  }
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

export async function loginRequest(
  email: string,
  password: string,
): Promise<LoginResponse> {
  if (USE_MOCK) {
    const found = users.find(
      (u) => u.email === email && u.password === password,
    );
    if (!found) throw new Error("Credenciales inválidas");
    const user: User = {
      id: found.id,
      nombre: found.nombre,
      email: found.email,
      rol: found.rol,
    };
    return { token: `mock.${user.id}.${user.rol}`, user };
  }
  return request<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchAtenciones(): Promise<Atencion[]> {
  if (USE_MOCK) return structuredClone(seedAtenciones);
  return request<Atencion[]>("/api/atenciones");
}

export async function fetchColaPrioritaria(
  lavaderoId: number,
): Promise<OrdenColaApi[]> {
  return request<OrdenColaApi[]>(
    `/lavaderos/${lavaderoId}/ordenes?estado=EN_ESPERA`,
  );
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
