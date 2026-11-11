"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CalendarDays,
  Car,
  ClipboardList,
  Gauge,
  History,
  BadgeDollarSign,
  LockKeyhole,
  LayoutDashboard,
  LogOut,
  Menu,
  ParkingCircle,
  Search,
  Timer,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { useAccesoProtegido } from "@/components/layout/useAccesoProtegido";
import { useApp } from "@/lib/store";
import { apiConfig, fetchPlanActual } from "@/lib/api";
import { fetchTiemposCola } from "@/lib/api-cola";
import { puedeAbrirRuta } from "@/lib/permisos";
import type { PlanActual, PlanFeature, User } from "@/lib/types";
import { clock, todayLabel } from "@/lib/format";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

// Qué roles ven cada sección lo decide lib/permisos.ts (las mismas reglas que protegen la ruta).
const nav: {
  href: string;
  label: string;
  icon: LucideIcon;
  feature?: PlanFeature;
}[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, feature: "CAPACIDAD" },
  { href: "/capacidad", label: "Capacidad", icon: Gauge, feature: "CAPACIDAD" },
  { href: "/cola", label: "Cola", icon: ClipboardList, feature: "COLA" },
  { href: "/ingresos", label: "Ingresos", icon: Car, feature: "INGRESOS" },
  { href: "/puestos", label: "Puestos y lavados", icon: ParkingCircle, feature: "PUESTOS" },
  { href: "/reservas", label: "Reservas", icon: CalendarDays, feature: "RESERVAS" },
  { href: "/historial", label: "Historial", icon: History, feature: "HISTORIAL_BASICO" },
  { href: "/vehiculos", label: "Vehículos", icon: Users },
  { href: "/servicios", label: "Servicios", icon: Timer },
  { href: "/plan", label: "Mi Plan", icon: BadgeDollarSign },
  { href: "/admin/lavaderos", label: "Configuración", icon: Users, feature: "CONFIGURACION" },
];

const ETIQUETA_ROL: Record<NonNullable<User["rolSistema"]>, string> = {
  ADMIN_LAVAPP: "Administrador",
  DUENO_LAVADERO: "Dueño",
  ENCARGADO: "Encargado",
  EMPLEADO: "Empleado",
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { sesion, logout, toast, clearToast, atenciones } = useApp();
  // Solo hay usuario cuando la sesión está confirmada y puede ver esta ruta; si no, se redirige.
  const user = useAccesoProtegido("operador");
  const [now, setNow] = useState(clock());
  const [plan, setPlan] = useState<PlanActual | null>(null);
  const [planError, setPlanError] = useState("");
  // En celular la barra lateral es un cajón que se abre desde el encabezado; en escritorio es
  // la columna fija de siempre. Se cierra al elegir una sección.
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [demorasReales, setDemorasReales] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!user) return;
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

  useEffect(() => {
    if (apiConfig.USE_MOCK || !user?.lavaderoId) return;
    const lavaderoId = user.lavaderoId;
    let vigente = true;
    const cargar = () => {
      void fetchTiemposCola(lavaderoId)
        .then((tiempos) => {
          if (vigente) setDemorasReales(tiempos.filter((tiempo) => tiempo.demoraMin > 0).length);
        })
        .catch(() => {
          if (vigente) setDemorasReales(0);
        });
    };
    cargar();
    const id = window.setInterval(cargar, 30_000);
    return () => {
      vigente = false;
      window.clearInterval(id);
    };
  }, [user]);

  const demorasDemo = atenciones.filter((a) => a.demoraMin > 0 && a.estado !== "RETIRADO").length;
  const hayDemoras = apiConfig.USE_MOCK ? demorasDemo > 0 : demorasReales > 0;

  function irABusqueda(event: FormEvent) {
    event.preventDefault();
    const texto = busqueda.trim();
    router.push(texto ? `/vehiculos?q=${encodeURIComponent(texto)}` : "/vehiculos");
  }

  if (!user) {
    return sesion === "verificando" ? (
      <p role="status" className="grid min-h-screen place-items-center bg-surface text-sm text-slate-400">
        Verificando la sesión…
      </p>
    ) : null;
  }

  const items = nav.filter((item) => puedeAbrirRuta(user, item.href));
  const planForUser =
    plan?.lavaderoId === user.lavaderoId ? plan : null;
  const visiblePlanError =
    user.lavaderoId === undefined
      ? "No se pudo identificar el establecimiento de esta cuenta."
      : planError;

  return (
    <div className="flex min-h-screen bg-surface">
      {menuAbierto && (
        <div
          className="fixed inset-0 z-30 bg-navy/40 md:hidden"
          aria-hidden="true"
          onClick={() => setMenuAbierto(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen w-[232px] shrink-0 flex-col bg-navy px-4 py-5 text-white transition-transform md:sticky md:top-0 md:translate-x-0 ${
          menuAbierto ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Menú principal"
      >
        <Logo light />
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {items.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            // Permitir acceso total si el usuario es Administrador de LavApp
            const isAdmin = user.rolSistema === "ADMIN_LAVAPP";
            const hasFeature = isAdmin ||
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
                onClick={() => setMenuAbierto(false)}
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
        <header className="flex items-center justify-between gap-3 px-4 py-4 md:gap-4 md:px-6">
          <button
            type="button"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-navy shadow-sm md:hidden"
            aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuAbierto}
            onClick={() => setMenuAbierto((abierto) => !abierto)}
          >
            <Menu className="h-4 w-4" />
          </button>
          <p className="hidden text-xs capitalize text-slate-400 lg:block">
            {todayLabel()} · {now}
          </p>
          <form
            className="hidden max-w-lg flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-400 sm:flex"
            onSubmit={irABusqueda}
          >
            <Search className="h-4 w-4" />
            <input
              className="w-full bg-transparent text-navy outline-none"
              aria-label="Buscar cliente, vehículo o patente"
              placeholder="Buscar cliente, vehículo o patente..."
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
            />
          </form>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              aria-label={hayDemoras ? "Hay demoras en la cola" : "Sin demoras"}
              className="relative grid h-10 w-10 place-items-center rounded-full bg-white text-navy shadow-sm"
            >
              <Bell className="h-4 w-4" />
              {hayDemoras && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-orange-500" />
              )}
            </Link>
            <div className="flex items-center gap-2 rounded-full bg-white py-1.5 pr-3 pl-1.5 shadow-sm">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#6C5CE7] text-xs font-bold text-white">
                {user.nombre
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </span>
              <div className="hidden leading-tight sm:block">
                <p className="text-xs font-semibold text-navy">{user.nombre}</p>
                <p className="text-[10px] text-slate-400">
                  {user.rolSistema
                    ? ETIQUETA_ROL[user.rolSistema]
                    : user.rol === "DUENO" ? "Dueño" : "Operador"}
                </p>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 pb-8 md:px-6">{children}</main>
      </div>

      {toast && (
        <div className="fixed right-6 bottom-6 z-50 max-w-sm rounded-2xl bg-navy px-4 py-3 text-sm text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
