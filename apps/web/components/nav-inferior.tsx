"use client";

import { useI18n, type ContextoI18n } from "@forja/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import estilos from "./nav-inferior.module.css";

interface DestinoNavInferior {
  readonly href: string;
  readonly claveEtiqueta: Parameters<ContextoI18n["t"]>[0];
}

/** Máximo 3 destinos (spec 02-interfaz: "navegación inferior (3 destinos máximo)"). */
const DESTINOS: readonly DestinoNavInferior[] = [
  { href: "/chat", claveEtiqueta: "nav.chat" },
  { href: "/reportar", claveEtiqueta: "nav.reportar" },
  { href: "/mis-reportes", claveEtiqueta: "nav.misReportes" },
];

export function NavInferior() {
  const { t } = useI18n();
  const ruta = usePathname();

  return (
    <nav className={estilos.nav} aria-label={t("nav.navegacionPrincipal")}>
      {DESTINOS.map((destino) => (
        <Link
          key={destino.href}
          href={destino.href}
          className={estilos.destino}
          aria-current={ruta === destino.href ? "page" : undefined}
        >
          {t(destino.claveEtiqueta)}
        </Link>
      ))}
    </nav>
  );
}
