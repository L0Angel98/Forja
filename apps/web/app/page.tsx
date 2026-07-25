"use client";

import { Skeleton } from "@forja/ui";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { rutaInicioPorRol, usarSesion } from "../lib/usar-sesion";

export default function InicioPage() {
  const router = useRouter();
  const { data: sesion, isLoading } = usarSesion();

  useEffect(() => {
    if (isLoading) return;
    if (!sesion) {
      router.replace("/iniciar-sesion");
      return;
    }
    router.replace(rutaInicioPorRol(sesion.rol));
  }, [isLoading, sesion, router]);

  return (
    <main style={{ padding: 24 }}>
      <Skeleton ancho="200px" alto="24px" />
    </main>
  );
}
