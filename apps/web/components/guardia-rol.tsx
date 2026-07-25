"use client";

import type { Rol } from "@forja/shared";
import { Skeleton } from "@forja/ui";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { rutaInicioPorRol, usarSesion } from "../lib/usar-sesion";

export interface PropiedadesGuardiaRol {
  readonly rol: Rol;
  readonly children: ReactNode;
}

/**
 * Protege una sección por rol (spec 02-interfaz: "operador entra... no ve
 * navegación de admin"). Sin sesión → /iniciar-sesion. Con sesión pero rol
 * distinto → la sección de aterrizaje de su propio rol, nunca la ajena.
 */
export function GuardiaRol({ rol, children }: PropiedadesGuardiaRol) {
  const router = useRouter();
  const { data: sesion, isLoading } = usarSesion();

  useEffect(() => {
    if (isLoading) return;
    if (!sesion) {
      router.replace("/iniciar-sesion");
      return;
    }
    if (sesion.rol !== rol) {
      router.replace(rutaInicioPorRol(sesion.rol));
    }
  }, [isLoading, sesion, rol, router]);

  if (isLoading || !sesion || sesion.rol !== rol) {
    return (
      <div style={{ padding: 24 }}>
        <Skeleton ancho="200px" alto="24px" />
      </div>
    );
  }

  return <>{children}</>;
}
