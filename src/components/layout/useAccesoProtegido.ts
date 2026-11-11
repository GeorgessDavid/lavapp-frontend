"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { inicioDe, puedeAbrirRuta } from "@/lib/permisos";
import { useApp } from "@/lib/store";
import type { User } from "@/lib/types";

type Perfil = "operador" | "flota";

/**
 * Control de acceso de las pantallas con sesión. Devuelve el usuario solo cuando puede ver la
 * pantalla actual; mientras tanto devuelve null y la pantalla no muestra nada.
 *
 * - Mientras el backend confirma la sesión guardada, espera.
 * - Sin sesión, lleva al login recordando la ruta pedida (`?next=`) para volver después.
 * - Con otro perfil (operador en flotas o al revés) o sin permiso para la ruta, lleva a su inicio.
 *
 * Es una comodidad de la interfaz: los datos los protege el backend, que valida sesión, lavadero y
 * rol en cada pedido.
 */
export function useAccesoProtegido(perfil: Perfil): User | null {
  const { user, sesion } = useApp();
  const pathname = usePathname();
  const router = useRouter();

  const destino = destinoSiNoPuede(perfil, user, sesion === "lista", pathname);

  useEffect(() => {
    if (destino) router.replace(destino);
  }, [destino, router]);

  return sesion === "lista" && user && !destino ? user : null;
}

function destinoSiNoPuede(perfil: Perfil, user: User | null, lista: boolean, pathname: string): string | null {
  if (!lista) return null;
  if (!user) return `/login?next=${encodeURIComponent(pathname)}`;
  const esFlota = user.rol === "FLOTA";
  if ((perfil === "flota") !== esFlota) return inicioDe(user);
  if (perfil === "operador" && !puedeAbrirRuta(user, pathname)) return inicioDe(user);
  return null;
}
