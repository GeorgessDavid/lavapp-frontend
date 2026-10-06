import type { Atencion, Box } from "./types";

export function tienePuestoAsignado(
  atencion: Pick<Atencion, "id" | "boxId">,
  boxes: Box[],
) {
  return boxes.some(
    (box) =>
      box.id === atencion.boxId &&
      box.estado === "OCUPADO" &&
      box.atencionId === atencion.id,
  );
}
