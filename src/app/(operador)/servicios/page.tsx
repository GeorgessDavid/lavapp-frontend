import { DuracionServicios } from "@/components/servicios/DuracionServicios";

export default function ServiciosPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Servicios</h1>
        <p className="text-sm text-slate-500">
          Configurá cuánto dura cada servicio. Con esa duración se calculan la espera y el horario
          estimado que ven la cola y el cliente en su seguimiento.
        </p>
      </header>
      <DuracionServicios />
    </div>
  );
}
