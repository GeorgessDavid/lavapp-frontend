import type { Atencion, LoginResponse, Role, User } from "./types";
import { NEXT_STAGE, users, atenciones as seedAtenciones } from "./mock-data";

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
  estado: "PENDIENTE" | "CONFIRMADA" | "CANCELADA";
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

export function listarReservas(lavaderoId: number) {
  return request<ReservaApi[]>(`/lavaderos/${lavaderoId}/reservas`);
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

export function nextStageOf(estado: Atencion["estado"]) {
  return NEXT_STAGE[estado];
}

export function homeForRole(rol: Role) {
  if (rol === "FLOTA") return "/flotas";
  return "/dashboard";
}

export const apiConfig = { API_URL, USE_MOCK };
