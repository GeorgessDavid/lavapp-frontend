"use client";

import { useApp } from "@/lib/store";

export function useLookups() {
  const { clientes, vehiculos, servicios, boxes } = useApp();
  return {
    cliente: (id: string) => clientes.find((c) => c.id === id),
    vehiculo: (id: string) => vehiculos.find((v) => v.id === id),
    servicio: (id: string) => servicios.find((s) => s.id === id),
    serviciosDe: (ids: string[]) =>
      ids
        .map((id) => servicios.find((s) => s.id === id)?.nombre)
        .filter(Boolean)
        .join(" + "),
    box: (id?: string) => boxes.find((b) => b.id === id),
  };
}
