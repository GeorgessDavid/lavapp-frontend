import type { ServiceStage } from "./types";

export const stageLabel: Record<ServiceStage, string> = {
  EN_ESPERA: "En espera",
  LAVADO: "Lavado",
  INTERIOR: "Interior",
  TERMINACIONES: "Terminaciones",
  LISTO: "Listo para retirar",
  RETIRADO: "Retirado",
};

export function money(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export function time(iso: string) {
  return new Date(iso).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function todayLabel() {
  return new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function clock() {
  return new Date().toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
