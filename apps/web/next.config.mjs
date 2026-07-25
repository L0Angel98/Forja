import withSerwistInit from "@serwist/next";

const ORIGEN_API = process.env.FORJA_API_ORIGIN ?? "http://localhost:3000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // @forja/ui y @forja/shared se distribuyen como TS fuente (sin build propio,
  // igual que en el resto del monorepo), así que Next debe transpilarlos.
  transpilePackages: ["@forja/ui", "@forja/shared"],
  async rewrites() {
    // En dev, web y server corren en puertos distintos (server:3000, web:3100);
    // en producción, Caddy ya enruta /api/* al server en el mismo origen
    // (docker/Caddyfile), así que este rewrite es un no-op ahí.
    return [{ source: "/api/:ruta*", destination: `${ORIGEN_API}/api/:ruta*` }];
  },
};

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // Deshabilitado en dev: un service worker cacheando durante desarrollo
  // activo produce contenido obsoleto confuso; además @serwist/next no
  // soporta `next dev --turbopack` (nuestro dev script usa webpack).
  disable: process.env.NODE_ENV !== "production",
});

export default withSerwist(nextConfig);
