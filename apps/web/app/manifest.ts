import type { MetadataRoute } from "next";

/**
 * Next.js sirve esto en /manifest.webmanifest automáticamente (spec
 * 02-interfaz: "Instalable, ícono y splash propios, display: standalone").
 * No hay assets de marca todavía, así que el ícono es un monograma "F"
 * simple en SVG — un diseñador debería reemplazarlo por el ícono real.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Forja",
    short_name: "Forja",
    description: "Copiloto de IA para piso de planta en manufactura",
    start_url: "/",
    display: "standalone",
    background_color: "#14181D",
    theme_color: "#14181D",
    lang: "es-MX",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
