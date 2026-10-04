"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Check,
  CircleHelp,
  LockKeyhole,
  Sparkles,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { apiConfig, fetchPlanActual, simulatePlanChange } from "@/lib/api";
import { money } from "@/lib/format";
import { funcionalidadesSeparadas, planes } from "@/lib/plans";
import type { PlanActual } from "@/lib/types";

export default function MiPlanPage() {
  const { user } = useApp();
  const router = useRouter();
  const [planActual, setPlanActual] = useState<PlanActual | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [planParaCambiar, setPlanParaCambiar] =
    useState<(typeof planes)[number] | null>(null);
  const [cambiandoPlan, setCambiandoPlan] = useState(false);
  const [mensajeCambio, setMensajeCambio] = useState("");

  const cargarPlan = useCallback(async () => {
    if (!user || user.lavaderoId === undefined) {
      setPlanActual(null);
      setError("La cuenta no tiene un establecimiento asociado para consultar el plan.");
      setCargando(false);
      return;
    }
    setCargando(true);
    setError("");
    try {
      setPlanActual(await fetchPlanActual(user.lavaderoId));
    } catch (cause) {
      setPlanActual(null);
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo consultar el plan del establecimiento.",
      );
    } finally {
      setCargando(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (user.rol !== "DUENO") {
      router.replace("/dashboard");
      return;
    }
    if (user.lavaderoId === undefined) return;

    let cancelled = false;
    fetchPlanActual(user.lavaderoId)
      .then((currentPlan) => {
        if (!cancelled) setPlanActual(currentPlan);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : "No se pudo consultar el plan del establecimiento.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setCargando(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, router]);

  useEffect(() => {
    window.addEventListener("focus", cargarPlan);
    return () => window.removeEventListener("focus", cargarPlan);
  }, [cargarPlan]);

  if (!user || user.rol !== "DUENO") return null;

  const activePlan = planes.find((plan) => plan.nombre === planActual?.nombre);
  const errorVisible =
    error ||
    (user.lavaderoId === undefined
      ? "La cuenta no tiene un establecimiento asociado para consultar el plan."
      : "");

  async function confirmarCambioPlan() {
    if (!planParaCambiar || !planActual) return;
    setCambiandoPlan(true);
    setMensajeCambio("");
    try {
      const actualizado = await simulatePlanChange(
        planActual.lavaderoId,
        planParaCambiar.nombre,
      );
      setPlanActual(actualizado);
      setPlanParaCambiar(null);
      setMensajeCambio(
        `Cambio simulado: ahora está seleccionado el plan ${actualizado.nombre}. No se realizó ningún cobro.`,
      );
    } catch (cause) {
      setMensajeCambio(
        cause instanceof Error
          ? cause.message
          : "No se pudo cambiar el plan.",
      );
    } finally {
      setCambiandoPlan(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold tracking-[0.18em] text-brand uppercase">
          Suscripción del establecimiento
        </p>
        <h1 className="mt-2 text-2xl font-bold">Mi Plan</h1>
        <p className="mt-1 text-sm text-slate-500">
          Consultá tu suscripción y compará las opciones disponibles para LavApp.
        </p>
      </header>

      {cargando && user.lavaderoId !== undefined && (
        <div role="status" className="card p-6 text-sm text-slate-500">
          Consultando el plan activo...
        </div>
      )}

      {errorVisible && (!cargando || user.lavaderoId === undefined) && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          <p className="font-semibold">No se pudo cargar el plan</p>
          <p className="mt-1">{errorVisible}</p>
          <button className="btn-ghost mt-4" onClick={() => void cargarPlan()}>
            Reintentar
          </button>
        </div>
      )}

      {mensajeCambio && (
        <p
          role="status"
          className={`rounded-xl px-4 py-3 text-sm ${
            mensajeCambio.startsWith("Cambio simulado")
              ? "bg-emerald-50 text-emerald-800"
              : "bg-amber-50 text-amber-900"
          }`}
        >
          {mensajeCambio}
        </p>
      )}

      {planActual && activePlan && !cargando && (
        <>
          <section className="card overflow-hidden">
            <div className="flex flex-col gap-6 bg-gradient-to-r from-navy to-[#263f75] p-6 text-white sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <BadgeCheck className="h-4 w-4 text-teal" />
                  Plan activo
                </div>
                <h2 className="mt-2 text-3xl font-bold">{planActual.nombre}</h2>
                <p className="mt-1 max-w-xl text-sm text-white/70">{activePlan.descripcion}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-3xl font-bold">{money(planActual.precioMensual)}</p>
                <p className="text-sm text-white/70">por mes · suscripción fija</p>
              </div>
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Usuarios</p>
                <p className="mt-1 font-semibold">Hasta {activePlan.usuarios} usuarios</p>
                <p className="text-xs text-slate-500">Un establecimiento</p>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Volumen orientativo</p>
                <p className="mt-1 font-semibold">Hasta {planActual.volumenLavadosReferenciaMensual} lavados por mes</p>
                <p className="text-xs text-slate-500">Referencia, no límite de uso</p>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Facturación</p>
                <p className="mt-1 font-semibold">Importe mensual fijo</p>
                <p className="text-xs text-slate-500">Sin cargo adicional por lavado</p>
              </div>
            </div>
            <div className="border-t border-slate-100 px-6 py-4">
              <p className="mb-3 text-sm font-semibold">Funcionalidades habilitadas por el backend</p>
              <div className="flex flex-wrap gap-2">
                {planActual.funcionalidades.map((feature) => (
                  <span key={feature} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
                    {feature.replaceAll("_", " ").toLowerCase()}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section>
            <div className="mb-4">
              <h2 className="text-lg font-bold">Compará los planes</h2>
              <p className="text-sm text-slate-500">
                Los precios y prestaciones se presentan por nivel; el plan contratado se consulta al backend.
              </p>
            </div>
            <div className="grid gap-4 xl:grid-cols-3">
              {planes.map((plan) => {
                const isCurrent = plan.nombre === planActual.nombre;
                const price = isCurrent
                  ? planActual.precioMensual
                  : plan.precioMensual;
                return (
                  <article
                    key={plan.nombre}
                    aria-label={`Plan ${plan.nombre}${isCurrent ? ", plan actual" : ""}`}
                    className={`rounded-2xl border bg-white p-5 shadow-sm ${
                      isCurrent
                        ? "border-brand ring-2 ring-brand/15"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-xl font-bold">{plan.nombre}</h3>
                        <p className="mt-1 min-h-10 text-xs text-slate-500">{plan.descripcion}</p>
                      </div>
                      {isCurrent ? (
                        <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-bold text-brand">
                          Contratado
                        </span>
                      ) : plan.nombre === "Empresa" ? (
                        <Sparkles className="h-5 w-5 text-brand" />
                      ) : null}
                    </div>
                    <p className="mt-4 text-2xl font-bold">{money(price)}</p>
                    <p className="text-xs text-slate-500">ARS · precio mensual fijo</p>
                    <div className="my-4 space-y-2 border-y border-slate-100 py-4 text-sm">
                      <p><span className="font-semibold">Usuarios:</span> hasta {plan.usuarios}</p>
                      <p><span className="font-semibold">Establecimientos:</span> {plan.nombre === "Empresa" ? "1 (multi-sucursal como add-on)" : "1"}</p>
                      <p><span className="font-semibold">Volumen de referencia:</span> {plan.volumenReferencia} lavados/mes</p>
                    </div>
                    <ul className="space-y-2.5">
                      {plan.funcionalidades.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm text-slate-600">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-5 border-t border-slate-100 pt-4">
                      {isCurrent ? (
                        <button
                          type="button"
                          disabled
                          className="w-full cursor-default rounded-full bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800"
                        >
                          <span className="inline-flex items-center justify-center gap-2">
                            <BadgeCheck className="h-4 w-4" />
                            Plan contratado
                          </span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={!apiConfig.USE_MOCK || cambiandoPlan}
                            onClick={() => {
                              setMensajeCambio("");
                              setPlanParaCambiar(plan);
                            }}
                            title={
                              apiConfig.USE_MOCK
                                ? "Simular cambio de plan sin cobro"
                                : "Requiere catálogo de planes y autorización del backend"
                            }
                            className="btn-primary w-full disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 disabled:shadow-none"
                          >
                            {apiConfig.USE_MOCK
                              ? `Cambiar a ${plan.nombre}`
                              : "Cambio no disponible"}
                          </button>
                          {!apiConfig.USE_MOCK && (
                            <p className="mt-2 text-xs text-slate-500">
                              El cambio real se habilitará al integrar el catálogo y la autorización del backend.
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-sky-100 bg-sky-50 p-5">
              <div className="flex items-start gap-3">
                <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" />
                <div>
                  <h2 className="font-semibold text-sky-950">Volúmenes orientativos</h2>
                  <p className="mt-1 text-sm leading-6 text-sky-900">
                    Los valores de 250, 500 y 900 lavados mensuales son referencias. Superarlos no bloquea el servicio, no cambia el plan automáticamente y no genera cargos por lavado.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5">
              <div className="flex items-start gap-3">
                <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-violet-700" />
                <div>
                  <h2 className="font-semibold text-violet-950">Add-ons opcionales</h2>
                  <p className="mt-1 text-sm text-violet-900">
                    Se contratan aparte y no forman parte del plan principal:
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {funcionalidadesSeparadas.map((feature) => (
                      <li key={feature} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-violet-900">
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-violet-800">
                    La disponibilidad y el precio de cada add-on se gestionan por separado.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {planParaCambiar && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-navy/50 p-4"
          role="presentation"
        >
          <section
            aria-labelledby="confirmar-cambio-titulo"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            role="dialog"
          >
            <h2 id="confirmar-cambio-titulo" className="text-xl font-bold">
              Simular cambio al plan {planParaCambiar.nombre}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              El plan seleccionado pasará a mostrarse como activo en esta demo.
              Esta acción no contacta al backend ni realiza ningún cobro.
            </p>
            <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm">
              Nuevo precio mensual de referencia:{" "}
              <strong>{money(planParaCambiar.precioMensual)}</strong>
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn-ghost"
                disabled={cambiandoPlan}
                onClick={() => setPlanParaCambiar(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={cambiandoPlan}
                onClick={() => void confirmarCambioPlan()}
              >
                {cambiandoPlan ? "Actualizando demo..." : "Confirmar cambio (sin cobro)"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
