"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CalendarDays,
  Car,
  ClipboardList,
  Gift,
  History,
  BarChart3,
  BadgeDollarSign,
  LockKeyhole,
  LayoutDashboard,
  LogOut,
  ParkingCircle,
  Search,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { useApp } from "@/lib/store";
import { fetchPlanActual } from "@/lib/api";
import type { PlanActual, PlanFeature } from "@/lib/types";
import { clock, todayLabel } from "@/lib/format";
import { useEffect, useMemo, useState, type ReactNode } from "react";

const nav: {
  href: string;
  label: string;
  icon: LucideIcon;
  owner?: boolean;
  feature?: PlanFeature;
}[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, feature: "CAPACIDAD" },
  { href: "/cola", label: "Cola", icon: ClipboardList, feature: "COLA" },
  { href: "/ingresos", label: "Ingresos", icon: Car, feature: "INGRESOS" },
  { href: "/puestos", label: "Puestos y lavados", icon: ParkingCircle, feature: "PUESTOS" },
  { href: "/reservas", label: "Reservas", icon: CalendarDays, feature: "RESERVAS" },
  { href: "/historial", label: "Historial", icon: History, feature: "HISTORIAL_BASICO" },
  { href: "/vehiculos", label: "Vehículos", icon: Users },
  { href: "/fidelizacion", label: "Fidelización", icon: Gift },
  { href: "/reportes", label: "Reportes", icon: BarChart3, owner: true },
  { href: "/plan", label: "Mi Plan", icon: BadgeDollarSign, owner: true },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, toast, clearToast, atenciones } = useApp();
  const [now, setNow] = useState(clock());
  const [plan, setPlan] = useState<PlanActual | null>(null);
  const [planError, setPlanError] = useState("");

  useEffect(() => {
    if (!user) router.replace("/login");
    else if (user.rol === "FLOTA") router.replace("/flotas");
  }, [user, router]);

  useEffect(() => {
    let cancelled = false;
    if (!user || user.rol === "FLOTA") return;
    if (user.lavaderoId === undefined) return;
    const lavaderoId = user.lavaderoId;
    const cargarPlan = () => fetchPlanActual(lavaderoId)
      .then((currentPlan) => {
        if (!cancelled) {
          setPlan(currentPlan);
          setPlanError("");
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setPlanError(
            error instanceof Error
              ? error.message
              : "No se pudo consultar el plan del establecimiento.",
          );
        }
      });
    void cargarPlan();
    window.addEventListener("lavapp:plan-updated", cargarPlan);
    return () => {
      cancelled = true;
      window.removeEventListener("lavapp:plan-updated", cargarPlan);
    };
  }, [user]);

  useEffect(() => {
    const id = setInterval(() => setNow(clock()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(clearToast, 4500);
    return () => clearTimeout(id);
  }, [toast, clearToast]);

  const alerts = useMemo(
    () => atenciones.filter((a) => a.demoraMin > 0 && a.estado !== "RETIRADO"),
    [atenciones],
  );

  if (!user || user.rol === "FLOTA") return null;

  const items = nav.filter((item) => !item.owner || user.rol === "DUENO");
  const planForUser =
    plan?.lavaderoId === user.lavaderoId ? plan : null;
  const visiblePlanError =
    user.lavaderoId === undefined
      ? "No se pudo identificar el establecimiento de esta cuenta."
      : planError;

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="sticky top-0 flex h-screen w-[232px] shrink-0 flex-col bg-navy px-4 py-5 text-white">
        <Logo light />
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {items.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            const hasFeature =
              !item.feature ||
              Boolean(
                planForUser?.funcionalidades.includes(item.feature),
              );
            if (!hasFeature) {
              const lockReason = planForUser
                ? `No incluido en el plan ${planForUser.nombre}`
                : "No se pudieron consultar los permisos del plan";
              return (
                <span
                  key={item.href}
                  title={lockReason}
                  aria-label={`${item.label}. ${lockReason}`}
                  className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/35"
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{item.label}</span>
                  <LockKeyhole className="h-3.5 w-3.5" />
                </span>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-white/12 text-white"
                    : "text-white/65 hover:bg-white/8 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          {planForUser && (
            <p className="mt-3 rounded-xl bg-white/8 px-3 py-2 text-xs text-white/60">
              Plan activo: <span className="font-semibold text-white">{planForUser.nombre}</span>
            </p>
          )}
          {visiblePlanError && (
            <p role="status" className="mt-3 rounded-xl bg-white/8 px-3 py-2 text-xs text-amber-200">
              Permisos del plan no disponibles.
            </p>
          )}
        </nav>
        <button
          onClick={() => {
            logout();
            router.push("/login");
          }}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/60 hover:bg-white/8 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 px-6 py-4">
          <p className="text-xs capitalize text-slate-400">
            {todayLabel()} · {now}
          </p>
          <div className="flex max-w-lg flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-400">
            <Search className="h-4 w-4" />
            <input
              className="w-full bg-transparent outline-none"
              placeholder="Buscar cliente, vehículo o patente..."
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="relative grid h-10 w-10 place-items-center rounded-full bg-white text-navy shadow-sm">
              <Bell className="h-4 w-4" />
              {alerts.length > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-orange-500" />
              )}
            </span>
            <div className="flex items-center gap-2 rounded-full bg-white py-1.5 pr-3 pl-1.5 shadow-sm">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#6C5CE7] text-xs font-bold text-white">
                {user.nombre
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </span>
              <div className="leading-tight">
                <p className="text-xs font-semibold text-navy">{user.nombre}</p>
                <p className="text-[10px] text-slate-400">
                  {user.rol === "DUENO" ? "Dueño" : "Operador"}
                </p>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 px-6 pb-8">{children}</main>
      </div>

      {toast && (
        <div className="fixed right-6 bottom-6 z-50 max-w-sm rounded-2xl bg-navy px-4 py-3 text-sm text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
