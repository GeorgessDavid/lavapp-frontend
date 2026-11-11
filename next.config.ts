import type { NextConfig } from "next";

// Con API_ORIGIN (ej. https://54-198-115-60.sslip.io), /api/* se reenvía al back-end. Así el
// navegador ve todo en el mismo sitio que el front y guarda la cookie de sesión LAVAPP_SESSION
// (SameSite=Lax); llamando al back-end directo desde otro dominio, el navegador la descarta.
// En ese caso NEXT_PUBLIC_API_URL tiene que ser /api. Sin API_ORIGIN (desarrollo local) no hay
// rewrite y el front usa NEXT_PUBLIC_API_URL tal cual (ej. http://localhost:8080).
const apiOrigin = process.env.API_ORIGIN?.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    if (!apiOrigin) return [];
    return [{ source: "/api/:path*", destination: `${apiOrigin}/:path*` }];
  },
};

export default nextConfig;
