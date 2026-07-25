"use client";

import { Boton, useI18n, type ContextoI18n } from "@forja/ui";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { solicitarApi } from "../lib/api";
import { usarInvalidarSesion } from "../lib/usar-sesion";
import estilos from "./nav-lateral.module.css";

export interface DestinoNavLateral {
  readonly href: string;
  readonly claveEtiqueta: Parameters<ContextoI18n["t"]>[0];
}

export interface PropiedadesNavLateral {
  readonly destinos: readonly DestinoNavLateral[];
}

/** Shell de escritorio (supervisor/admin): navegación lateral (spec 02-interfaz). */
export function NavLateral({ destinos }: PropiedadesNavLateral) {
  const { t } = useI18n();
  const ruta = usePathname();
  const router = useRouter();
  const invalidarSesion = usarInvalidarSesion();

  const mutacionCerrarSesion = useMutation({
    mutationFn: () => solicitarApi("/api/auth/logout", { method: "POST" }),
    onSuccess: () => {
      invalidarSesion();
      router.replace("/iniciar-sesion");
    },
  });

  return (
    <nav className={estilos.nav} aria-label={t("nav.navegacionPrincipal")}>
      <ul className={estilos.lista}>
        {destinos.map((destino) => (
          <li key={destino.href}>
            <Link href={destino.href} className={estilos.destino} aria-current={ruta === destino.href ? "page" : undefined}>
              {t(destino.claveEtiqueta)}
            </Link>
          </li>
        ))}
      </ul>
      <Boton
        variante="secundario"
        tamano="compacto"
        cargando={mutacionCerrarSesion.isPending}
        onClick={() => mutacionCerrarSesion.mutate()}
      >
        {t("auth.cerrarSesion")}
      </Boton>
    </nav>
  );
}
