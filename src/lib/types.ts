export type Role = "DUENO" | "OPERADOR" | "FLOTA";

export type ServiceStage =
  | "EN_ESPERA"
  | "LAVADO"
  | "INTERIOR"
  | "TERMINACIONES"
  | "LISTO"
  | "RETIRADO";

export type ReservationStatus =
  | "PENDIENTE"
  | "MODIFICADA"
  | "CONFIRMADA"
  | "EN_CURSO"
  | "CANCELADA"
  | "COMPLETADA"
  | "LISTA_ESPERA";

export type BoxStatus = "DISPONIBLE" | "OCUPADO" | "PAUSADO";

export type NotificationType =
  | "CONFIRMACION"
  | "DEMORA"
  | "LISTO"
  | "PROMOCION";

export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: Role;
  lavaderoId?: number;
}

export interface CapacidadActual {
  lavaderoId: number;
  capacidadMaxima: number;
  lugaresOcupados: number;
  lugaresDisponibles: number;
  sobreCapacidad: boolean;
}

export type PlanFeature =
  | "RESERVAS"
  | "INGRESOS"
  | "COLA"
  | "CAPACIDAD"
  | "PUESTOS"
  | "ESTADOS"
  | "TIEMPOS"
  | "DEMORAS"
  | "AVISOS"
  | "HISTORIAL_BASICO"
  | "REPORTES_AVANZADOS"
  | "HISTORIAL_COMPLETO"
  | "EXPORTACION_DATOS"
  | "ROLES_PERMISOS"
  | "CONFIGURACION_AVANZADA"
  | "SOPORTE_PRIORITARIO"
  | "INTEGRACIONES";

export interface PlanActual {
  lavaderoId: number;
  planId: number;
  nombre: "Básico" | "Pro" | "Empresa";
  precioMensual: number;
  moneda: string;
  periodicidad: "MENSUAL" | "ANUAL";
  funcionalidades: PlanFeature[];
  volumenLavadosReferenciaMensual: number;
  aclaracionVolumen: string;
}

export interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  fechaRegistro: string;
  fechaUltimaVisita: string;
  frecuente: boolean;
  inactivo: boolean;
}

export interface Vehiculo {
  id: string;
  patente: string;
  marca: string;
  modelo: string;
  tipo: "Auto" | "SUV" | "Pickup" | "Camioneta";
  clienteId: string;
  color: string;
}

export interface Servicio {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  duracionMin: number;
}

export interface Box {
  id: string;
  nombre: string;
  numero: number;
  estado: BoxStatus;
  atencionId?: string;
}

export interface Atencion {
  id: string;
  vehiculoId: string;
  clienteId: string;
  servicioIds: string[];
  boxId?: string;
  fechaIngreso: string;
  horaEstimadaInicio: string;
  horaEstimadaFin: string;
  duracionRealMin?: number;
  estado: ServiceStage;
  demoraMin: number;
  origen: "WALK_IN" | "RESERVA";
  observaciones?: string;
  tokenSeguimiento: string;
  fotos: { tipo: "ANTES" | "DESPUES"; url: string }[];
}

export type QueueOrigin = "RESERVA" | "ESPONTANEO";

export interface OrdenColaApi {
  ordenId: number;
  estado: "EN_ESPERA";
  ingreso: string;
  patente: string;
  modelo: string;
  clienteNombre: string;
  clienteTelefono: string;
  servicioNombre: string;
  servicioPrecio: number;
  empleadoNombre: string | null;
  tipoIngreso: QueueOrigin;
  horarioReserva: string | null;
  servicioDuracionMin: number;
}

export interface Reserva {
  id: string;
  clienteId: string;
  vehiculoId: string;
  servicioId: string;
  fecha: string;
  horario: string;
  estado: ReservationStatus;
}

export interface Abono {
  id: string;
  clienteId: string;
  vehiculoId: string;
  tipo: string;
  disponibles: number;
  utilizados: number;
  inicio: string;
  vencimiento: string;
}

export interface Promocion {
  id: string;
  titulo: string;
  descripcion: string;
  vigencia: string;
  activa: boolean;
}

export interface EmpresaFlota {
  id: string;
  nombre: string;
  estado: "Activa" | "Pausada";
  vehiculoIds: string[];
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface DashboardKpis {
  enEspera: number;
  enProceso: number;
  listosHoy: number;
  boxesOcupados: number;
  boxesTotales: number;
}

export interface Reportes {
  vehiculosAtendidos: number;
  tiempoPromedioMin: number;
  serviciosReagendados: number;
  ocupacionPromedio: number;
  vehiculosPorDia: { dia: string; cantidad: number }[];
  reservasVsEspontaneos: { reservas: number; espontaneos: number };
  tiempoPorSemana: { dia: string; minutos: number }[];
  serviciosMasSolicitados: {
    servicio: string;
    cantidad: number;
    porcentaje: number;
    ingreso: number;
  }[];
  insights: { tipo: "ok" | "warn" | "info"; texto: string }[];
}
