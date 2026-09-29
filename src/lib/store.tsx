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
import { loginRequest } from "./api";

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
  logout: () => void;
  checkIn: (payload: {
    patente: string;
    clienteNombre: string;
    telefono: string;
    marca: string;
    modelo: string;
    servicioId: string;
    observaciones?: string;
  }) => Atencion;
  avanzar: (atencionId: string) => void;
  asignarBox: (atencionId: string, boxId: string) => void;
  retirar: (atencionId: string) => void;
  crearReserva: (payload: Omit<Reserva, "id" | "estado">) => void;
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
    setUser(loadUser());
    setHydrated(true);
  }, []);

  const value = useMemo(() => {
    const login = async (email: string, password: string) => {
      const res = await loginRequest(email, password);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(res.user));
      localStorage.setItem("lavapp_token", res.token);
      setUser(res.user);
      return res.user;
    };

    const logout = () => {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem("lavapp_token");
      setUser(null);
    };

    const checkIn: AppActions["checkIn"] = (payload) => {
      let cliente = clientes.find(
        (c) =>
          `${c.nombre} ${c.apellido}`.toLowerCase() ===
          payload.clienteNombre.toLowerCase(),
      );
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

      let vehiculo = vehiculos.find(
        (v) =>
          v.patente.replace(/\s/g, "").toUpperCase() ===
          payload.patente.replace(/\s/g, "").toUpperCase(),
      );
      if (!vehiculo) {
        vehiculo = {
          id: `v${Date.now()}`,
          patente: payload.patente.toUpperCase(),
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
            ? { ...a, boxId, estado: a.estado === "EN_ESPERA" ? "LAVADO" : a.estado }
            : a,
        ),
      );
    };

    const retirar = (atencionId: string) => {
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
      asignarBox,
      retirar,
      crearReserva,
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

