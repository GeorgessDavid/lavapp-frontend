import type { Atencion, LoginResponse, Role } from "./types";
import { NEXT_STAGE, users, atenciones as seedAtenciones } from "./mock-data";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const USE_MOCK =
  process.env.NEXT_PUBLIC_USE_MOCK !== "false" || !API_URL;

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
    throw new Error(`Error ${res.status} en ${path}`);
  }
  return (await res.json()) as T;
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
    const { password: _pw, ...user } = found;
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
