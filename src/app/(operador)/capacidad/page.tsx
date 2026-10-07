import { CapacidadResumen } from "@/components/capacity/CapacidadResumen";

export default function CapacidadPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Capacidad del playón</h1>
        <p className="text-sm text-slate-500">
          Consultá la ocupación actual y configurá cuántos vehículos puede recibir el lavadero.
        </p>
      </header>
      <CapacidadResumen />
    </div>
  );
}
