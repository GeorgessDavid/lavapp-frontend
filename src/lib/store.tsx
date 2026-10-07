"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  Abono,
  Atencion,
  Box,
  Cliente,
  EmpresaFlota,
  Promocion,
  Reserva,
  Servicio,
  User,
  Vehiculo,
} from "./types";
import {
  abonos as seedAbonos,
  atenciones as seedAtenciones,
  boxes as seedBoxes,
  clientes as seedClientes,
  flotas as seedFlotas,
  promociones as seedPromos,
  reservas as seedReservas,
  servicios as seedServicios,
  vehiculos as seedVehiculos,
  NEXT_STAGE,
} from "./mock-data";
import {
  apiConfig,
  fetchMe,
  loginRequest,
  logoutRequest,
  setOnUnauthorized,
} from "./api";
import { tienePuestoAsignado } from "./box-assignment";
import { estaEnLavado } from "./etapas";

const STORAGE_KEY = "lavapp_session";

interface AppState {
  user: User | null;
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  servicios: Servicio[];
  boxes: Box[];
  atenciones: Atencion[];
  reservas: Reserva[];
  abonos: Abono[];
  promociones: Promocion[];
  flotas: EmpresaFlota[];
  toast: string | null;
}

interface AppActions {
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  checkIn: (payload: {
    patente: string;
    clienteId?: string;
    vehiculoId?: string;
    clienteNombre: string;
    telefono: string;
    marca: string;
    modelo: string;
    servicioId: string;
    observaciones?: string;
  }) => Atencion;
  avanzar: (atencionId: string) => void;
  iniciarLavado: (atencionId: string) => boolean;
  asignarBox: (atencionId: string, boxId: string) => void;
  retirar: (atencionId: string) => void;
  finalizarServicio: (atencionId: string) => void;
  crearReserva: (payload: Omit<Reserva, "id" | "estado">) => void;
  notificar: (mensaje: string) => void;
  clearToast: () => void;
}

const AppContext = createContext<(AppState & AppActions) | null>(null);

function loadUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [clientes, setClientes] = useState(seedClientes);
  const [vehiculos, setVehiculos] = useState(seedVehiculos);
  const [boxes, setBoxes] = useState(seedBoxes);
  const [atenciones, setAtenciones] = useState(seedAtenciones);
  const [reservas, setReservas] = useState(seedReservas);
  const [toast, setToast] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      // Resto de la versión con token: ya no se usa.
      localStorage.removeItem("lavapp_token");
      // Se muestra enseguida el usuario cacheado para no parpadear al login...
      setUser(loadUser());
      setHydrated(true);
      if (apiConfig.USE_MOCK) return;
      // ...y se confirma la sesión con el backend (cookie LAVAPP_SESSION).
      fetchMe()
        .then((actual) => {
          if (cancelled) return;
          if (actual) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(actual));
            setUser(actual);
          } else {
            localStorage.removeItem(STORAGE_KEY);
            setUser(null);
          }
        })
        .catch(() => {
          // Backend caído o sin red: se conserva el cache; las pantallas mostrarán sus errores.
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    // Cualquier 401 fuera del login (sesión expirada, usuario desactivado) cierra la sesión local.
    setOnUnauthorized(() => {
      localStorage.removeItem(STORAGE_KEY);
      setUser(null);
    });
    return () => setOnUnauthorized(null);
  }, []);

  const value = useMemo(() => {
    const login = async (email: string, password: string) => {
      const usuario = await loginRequest(email, password);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(usuario));
      setUser(usuario);
      return usuario;
    };

    const logout = async () => {
      // Primero se cierra la sesión local (la UI redirige al login) y después la del backend.
      localStorage.removeItem(STORAGE_KEY);
      setUser(null);
      try {
        await logoutRequest();
      } catch {
        // Si el backend no responde, la cookie expira sola; la sesión local ya está cerrada.
      }
    };

    const checkIn: AppActions["checkIn"] = (payload) => {
      let vehiculo = payload.vehiculoId
        ? vehiculos.find((v) => v.id === payload.vehiculoId)
        : vehiculos.find(
            (v) =>
              v.patente.replace(/\s/g, "").toUpperCase() ===
              payload.patente.replace(/\s/g, "").toUpperCase(),
          );
      if (payload.vehiculoId && !vehiculo) {
        throw new Error("El vehículo seleccionado ya no está disponible.");
      }

      let cliente = payload.clienteId
        ? clientes.find((c) => c.id === payload.clienteId)
        : vehiculo
          ? clientes.find((c) => c.id === vehiculo!.clienteId)
          : clientes.find(
              (c) =>
                `${c.nombre} ${c.apellido}`.toLowerCase() ===
                payload.clienteNombre.toLowerCase(),
            );
      if (payload.clienteId && !cliente) {
        throw new Error("El cliente seleccionado ya no está disponible.");
      }
      if (vehiculo && cliente?.id !== vehiculo.clienteId) {
        throw new Error("El vehículo no pertenece al cliente seleccionado.");
      }

      if (!cliente) {
        const [nombre, ...rest] = payload.clienteNombre.split(" ");
        cliente = {
          id: `c${Date.now()}`,
          nombre: nombre || "Cliente",
          apellido: rest.join(" ") || "Nuevo",
          telefono: payload.telefono,
          email: "",
          fechaRegistro: new Date().toISOString().slice(0, 10),
          fechaUltimaVisita: new Date().toISOString().slice(0, 10),
          frecuente: false,
          inactivo: false,
        };
        setClientes((prev) => [...prev, cliente!]);
      }

      if (!vehiculo) {
        vehiculo = {
          id: `v${Date.now()}`,
          patente: payload.patente.trim().toUpperCase(),
          marca: payload.marca,
          modelo: payload.modelo,
          tipo: "Auto",
          clienteId: cliente.id,
          color: "#6C5CE7",
        };
        setVehiculos((prev) => [...prev, vehiculo!]);
      }

      const servicio = seedServicios.find((s) => s.id === payload.servicioId)!;
      const waiting = atenciones.filter((a) => a.estado === "EN_ESPERA").length;
      const start = new Date(Date.now() + waiting * 18 * 60000);
      const end = new Date(start.getTime() + servicio.duracionMin * 60000);
      const atencion: Atencion = {
        id: `a${Date.now()}`,
        vehiculoId: vehiculo.id,
        clienteId: cliente.id,
        servicioIds: [payload.servicioId],
        fechaIngreso: new Date().toISOString(),
        horaEstimadaInicio: start.toISOString(),
        horaEstimadaFin: end.toISOString(),
        estado: "EN_ESPERA",
        demoraMin: 0,
        origen: "WALK_IN",
        observaciones: payload.observaciones,
        tokenSeguimiento: payload.patente.replace(/\s/g, "").slice(0, 6),
        fotos: [],
      };
      setAtenciones((prev) => [atencion, ...prev]);
      setToast(
        `Vehículo ${vehiculo.patente} ingresado. Link de seguimiento: /seguimiento/${atencion.tokenSeguimiento}`,
      );
      return atencion;
    };

    const avanzar = (atencionId: string) => {
      const atencion = atenciones.find((item) => item.id === atencionId);
      if (atencion?.estado === "EN_ESPERA") {
        setToast("Asigná un puesto antes de iniciar el lavado.");
        return;
      }

      setAtenciones((prev) =>
        prev.map((a) => {
          if (a.id !== atencionId) return a;
          const next = NEXT_STAGE[a.estado];
          if (!next) return a;
          if (next === "LISTO") {
            setToast(
              `WhatsApp enviado: el vehículo está listo para retirar. /seguimiento/${a.tokenSeguimiento}`,
            );
          }
          return { ...a, estado: next, demoraMin: next === "LISTO" ? 0 : a.demoraMin };
        }),
      );
      setBoxes((prev) =>
        prev.map((b) => {
          const att = atenciones.find((a) => a.id === atencionId);
          if (b.atencionId !== atencionId) return b;
          const next = att ? NEXT_STAGE[att.estado] : undefined;
          if (next === "LISTO" || next === "RETIRADO") {
            return { ...b, estado: "DISPONIBLE", atencionId: undefined };
          }
          return b;
        }),
      );
    };

    const iniciarLavado: AppActions["iniciarLavado"] = (atencionId) => {
      const atencion = atenciones.find((item) => item.id === atencionId);
      if (!atencion || atencion.estado !== "EN_ESPERA") {
        setToast("El vehículo ya no está en espera.");
        return false;
      }
      if (!tienePuestoAsignado(atencion, boxes)) {
        setToast("Asigná un puesto ocupado por este vehículo antes de iniciar el lavado.");
        return false;
      }

      setAtenciones((prev) =>
        prev.map((item) =>
          item.id === atencionId ? { ...item, estado: "LAVADO" } : item,
        ),
      );
      return true;
    };

    const asignarBox = (atencionId: string, boxId: string) => {
      setBoxes((prev) =>
        prev.map((b) => {
          if (b.id === boxId) return { ...b, estado: "OCUPADO", atencionId };
          if (b.atencionId === atencionId) {
            return { ...b, estado: "DISPONIBLE", atencionId: undefined };
          }
          return b;
        }),
      );
      setAtenciones((prev) =>
        prev.map((a) =>
          a.id === atencionId
            ? { ...a, boxId }
            : a,
        ),
      );
    };

    const retirar = (atencionId: string) => {
      const atencion = atenciones.find((item) => item.id === atencionId);
      if (!atencion || atencion.estado !== "LISTO") {
        setToast("Solo se puede registrar el retiro cuando el vehículo está finalizado.");
        return;
      }

      setAtenciones((prev) =>
        prev.map((a) =>
          a.id === atencionId ? { ...a, estado: "RETIRADO" } : a,
        ),
      );
      setBoxes((prev) =>
        prev.map((b) =>
          b.atencionId === atencionId
            ? { ...b, estado: "DISPONIBLE", atencionId: undefined }
            : b,
        ),
      );
      setToast("Vehículo retirado. El puesto quedó libre.");
    };

    // HU-34: solo un vehículo en lavado puede finalizarse. Pasa a LISTO y libera el puesto, pero
    // sigue en la cola (y ocupando lugar) hasta que se confirma el retiro.
    const finalizarServicio = (atencionId: string) => {
      const atencion = atenciones.find((a) => a.id === atencionId);
      if (!atencion || !estaEnLavado(atencion.estado)) {
        setToast("Solo se puede finalizar un vehículo que está en lavado.");
        return;
      }
      setAtenciones((prev) =>
        prev.map((a) =>
          a.id === atencionId ? { ...a, estado: "LISTO", demoraMin: 0 } : a,
        ),
      );
      setBoxes((prev) =>
        prev.map((b) =>
          b.atencionId === atencionId
            ? { ...b, estado: "DISPONIBLE", atencionId: undefined }
            : b,
        ),
      );
      setToast(
        `Servicio finalizado. WhatsApp enviado: el vehículo está listo para retirar. /seguimiento/${atencion.tokenSeguimiento}`,
      );
    };

    const crearReserva: AppActions["crearReserva"] = (payload) => {
      setReservas((prev) => [
        {
          ...payload,
          id: `r${Date.now()}`,
          estado: "CONFIRMADA",
        },
        ...prev,
      ]);
      setToast("Reserva confirmada. Se enviará el recordatorio por WhatsApp.");
    };

    return {
      user,
      clientes,
      vehiculos,
      servicios: seedServicios,
      boxes,
      atenciones,
      reservas,
      abonos: seedAbonos,
      promociones: seedPromos,
      flotas: seedFlotas,
      toast,
      login,
      logout,
      checkIn,
      avanzar,
      iniciarLavado,
      asignarBox,
      retirar,
      finalizarServicio,
      crearReserva,
      notificar: setToast,
      clearToast: () => setToast(null),
    };
  }, [user, clientes, vehiculos, boxes, atenciones, reservas, toast]);

  if (!hydrated) return <div className="min-h-screen bg-[#F4F7FC]" />;

  return (
    <AppContext.Provider value={value}>{children}</AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp debe usarse dentro de AppProvider");
  return ctx;
}
