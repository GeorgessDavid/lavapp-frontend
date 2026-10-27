// Qué puede hacer y ver cada usuario en la interfaz. Replica las reglas del backend (SecurityConfig)
// para no mostrar pantallas ni botones que van a responder 403; el backend las vuelve a validar en
// cada pedido, así que esto ordena la interfaz pero no protege datos. Sin React ni fetch, para
// probarlo con el runner de Node.

import type { User } from "./types";

type Usuario = Pick<User, "rol" | "rolSistema"> | null | undefined;

/** Cambiar el plan del lavadero: dueño o administrador de LavApp. */
export function puedeGestionarPlan(usuario: Usuario): boolean {
  return usuario?.rolSistema === "DUENO_LAVADERO" || usuario?.rolSistema === "ADMIN_LAVAPP";
}

/** Reportes del negocio: los mismos que gestionan el plan. */
export function puedeVerReportes(usuario: Usuario): boolean {
  return puedeGestionarPlan(usuario);
}

/** Configurar la capacidad del playón y la duración de los servicios: además, el encargado. */
export function puedeConfigurarOperacion(usuario: Usuario): boolean {
  return puedeGestionarPlan(usuario) || usuario?.rolSistema === "ENCARGADO";
}

/** Pantallas del operador que exigen algo más que tener sesión. */
const PERMISO_POR_RUTA: Record<string, (usuario: Usuario) => boolean> = {
  "/plan": puedeGestionarPlan,
  "/reportes": puedeVerReportes,
  "/servicios": puedeConfigurarOperacion,
};

/** Si el usuario puede abrir esa ruta del operador. Las que no están listadas solo piden sesión. */
export function puedeAbrirRuta(usuario: Usuario, ruta: string): boolean {
  if (!usuario) return false;
  const permiso = PERMISO_POR_RUTA[ruta];
  return permiso ? permiso(usuario) : true;
}

/** La pantalla de inicio de cada perfil. */
export function inicioDe(usuario: Pick<User, "rol">): string {
  return usuario.rol === "FLOTA" ? "/flotas" : "/dashboard";
}

/**
 * A dónde ir después de iniciar sesión: la ruta que el usuario quería abrir (`?next=`) si es una
 * ruta interna que puede abrir; si no, su inicio. Solo se aceptan rutas relativas del propio sitio
 * ("/cola"), nunca otro origen ("//otro.sitio", "https://..."), para que el link del login no
 * sirva para mandar al usuario a una página ajena.
 */
export function destinoTrasLogin(usuario: Pick<User, "rol" | "rolSistema">, siguiente: string | null): string {
  const inicio = inicioDe(usuario);
  if (!siguiente || !siguiente.startsWith("/") || siguiente.startsWith("//") || siguiente.includes("\\")) {
    return inicio;
  }
  const ruta = siguiente.split(/[?#]/)[0];
  if (ruta === "/login" || ruta === "/") return inicio;
  // Las rutas del operador y la de flotas no se cruzan entre perfiles.
  if ((ruta === "/flotas") !== (usuario.rol === "FLOTA")) return inicio;
  return puedeAbrirRuta(usuario, ruta) ? siguiente : inicio;
}
