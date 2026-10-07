import type { ReservationStatus, ServiceStage } from "@/lib/types";
import { stageLabel } from "@/lib/format";

const stageClass: Record<ServiceStage, string> = {
  EN_ESPERA: "bg-[#EDEBFF] text-[#5B4CDB]",
  LAVADO: "bg-[#D9F6F3] text-[#0F9C90]",
  INTERIOR: "bg-[#FFE8D6] text-[#D46A1E]",
  TERMINACIONES: "bg-[#DCEBFF] text-[#2563EB]",
  LISTO: "bg-[#DDF8E8] text-[#15803D]",
  RETIRADO: "bg-slate-100 text-slate-500",
};

const reservaClass: Record<ReservationStatus, string> = {
  MODIFICADA: "bg-[#DCEBFF] text-[#2563EB]",
  PENDIENTE: "bg-[#FFF4D6] text-[#B45309]",
  CONFIRMADA: "bg-[#DDF8E8] text-[#15803D]",
  EN_CURSO: "bg-[#DCEBFF] text-[#2563EB]",
  CANCELADA: "bg-slate-100 text-slate-500",
  COMPLETADA: "bg-[#EDEBFF] text-[#5B4CDB]",
  LISTA_ESPERA: "bg-[#FFE8D6] text-[#D46A1E]",
};

export function StageBadge({ estado }: { estado: ServiceStage }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${stageClass[estado]}`}
    >
      {stageLabel[estado]}
    </span>
  );
}

export function ReservaBadge({ estado }: { estado: ReservationStatus }) {
  const labels: Record<ReservationStatus, string> = {
    MODIFICADA: "Modificada",
    PENDIENTE: "Pendiente",
    CONFIRMADA: "Confirmada",
    EN_CURSO: "En curso",
    CANCELADA: "Cancelada",
    COMPLETADA: "Completada",
    LISTA_ESPERA: "Lista de espera",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${reservaClass[estado]}`}
    >
      {labels[estado]}
    </span>
  );
}

export function Plate({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-xs font-bold tracking-wide text-navy">
      {value}
    </span>
  );
}
