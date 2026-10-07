"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { useApp } from "@/lib/store";
import { apiConfig, homeForRole } from "@/lib/api";

const demos = [
  { email: "operador@lavapp.com", password: "operador", rol: "Operador" },
  { email: "dueno@lavapp.com", password: "dueno", rol: "Dueño" },
  { email: "flota@lavapp.com", password: "flota", rol: "Flota" },
];

export default function LoginPage() {
  const { login } = useApp();
  const router = useRouter();
  const [email, setEmail] = useState(apiConfig.USE_MOCK ? demos[0].email : "");
  const [password, setPassword] = useState(
    apiConfig.USE_MOCK ? demos[0].password : "",
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      router.push(homeForRole(user.rol));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-navy p-12 text-white lg:flex lg:flex-col">
        <Logo light />
        <div className="relative z-10 my-auto max-w-md">
          <p className="text-sm font-semibold tracking-[0.2em] text-cyan-300 uppercase">
            Cola inteligente
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight">
            Organizá el playón, los tiempos y al cliente en un solo flujo.
          </h1>
          <p className="mt-4 text-white/70">
            Reservas + walk-in, etapas del lavado, aviso por WhatsApp y métricas
            para el dueño. Pensado para lavaderos chicos y medianos.
          </p>
        </div>
        <div className="absolute -right-16 -bottom-16 h-72 w-72 rounded-full bg-[#6C5CE7]/40 blur-3xl" />
        <div className="absolute top-24 right-20 h-40 w-40 rounded-full bg-cyan-400/30 blur-3xl" />
      </section>

      <section className="flex items-center justify-center p-8">
        <form onSubmit={onSubmit} className="card w-full max-w-md p-8">
          <div className="mb-6 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-2xl font-bold">Ingresar a LavApp</h2>
          <p className="mt-1 text-sm text-slate-500">
            {apiConfig.USE_MOCK
              ? "Modo demo: usá una cuenta de demostración."
              : "Ingresá con tu email y contraseña."}
          </p>

          <label className="mt-6 mb-1 block text-xs font-semibold text-slate-500">
            Email
          </label>
          <input
            className="field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />
          <label className="mt-4 mb-1 block text-xs font-semibold text-slate-500">
            Contraseña
          </label>
          <input
            className="field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />

          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}

          <button className="btn-primary mt-6 w-full" disabled={loading}>
            {loading ? "Ingresando..." : "Entrar"}
          </button>

          {apiConfig.USE_MOCK && (
          <div className="mt-6 space-y-2">
            <p className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              Accesos demo
            </p>
            {demos.map((d) => (
              <button
                type="button"
                key={d.email}
                onClick={() => {
                  setEmail(d.email);
                  setPassword(d.password);
                }}
                className="flex w-full items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <span className="font-medium text-navy">{d.rol}</span>
                <span className="text-xs text-slate-400">{d.email}</span>
              </button>
            ))}
          </div>
          )}
        </form>
      </section>
    </div>
  );
}
