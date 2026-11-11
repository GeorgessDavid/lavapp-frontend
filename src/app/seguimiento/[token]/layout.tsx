import type { Metadata } from "next";
import type { ReactNode } from "react";

// HT-07: el código del seguimiento va en la URL y hace de credencial. La página no se indexa (un
// link pegado en algún lado no tiene que terminar en un buscador) y no manda la URL como Referer
// a otros sitios. Va en un layout porque la página es un componente de cliente.
export const metadata: Metadata = {
  title: "Seguimiento de tu vehículo · LavApp",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function SeguimientoLayout({ children }: { children: ReactNode }) {
  return children;
}
