import type { PlanFeature } from "./types";

export type PlanLevel = "Básico" | "Pro" | "Empresa";

export interface PlanDefinition {
  nombre: PlanLevel;
  precioMensual: number;
  usuarios: number;
  volumenReferencia: number;
  descripcion: string;
  funcionalidades: string[];
  permisos: PlanFeature[];
}

export const planes: PlanDefinition[] = [
  {
    nombre: "Básico",
    precioMensual: 95000,
    usuarios: 3,
    volumenReferencia: 250,
    descripcion: "Para lavaderos chicos con una operación simple.",
    funcionalidades: [
      "Reservas e ingresos",
      "Vehículos espontáneos",
      "Cola y capacidad",
      "Asignación de puestos",
      "Estados del vehículo",
      "Cálculo de tiempos y demoras",
      "Avisos por WhatsApp",
      "Historial básico",
    ],
    permisos: [
      "RESERVAS",
      "INGRESOS",
      "COLA",
      "CAPACIDAD",
      "PUESTOS",
      "ESTADOS",
      "TIEMPOS",
      "DEMORAS",
      "AVISOS",
      "HISTORIAL_BASICO",
    ],
  },
  {
    nombre: "Pro",
    precioMensual: 145000,
    usuarios: 6,
    volumenReferencia: 500,
    descripcion: "Para lavaderos con mayor movimiento y clientes recurrentes.",
    funcionalidades: [
      "Todo lo incluido en Básico",
      "Hasta 6 usuarios",
      "Reportes operativos",
      "Gestión de clientes recurrentes",
      "Promociones y fidelización",
      "Seguimiento ampliado de demoras",
      "Configuración de servicios y operación",
    ],
    permisos: [
      "RESERVAS",
      "INGRESOS",
      "COLA",
      "CAPACIDAD",
      "PUESTOS",
      "ESTADOS",
      "TIEMPOS",
      "DEMORAS",
      "AVISOS",
      "HISTORIAL_BASICO",
      "HISTORIAL_COMPLETO",
      "EXPORTACION_DATOS",
    ],
  },
  {
    nombre: "Empresa",
    precioMensual: 260000,
    usuarios: 10,
    volumenReferencia: 900,
    descripcion: "Para operaciones medianas con más complejidad operativa.",
    funcionalidades: [
      "Todo lo incluido en Pro",
      "Hasta 10 usuarios",
      "Roles y permisos avanzados",
      "Mayor capacidad operativa",
      "Configuración avanzada",
      "Soporte prioritario",
      "Integraciones con sistemas externos",
    ],
    permisos: [
      "RESERVAS",
      "INGRESOS",
      "COLA",
      "CAPACIDAD",
      "PUESTOS",
      "ESTADOS",
      "TIEMPOS",
      "DEMORAS",
      "AVISOS",
      "HISTORIAL_BASICO",
      "HISTORIAL_COMPLETO",
      "EXPORTACION_DATOS",
      "ROLES_PERMISOS",
      "CONFIGURACION_AVANZADA",
      "SOPORTE_PRIORITARIO",
      "INTEGRACIONES",
    ],
  },
];

export const funcionalidadesSeparadas = [
  "Flotas",
  "Reportes avanzados",
  "Automatizaciones",
  "Multi-sucursal",
];

