// Pruebas de los permisos de la interfaz (lib/permisos.ts): las mismas reglas que valida el backend
// en SecurityConfig, y la validación del `?next=` del login. Se corren con `pnpm test` (runner de Node).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  destinoTrasLogin,
  inicioDe,
  puedeAbrirRuta,
  puedeConfigurarOperacion,
  puedeGestionarPlan,
  puedeVerReportes,
} from "./permisos.ts";

const admin = { rol: "DUENO", rolSistema: "ADMIN_LAVAPP" };
const dueno = { rol: "DUENO", rolSistema: "DUENO_LAVADERO" };
const encargado = { rol: "OPERADOR", rolSistema: "ENCARGADO" };
const empleado = { rol: "OPERADOR", rolSistema: "EMPLEADO" };
const flota = { rol: "FLOTA" };

test("el plan y los reportes son del dueño y del administrador", () => {
  for (const usuario of [admin, dueno]) {
    assert.equal(puedeGestionarPlan(usuario), true);
    assert.equal(puedeVerReportes(usuario), true);
  }
  for (const usuario of [encargado, empleado, flota, null, undefined]) {
    assert.equal(puedeGestionarPlan(usuario), false);
    assert.equal(puedeVerReportes(usuario), false);
  }
});

test("capacidad y duración de servicios: además el encargado, pero no el empleado", () => {
  assert.equal(puedeConfigurarOperacion(admin), true);
  assert.equal(puedeConfigurarOperacion(dueno), true);
  assert.equal(puedeConfigurarOperacion(encargado), true);
  assert.equal(puedeConfigurarOperacion(empleado), false);
  assert.equal(puedeConfigurarOperacion(flota), false);
});

test("el perfil de la interfaz no alcanza: sin el rol del backend no hay permisos de dueño", () => {
  assert.equal(puedeGestionarPlan({ rol: "DUENO" }), false);
  assert.equal(puedeConfigurarOperacion({ rol: "OPERADOR" }), false);
});

test("las rutas con permiso piden ese permiso; el resto, solo sesión", () => {
  assert.equal(puedeAbrirRuta(empleado, "/cola"), true);
  assert.equal(puedeAbrirRuta(empleado, "/servicios"), false);
  assert.equal(puedeAbrirRuta(encargado, "/servicios"), true);
  assert.equal(puedeAbrirRuta(encargado, "/plan"), false);
  assert.equal(puedeAbrirRuta(dueno, "/reportes"), true);
  assert.equal(puedeAbrirRuta(null, "/cola"), false);
});

test("cada perfil tiene su inicio", () => {
  assert.equal(inicioDe(dueno), "/dashboard");
  assert.equal(inicioDe(empleado), "/dashboard");
  assert.equal(inicioDe(flota), "/flotas");
});

test("después del login vuelve a la ruta pedida si la puede abrir, con su query", () => {
  assert.equal(destinoTrasLogin(empleado, "/cola"), "/cola");
  assert.equal(destinoTrasLogin(dueno, "/historial?patente=AB123CD"), "/historial?patente=AB123CD");
  assert.equal(destinoTrasLogin(flota, "/flotas"), "/flotas");
});

test("sin ruta, o con una que no puede abrir, va a su inicio", () => {
  assert.equal(destinoTrasLogin(dueno, null), "/dashboard");
  assert.equal(destinoTrasLogin(empleado, "/plan"), "/dashboard");
  assert.equal(destinoTrasLogin(empleado, "/flotas"), "/dashboard");
  assert.equal(destinoTrasLogin(flota, "/cola"), "/flotas");
  assert.equal(destinoTrasLogin(dueno, "/login"), "/dashboard");
});

test("el ?next= nunca lleva a otro sitio", () => {
  for (const ajeno of [
    "https://sitio-malicioso.example/login",
    "//sitio-malicioso.example",
    "/\\sitio-malicioso.example",
    "javascript:alert(1)",
    "cola",
  ]) {
    assert.equal(destinoTrasLogin(dueno, ajeno), "/dashboard", ajeno);
  }
});
